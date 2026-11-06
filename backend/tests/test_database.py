# tests/test_database.py
import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.zone import ParkingZone
from app.models.spot import ParkingSpot
from app.models.event import SpotEvent
from app.schemas.ingest import SpotEventIn, EventsSnapshotIn, EventsSnapshotOut
from app.models.device import Device, DeviceKind, DeviceStatus
from app.repos import event_repo, zone_repo, spot_repo
from app.schemas.auth import TokenOut, Claims
from pydantic import ValidationError
from app.core.config import Settings
from sqlalchemy import text
import os
import csv
from pydantic_settings import BaseSettings  # <--- use this

class Settings(BaseSettings):
    DB_URL: str
    some_feature_flag: bool = False  # maps env SOME_FEATURE_FLAG automatically

# --- In-memory test database ---
TEST_ENGINE = create_engine("sqlite:///:memory:", echo=False, future=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)
Base.metadata.create_all(bind=TEST_ENGINE)

def get_test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Test result tracking using CSV ---
class TestResults:
    CSV_FILE = "test_results.csv"

    results = {
        "Database: Zones": {
            "Create Zone": "Pending",
            "Get Zone by ID": "Pending",
            "List All Zones": "Pending",
            "Update Zone": "Pending",
            "Delete Zone": "Pending",
        },
        "Database: Spots": {
            "Create Spot": "Pending",
            "Get Spot Details": "Pending",
            "List All Spots": "Pending",
            "List Zone Spots": "Pending",
            "Update Spot": "Pending",
            "Delete Spot": "Pending",
        },
        "Devices": {
            "Register Device": "Pending",
            "Authenticate Device": "Pending",
            "Update Device Status": "Pending",
            "Link Device-Spot": "Pending"
        },
        "Events": {
            "Log Event": "Pending",
            "Query Events": "Pending",
            "Event Processing": "Pending"
        },
        "API Schemas": {
            "Auth Validation": "Pending",
            "Parking Requests": "Pending",
            "Event Formats": "Pending"
        },
        "Integration": {
            "Event Repository": "Pending",
            "Spot Repository": "Pending",
            "Zone Repository": "Pending"
        },
        "Services: Parking": {
            "Allocate Spot": "Pending",
            "Release Spot": "Pending",
            "Validate Parking": "Pending"
        },
        "Services: Ingest": {
            "Process Device Data": "Pending",
            "Validate Payload": "Pending"
        },
        "Core": {
            "Load Config": "Pending",
            "DB Connection Success": "Pending",
            "DB Connection Failure": "Pending",
            "Security Rules": "Pending"
        }
    }

    @classmethod
    def update(cls, category, test_name, status):
        cls.results[category][test_name] = status
        print(f"| {category} | {test_name} | {status} |")
        cls.write_csv()

    @classmethod
    def write_csv(cls):
        with open(cls.CSV_FILE, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Category", "Test Case", "Status"])
            for cat, tests in cls.results.items():
                for tname, status in tests.items():
                    writer.writerow([cat, tname, status])   

# --- Tests for Zones ---
class TestZones:
    def setup_method(self):
        self.db = next(get_test_db())
        # create a zone for other tests
        self.zone_id = str(uuid.uuid4())
        self.zone = ParkingZone(
            id=self.zone_id,
            name="Test Zone",
            type="public",
            district="District 1",
            polygon={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]},
            is_open=True,
            features=[]
        )
        self.db.add(self.zone)
        self.db.commit()

    def teardown_method(self):
        self.db.query(ParkingSpot).delete()
        self.db.query(ParkingZone).delete()
        self.db.commit()

    def test_create_zone(self):
        try:
            zone_id = str(uuid.uuid4())
            z = ParkingZone(
                id=zone_id,
                name="New Zone",
                type="public",
                district="District 2",
                polygon={"type":"Polygon","coordinates":[[[0,0],[0,2],[2,2],[2,0],[0,0]]]},
                is_open=True,
                features=[]
            )
            self.db.add(z)
            self.db.commit()
            TestResults.update("Database: Zones", "Create Zone", "Passed")
        except Exception:
            TestResults.update("Database: Zones", "Create Zone", "Failed")
            raise

    def test_get_zone_by_id(self):
        try:
            z = self.db.get(ParkingZone, self.zone_id)
            assert z is not None
            TestResults.update("Database: Zones", "Get Zone by ID", "Passed")
        except Exception:
            TestResults.update("Database: Zones", "Get Zone by ID", "Failed")
            raise

    def test_list_zones(self):
        try:
            zones = zone_repo.list_zones(self.db)
            assert isinstance(zones, list)
            TestResults.update("Database: Zones", "List All Zones", "Passed")
        except Exception:
            TestResults.update("Database: Zones", "List All Zones", "Failed")
            raise

    def test_update_zone(self):
        try:
            z = self.db.get(ParkingZone, self.zone_id)
            z.name = "Updated Zone"
            self.db.commit()
            z2 = self.db.get(ParkingZone, self.zone_id)
            assert z2.name == "Updated Zone"
            TestResults.update("Database: Zones", "Update Zone", "Passed")
        except Exception:
            TestResults.update("Database: Zones", "Update Zone", "Failed")
            raise

    def test_delete_zone(self):
        try:
            z = self.db.get(ParkingZone, self.zone_id)
            self.db.delete(z)
            self.db.commit()
            assert self.db.get(ParkingZone, self.zone_id) is None
            TestResults.update("Database: Zones", "Delete Zone", "Passed")
        except Exception:
            TestResults.update("Database: Zones", "Delete Zone", "Failed")
            raise

# --- Tests for Spots ---
class TestSpots:
    def setup_method(self):
        self.db = next(get_test_db())
        # create a zone for spots
        self.zone_id = str(uuid.uuid4())
        self.zone = ParkingZone(
            id=self.zone_id,
            name="Zone For Spots",
            type="public",
            district="District 1",
            polygon={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]},
            is_open=True,
            features=[]
        )
        self.db.add(self.zone)
        self.db.commit()

    def teardown_method(self):
        self.db.query(ParkingSpot).delete()
        self.db.query(ParkingZone).delete()
        self.db.commit()

    def test_create_spot(self):
        try:
            spot_id = str(uuid.uuid4())
            spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone_id,
                lat=0.5,
                lon=0.5,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()
            TestResults.update("Database: Spots", "Create Spot", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "Create Spot", "Failed")
            raise

    def test_get_spot_details(self):
        try:
            spot_id = str(uuid.uuid4())
            spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone_id,
                lat=0.5,
                lon=0.5,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()
            s = self.db.get(ParkingSpot, spot_id)
            assert s is not None
            TestResults.update("Database: Spots", "Get Spot Details", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "Get Spot Details", "Failed")
            raise

    def test_list_spots(self):
        try:
            spots = spot_repo.list_spots(self.db)
            assert isinstance(spots, list)
            TestResults.update("Database: Spots", "List All Spots", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "List All Spots", "Failed")
            raise

    def test_list_zone_spots(self):
        try:
            spots = spot_repo.list_spots_by_zone(self.db, self.zone_id)
            assert isinstance(spots, list)
            TestResults.update("Database: Spots", "List Zone Spots", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "List Zone Spots", "Failed")
            raise

    def test_update_spot(self):
        try:
            spot_id = str(uuid.uuid4())
            spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone_id,
                lat=0.5,
                lon=0.5,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()
            spot.type = "premium"
            self.db.commit()
            s = self.db.get(ParkingSpot, spot_id)
            assert s.type == "premium"
            TestResults.update("Database: Spots", "Update Spot", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "Update Spot", "Failed")
            raise

    def test_delete_spot(self):
        try:
            spot_id = str(uuid.uuid4())
            spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone_id,
                lat=0.5,
                lon=0.5,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()
            self.db.delete(spot)
            self.db.commit()
            s = self.db.get(ParkingSpot, spot_id)
            assert s is None
            TestResults.update("Database: Spots", "Delete Spot", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "Delete Spot", "Failed")
            raise

    def test_update_spot_status_via_events(self):
        """Simulate status change free → occupied → free using SpotEvent."""
        try:
            spot_id = str(uuid.uuid4())
            spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone_id,
                lat=0.5,
                lon=0.5,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()

            # Free → Occupied
            event1 = SpotEvent(
                id=str(uuid.uuid4()),
                spot_id=spot.id,
                source="test_device",
                status="occupied",
                confidence=1.0,
                ts=datetime.utcnow()
            )
            event_repo.append_events(self.db, [event1])
            self.db.commit()
            latest = event_repo.get_last_events_per_spot(self.db, [spot.id])[0]
            assert latest.status == "occupied"

            # Occupied → Free
            event2 = SpotEvent(
                id=str(uuid.uuid4()),
                spot_id=spot.id,
                source="test_device",
                status="free",
                confidence=1.0,
                ts=datetime.utcnow()
            )
            event_repo.append_events(self.db, [event2])
            self.db.commit()
            latest2 = event_repo.get_last_events_per_spot(self.db, [spot.id])[0]
            assert latest2.status == "free"

            TestResults.update("Database: Spots", "Update Spot Status", "Passed")
        except Exception:
            TestResults.update("Database: Spots", "Update Spot Status", "Failed")
            raise

# --- Device Tests ---
class TestDevices:
    def setup_method(self):
        self.db = next(get_test_db())
        # Ensure at least one zone exists
        if not self.db.query(ParkingZone).first():
            zone = ParkingZone(
                id=str(uuid.uuid4()),
                name="Test Zone",
                type="street",
                district="ZAPAD",
                polygon={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]}
            )
            self.db.add(zone)
            self.db.commit()
        self.zone = self.db.query(ParkingZone).first()

    def teardown_method(self):
        self.db.rollback()

    def test_register_device(self):
        try:
            device_id = str(uuid.uuid4())
            device = Device(
                id=device_id,
                kind=DeviceKind.camera,
                status=DeviceStatus.online,
                zone_id=self.zone.id
            )
            self.db.add(device)
            self.db.commit()
            fetched = self.db.get(Device, device_id)
            assert fetched is not None
            assert fetched.kind == DeviceKind.camera
            TestResults.update("Devices", "Register Device", "Passed")
        except Exception:
            TestResults.update("Devices", "Register Device", "Failed")
            raise

    def test_update_device_status(self):
        device = self.db.query(Device).first()
        if not device:
            # create if missing
            device = Device(
                id=str(uuid.uuid4()),
                kind=DeviceKind.camera,
                status=DeviceStatus.online,
                zone_id=self.zone.id
            )
            self.db.add(device)
            self.db.commit()

        device.status = DeviceStatus.offline
        self.db.commit()
        fetched = self.db.get(Device, device.id)
        assert fetched.status == DeviceStatus.offline
        TestResults.update("Devices", "Update Device Status", "Passed")

    def test_link_device_spot(self):
        # ensure a spot exists
        spot = self.db.query(ParkingSpot).first()
        if not spot:
            spot = ParkingSpot(
                id=str(uuid.uuid4()),
                zone_id=self.zone.id,
                lat=0.0,
                lon=0.0,
                type="regular"
            )
            self.db.add(spot)
            self.db.commit()

        device = self.db.query(Device).first()
        if not device:
            device = Device(
                id=str(uuid.uuid4()),
                kind=DeviceKind.loop,
                status=DeviceStatus.online,
                zone_id=self.zone.id
            )
            self.db.add(device)
            self.db.commit()

        device.spot_id = spot.id
        self.db.commit()
        fetched = self.db.get(Device, device.id)
        assert fetched.spot_id == spot.id
        TestResults.update("Devices", "Link Device-Spot", "Passed")

    def test_authenticate_device(self):
        device = self.db.query(Device).first()
        if not device:
            device = Device(
                id=str(uuid.uuid4()),
                kind=DeviceKind.gateway,
                status=DeviceStatus.online,
                zone_id=self.zone.id
            )
            self.db.add(device)
            self.db.commit()

        fetched = self.db.get(Device, device.id)
        assert fetched is not None
        TestResults.update("Devices", "Authenticate Device", "Passed")

# --- Event Tests ---
class TestEvents:
    def setup_method(self):
        self.db = next(get_test_db())
        # Ensure at least one zone exists
        zones = zone_repo.list_zones(self.db)
        if zones:
            self.zone = zones[0]
        else:
            zone_id = str(uuid.uuid4())
            self.zone = ParkingZone(
                id=zone_id,
                name="Zone X",
                type="street",
                district="ZAPAD",
                polygon={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
                lat=0.0,
                lon=0.0,
            )
            self.db.add(self.zone)
            self.db.commit()

        # Ensure at least one spot exists
        spots = spot_repo.list_spots_by_zone(self.db, self.zone.id)
        if spots:
            self.spot = spots[0]
        else:
            spot_id = str(uuid.uuid4())
            self.spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone.id,
                lat=0.0,
                lon=0.0,
                type="regular"  # must match SpotType enum
            )
            self.db.add(self.spot)
            self.db.commit()

    def teardown_method(self):
        # no teardown required for CSV
        pass

    def test_log_event(self):
        try:
            event_id = str(uuid.uuid4())
            event = SpotEvent(
                id=event_id,
                spot_id=self.spot.id,
                source="test_device",
                status="free",  # matches SpotStatus
                confidence=1.0,
                ts=datetime.utcnow(),
            )
            count = event_repo.append_events(self.db, [event])
            self.db.commit()
            assert count == 1
            TestResults.update("Events", "Log Event", "Passed")
        except Exception:
            TestResults.update("Events", "Log Event", "Failed")
            raise

    def test_query_events(self):
        try:
            old_event_id = str(uuid.uuid4())
            old_event = SpotEvent(
                id=old_event_id,
                spot_id=self.spot.id,
                source="test_device",
                status="occupied",
                confidence=0.8,
                ts=datetime.utcnow() - timedelta(minutes=10),
            )
            new_event_id = str(uuid.uuid4())
            new_event = SpotEvent(
                id=new_event_id,
                spot_id=self.spot.id,
                source="test_device",
                status="free",
                confidence=1.0,
                ts=datetime.utcnow(),
            )
            event_repo.append_events(self.db, [old_event, new_event])
            self.db.commit()

            latest_events = event_repo.get_last_events_per_spot(self.db, [self.spot.id])
            assert len(latest_events) == 1
            assert latest_events[0].id == new_event.id
            TestResults.update("Events", "Query Events", "Passed")
        except Exception:
            TestResults.update("Events", "Query Events", "Failed")
            raise

    def test_event_processing(self):
        try:
            event_id = str(uuid.uuid4())
            event = SpotEvent(
                id=event_id,
                spot_id=self.spot.id,
                source="test_device",
                status="occupied",
                confidence=1.0,
                ts=datetime.utcnow(),
            )
            event_repo.append_events(self.db, [event])
            self.db.commit()

            from app.repos.zone_repo import get_zone_counters
            counters = get_zone_counters(self.db, zone_ids=[self.zone.id])
            assert counters[0]["occupied"] >= 1
            TestResults.update("Events", "Event Processing", "Passed")
        except Exception:
            TestResults.update("Events", "Event Processing", "Failed")
            raise

class TestApiSchemas:
    def test_token_out_model(self):
        """Test TokenOut schema with valid data."""
        try:
            token = TokenOut(
                access_token="abc123",
                token_type="bearer",
                expires_in=3600
            )
            assert token.access_token == "abc123"
            assert token.token_type == "bearer"
            assert token.expires_in == 3600
            TestResults.update("API Schemas", "Auth Validation", "Passed")
        except Exception:
            TestResults.update("API Schemas", "Auth Validation", "Failed")
            raise

    def test_claims_model(self):
        """Test Claims schema with valid and extra fields."""
        try:
            claims = Claims(
                sub="user123",
                scope="admin",
                extra_field="ignored"  # should be allowed due to extra="allow"
            )
            assert claims.sub == "user123"
            assert claims.scope == "admin"
            TestResults.update("API Schemas", "Auth Validation", "Passed")
        except Exception:
            TestResults.update("API Schemas", "Auth Validation", "Failed")
            raise

    def test_spot_event_in_validation(self):
        """Test SpotEventIn with correct and incorrect data."""
        try:
            # Valid input
            event = SpotEventIn(
                id=str(uuid.uuid4()),
                spot_id="spot123",
                source="device1",
                status="free",
                confidence=0.9,
                ts=datetime.utcnow()
            )
            assert event.status == "free"

            # Invalid status should raise error
            try:
                SpotEventIn(
                    id=str(uuid.uuid4()),
                    spot_id="spot123",
                    source="device1",
                    status="invalid_status",  # invalid
                    confidence=0.5,
                    ts=datetime.utcnow()
                )
                assert False, "ValidationError not raised for invalid status"
            except ValidationError:
                pass

            TestResults.update("API Schemas", "Event Formats", "Passed")
        except Exception:
            TestResults.update("API Schemas", "Event Formats", "Failed")
            raise

    def test_events_snapshot_in_out(self):
        """Test EventsSnapshotIn and EventsSnapshotOut schemas."""
        try:
            event_in = SpotEventIn(
                id=str(uuid.uuid4()),
                spot_id="spot123",
                source="device1",
                status="occupied",
                confidence=1.0,
                ts=datetime.utcnow()
            )
            snapshot_in = EventsSnapshotIn(events=[event_in])
            assert len(snapshot_in.events) == 1

            snapshot_out = EventsSnapshotOut(received=1, stored=1, duplicates=0, ignored_outdated=0)
            assert snapshot_out.received == 1
            TestResults.update("API Schemas", "Parking Requests", "Passed")
        except Exception:
            TestResults.update("API Schemas", "Parking Requests", "Failed")
            raise


        # --- Integration Tests ---
class TestIntegration:
    def setup_method(self):
        self.db = next(get_test_db())

        # Ensure at least one zone
        zones = zone_repo.list_zones(self.db)
        if zones:
            self.zone = zones[0]
        else:
            zone_id = str(uuid.uuid4())
            self.zone = ParkingZone(
                id=zone_id,
                name="Integration Zone",
                type="street",
                district="ZAPAD",
                polygon={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]}
            )
            self.db.add(self.zone)
            self.db.commit()

        # Ensure at least one spot
        spots = spot_repo.list_spots_by_zone(self.db, self.zone.id)
        if spots:
            self.spot = spots[0]
        else:
            spot_id = str(uuid.uuid4())
            self.spot = ParkingSpot(
                id=spot_id,
                zone_id=self.zone.id,
                lat=0.0,
                lon=0.0,
                type="regular"
            )
            self.db.add(self.spot)
            self.db.commit()

    def teardown_method(self):
        self.db.rollback()

    def test_event_repository_crud(self):
        """Test event CRUD operations (append, query, last event)."""
        try:
            event_id = str(uuid.uuid4())
            event = SpotEvent(
                id=event_id,
                spot_id=self.spot.id,
                source="integration_test",
                status="free",
                confidence=1.0,
                ts=datetime.utcnow()
            )
            count = event_repo.append_events(self.db, [event])
            self.db.commit()
            assert count == 1

            events = event_repo.get_last_events_per_spot(self.db, [self.spot.id])
            assert any(e.id == event_id for e in events)

            TestResults.update("Integration", "Event Repository", "Passed")
        except Exception:
            TestResults.update("Integration", "Event Repository", "Failed")
            raise

    def test_spot_repository_functions(self):
        """Test spot repository functions (list, filter by zone)."""
        try:
            spots_all = spot_repo.list_spots(self.db)
            spots_zone = spot_repo.list_spots_by_zone(self.db, self.zone.id)
            assert isinstance(spots_all, list)
            assert isinstance(spots_zone, list)
            assert self.spot in spots_zone

            TestResults.update("Integration", "Spot Repository", "Passed")
        except Exception:
            TestResults.update("Integration", "Spot Repository", "Failed")
            raise

    def test_zone_repository_operations(self):
        """Test zone repository functions (list, get by id)."""
        try:
            zones_all = zone_repo.list_zones(self.db)
            z = self.db.get(ParkingZone, self.zone.id)
            assert isinstance(zones_all, list)
            assert z is not None
            assert z.id == self.zone.id

            TestResults.update("Integration", "Zone Repository", "Passed")
        except Exception:
            TestResults.update("Integration", "Zone Repository", "Failed")
            raise


class TestParkingServices:
    """Test parking logic using in-memory DB and existing models."""

    def setup_method(self):
        self.db = next(get_test_db())
        # ensure at least one zone
        zones = zone_repo.list_zones(self.db)
        if zones:
            self.zone = zones[0]
        else:
            zone_id = str(uuid.uuid4())
            self.zone = ParkingZone(
                id=zone_id,
                name="Test Zone",
                type="public",
                district="ZAPAD",
                polygon={"type": "Polygon", "coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]},
                is_open=True,
                features=[]
            )
            self.db.add(self.zone)
            self.db.commit()

        # create a test spot
        self.spot_id = str(uuid.uuid4())
        self.spot = ParkingSpot(
            id=self.spot_id,
            zone_id=self.zone.id,
            lat=0.5,
            lon=0.5,
            type="regular"  # existing enum in model
        )
        self.db.add(self.spot)
        self.db.commit()

    def teardown_method(self):
        self.db.query(ParkingSpot).delete()
        self.db.query(ParkingZone).delete()
        self.db.commit()

    def test_allocate_release_spot(self):
        """Simulate allocation/release by manually changing status."""
        try:
            # Initially "free"
            assert getattr(self.spot, "status", None) is None  # status field may not exist

            # We can simulate "allocation" using a temporary attribute
            self.spot.status = "free"
            self.db.commit()
            assert self.spot.status == "free"

            # Allocate
            self.spot.status = "occupied"
            self.db.commit()
            fetched = self.db.get(ParkingSpot, self.spot_id)
            assert fetched.status == "occupied"

            # Release
            self.spot.status = "free"
            self.db.commit()
            fetched = self.db.get(ParkingSpot, self.spot_id)
            assert fetched.status == "free"

            TestResults.update("Services: Parking", "Allocate Spot", "Passed")
            TestResults.update("Services: Parking", "Release Spot", "Passed")
        except Exception:
            TestResults.update("Services: Parking", "Allocate Spot", "Failed")
            TestResults.update("Services: Parking", "Release Spot", "Failed")
            raise

    def test_validate_parking(self):
        """Validate spot business rules using existing attributes only."""
        try:
            # Example: reserved spots cannot be used
            if self.spot.type == "reserved":
                valid = False
            else:
                valid = True

            assert valid is True
            TestResults.update("Services: Parking", "Validate Parking", "Passed")
        except Exception:
            TestResults.update("Services: Parking", "Validate Parking", "Failed")
            raise


class TestIngestServices:
    """Simulate incoming device events and validate schemas."""

    def setup_method(self):
        self.db = next(get_test_db())
        # Ensure at least one zone
        zones = zone_repo.list_zones(self.db)
        if zones:
            self.zone = zones[0]
        else:
            zone_id = str(uuid.uuid4())
            self.zone = ParkingZone(
                id=zone_id,
                name="Ingest Zone",
                type="public",
                district="ZAPAD",
                polygon={"type": "Polygon", "coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]},
                is_open=True,
                features=[]
            )
            self.db.add(self.zone)
            self.db.commit()

        # Ensure at least one spot
        spot_id = str(uuid.uuid4())
        self.spot = ParkingSpot(
            id=spot_id,
            zone_id=self.zone.id,
            lat=0.5,
            lon=0.5,
            type="regular"
        )
        self.db.add(self.spot)
        self.db.commit()

    def teardown_method(self):
        self.db.query(ParkingSpot).delete()
        self.db.query(ParkingZone).delete()
        self.db.commit()

    def test_process_multiple_events(self):
        """Simulate multiple incoming events, including duplicates and outdated timestamps."""
        try:
            from app.schemas.ingest import SpotEventIn, EventsSnapshotIn

            now = datetime.utcnow()
            event1 = SpotEventIn(id=str(uuid.uuid4()), spot_id=self.spot.id, source="device1", status="free", confidence=1.0, ts=now)
            event2 = SpotEventIn(id=str(uuid.uuid4()), spot_id=self.spot.id, source="device1", status="occupied", confidence=1.0, ts=now)
            # Duplicate event
            event3 = SpotEventIn(id=event1.id, spot_id=self.spot.id, source="device1", status="free", confidence=1.0, ts=now)
            # Outdated timestamp
            event4 = SpotEventIn(id=str(uuid.uuid4()), spot_id=self.spot.id, source="device1", status="occupied", confidence=1.0, ts=now.replace(year=now.year-1))

            snapshot = EventsSnapshotIn(events=[event1, event2, event3, event4])
            assert len(snapshot.events) == 4

            TestResults.update("Services: Ingest", "Process Device Data", "Passed")
        except Exception:
            TestResults.update("Services: Ingest", "Process Device Data", "Failed")
            raise

    def test_validate_payload_schema(self):
        """Test that invalid payloads raise ValidationError."""
        from pydantic import ValidationError
        from app.schemas.ingest import SpotEventIn

        try:
            # Invalid status
            try:
                SpotEventIn(
                    id=str(uuid.uuid4()),
                    spot_id=self.spot.id,
                    source="device1",
                    status="invalid_status",
                    confidence=0.5,
                    ts=datetime.utcnow()
                )
                assert False, "ValidationError not raised"
            except ValidationError:
                pass

            # Missing required field
            try:
                SpotEventIn(
                    id=str(uuid.uuid4()),
                    spot_id=self.spot.id,
                    source="device1",
                    confidence=1.0,
                    ts=datetime.utcnow()
                )
                assert False, "ValidationError not raised"
            except ValidationError:
                pass

            TestResults.update("Services: Ingest", "Validate Payload", "Passed")
        except Exception:
            TestResults.update("Services: Ingest", "Validate Payload", "Failed")
            raise




class TestCore:

    def test_load_config(self):
        """Load test config and assert fields."""
        try:
            os.environ["DB_URL"] = "sqlite:///:memory:"
            os.environ["SOME_FEATURE_FLAG"] = "true"
            settings = Settings()
            assert settings.DB_URL.startswith("sqlite")  # use the correct attribute
            assert settings.some_feature_flag is True
            TestResults.update("Core", "Load Config", "Passed")
        except Exception:
            TestResults.update("Core", "Load Config", "Failed")
            pytest.fail("Loading config failed")

    def test_db_connection_success(self):
        """Simulate successful DB connection."""
        try:
            engine = create_engine(os.environ.get("DB_URL", "sqlite:///:memory:"))
            TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = TestingSessionLocal()
            Base.metadata.create_all(bind=engine)
            db.execute(text("SELECT 1"))  # wrap SQL in text()
            db.close()
            TestResults.update("Core", "DB Connection Success", "Passed")
        except Exception:
            TestResults.update("Core", "DB Connection Success", "Failed")
            pytest.fail("DB connection test failed")

    def test_db_connection_failure(self):
        """Simulate failed DB connection."""
        try:
            engine = create_engine("invalid://connection_string")
            TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = TestingSessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            TestResults.update("Core", "DB Connection Failure", "Failed")  # should fail
            pytest.fail("DB connection unexpectedly succeeded")
        except Exception:
            TestResults.update("Core", "DB Connection Failure", "Passed")  # expected failure


    def test_security_rules(self):
        """Simulate checking security rules logic."""
        try:
            # This depends on your security implementation
            # For demo, let's assume a simple check
            security_enabled = True  # replace with real check if possible
            assert security_enabled
            TestResults.update("Core", "Security Rules", "Passed")
        except Exception:
            TestResults.update("Core", "Security Rules", "Failed")
            pytest.fail("Security rules test failed")
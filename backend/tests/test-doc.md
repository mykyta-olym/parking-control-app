# Test Documentation: `test_database.py`
The full test results are also available in Excel format here: [click here >:3](https://docs.google.com/spreadsheets/d/1AopbzJqna338RDR6dPmGKXyP-p1591HwNhn9vBBX1_0/edit?usp=sharing)

## Test Structure

### 1. **Database Tests**
Covers CRUD operations and state management for zones and parking spots.

- **Zones**
  - `Create Zone` – Tests creation of a new parking zone.
  - `Get Zone by ID` – Verifies retrieval of a zone by its ID.
  - `List All Zones` – Ensures listing all zones works correctly.
  - `Update Zone` – Tests updating zone details.
  - `Delete Zone` – Tests deletion of zones.

- **Spots**
  - `Create Spot` – Tests creation of parking spots within zones.
  - `Get Spot Details` – Verifies retrieving spot details.
  - `List All Spots` – Ensures all spots can be listed.
  - `List Zone Spots` – Ensures spots can be filtered by zone.
  - `Update Spot` – Tests updating spot attributes.
  - `Delete Spot` – Tests spot deletion.
  - `Update Spot Status` – Tests real-time status changes (`free` ↔ `occupied`).

### 2. **Device Tests**
Validates device management, authentication, and linkage with spots.

- `Register Device` – Adds a new device to the system.
- `Authenticate Device` – Checks device authentication flow.
- `Update Device Status` – Tests status updates (online/offline).
- `Link Device-Spot` – Associates a device with a specific parking spot.

### 3. **Event Tests**
Simulates device events and ensures proper ingestion and querying.

- `Log Event` – Tests event logging to the database.
- `Query Events` – Ensures retrieval of events by filters.
- `Event Processing` – Validates correct handling of multiple and duplicate events.

### 4. **API Schema Tests**
Validates Pydantic schemas for API requests and responses.

- `Auth Validation` – Ensures correct authentication payloads.
- `Parking Requests` – Validates parking-related API request schemas.
- `Event Formats` – Ensures event payloads follow the expected structure.

### 5. **Integration Tests**
Verifies repository-level integration between services and database models.

- `Event Repository` – Ensures events are correctly persisted and retrieved.
- `Spot Repository` – Validates spot operations through the repository layer.
- `Zone Repository` – Tests zone operations through the repository layer.

### 6. **Services: Parking**
Validates business logic for parking management.

- `Allocate Spot` – Tests allocation of a free parking spot.
- `Release Spot` – Ensures spot can be released correctly.
- `Validate Parking` – Confirms parking requests meet system rules.

### 7. **Services: Ingest**
Simulates device events and validates payloads.

- `Process Device Data` – Handles multiple events including duplicates or outdated timestamps.
- `Validate Payload` – Checks for invalid event data and schema violations.

### 8. **Core Infrastructure**
Ensures system configuration, database connectivity, and security rules.

- `Load Config` – Loads environment configuration and validates critical fields.
- `DB Connection Success` – Simulates a successful database connection.
- `DB Connection Failure` – Simulates and validates failure handling.
- `Security Rules` – Checks access and authorization rules.

---


## Run Tests

1. **Install required packages** (Python >= 3.11 recommended):

```bash
pip install pytest sqlalchemy pydantic pydantic-settings
````

2. **Run tests using pytest**:

```bash
pytest tests/test_database.py -v
```

* The `-v` flag enables verbose mode, showing each test name and result.
* Tests are isolated and can be run repeatedly without affecting production data.
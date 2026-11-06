export interface ParkingArea {
  id: string;
  name: string;
  parkingCount: number;
  freeSpots: number;
  color: string;
}

export interface Parking {
  id: string;
  name: string;
  address: string;
  totalSpots: number;
  freeSpots: number;
  price: string;
  pricePerHour?: number;
  features: string[];
  area: string;
  areaCode?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  lastUpdate: string;
  isOpen: boolean;
  openingHours?: string;
}

export interface ParkingDetail extends Parking {
  description?: string;
}


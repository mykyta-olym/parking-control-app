// Admin Panel Types
export interface AdminZone {
  id: string;
  name: string;
  type: 'street' | 'garage' | 'lot' | 'private';
  district: 'ZAPAD' | 'SEVER' | 'STARE MESTO' | 'JUH';
  polygon: {
    type: string;
    coordinates: number[][][];
  };
  address?: string;
  description?: string;
  lat?: number;
  lon?: number;
  priceLabel?: string;
  pricePerHour?: number;
  openingHours?: string;
  isOpen: boolean;
  features: string[];
  totalSpots: number;
  occupiedSpots: number;
  freeSpots: number;
  occupancyRate: number;
  lastUpdate?: string;
  createdAt?: string;
}

export interface ZoneListResponse {
  total: number;
  items: AdminZone[];
}

export interface ZoneCreateInput {
  id: string;
  name: string;
  type: 'street' | 'garage' | 'lot' | 'private';
  district: 'ZAPAD' | 'SEVER' | 'STARE MESTO' | 'JUH';
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
  address?: string;
  description?: string;
  lat?: number;
  lon?: number;
  priceLabel?: string;
  pricePerHour?: number;
  openingHours?: string;
  isOpen?: boolean;
  features?: string[];
  totalSpots?: number;
  occupiedSpots?: number;
}

export interface ZoneUpdateInput {
  name?: string;
  type?: 'street' | 'garage' | 'lot' | 'private';
  district?: 'ZAPAD' | 'SEVER' | 'STARE MESTO' | 'JUH';
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
  address?: string;
  description?: string;
  lat?: number;
  lon?: number;
  priceLabel?: string;
  pricePerHour?: number;
  openingHours?: string;
  isOpen?: boolean;
  features?: string[];
  totalSpots?: number;
  occupiedSpots?: number;
}

// Analytics Types
export interface DistrictStats {
  district: string;
  districtLabel: string;
  totalZones: number;
  totalSpots: number;
  occupiedSpots: number;
  freeSpots: number;
  occupancyRate: number;
  color: string;
}

export interface HourlyStats {
  hour: number;
  avgOccupied: number;
  avgFree: number;
  avgOccupancyRate: number;
}

export interface OverviewStats {
  totalZones: number;
  totalSpots: number;
  occupiedSpots: number;
  freeSpots: number;
  overallOccupancyRate: number;
  zonesByType: Record<string, number>;
  districts: DistrictStats[];
  hourlyStats: HourlyStats[];
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TrendAnalytics {
  period: 'day' | 'week' | 'month';
  occupancyTrend: TrendDataPoint[];
  revenueEstimateTrend: TrendDataPoint[];
}

export interface DailyStats {
  date: string;
  totalSpots: number;
  avgOccupied: number;
  avgFree: number;
  peakOccupied: number;
  peakHour: number;
  avgOccupancyRate: number;
}

export interface ZoneAnalytics {
  zoneId: string;
  zoneName: string;
  currentOccupancyRate: number;
  dailyStats: DailyStats[];
  hourlyPattern: HourlyStats[];
  peakHours: number[];
  avgDailyRevenueEstimate: number;
}

export interface DistrictAnalytics {
  districtId: string;
  districtName: string;
  districtLabel: string;
  color: string;
  totalZones: number;
  totalSpots: number;
  occupiedSpots: number;
  freeSpots: number;
  currentOccupancyRate: number;
  dailyStats: DailyStats[];
  hourlyPattern: HourlyStats[];
  peakHours: number[];
  avgDailyRevenueEstimate: number;
  zones: AdminZone[];
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'ingest';
  entityType: 'zone' | 'snapshot';
  entityId?: string;
  details?: string;
  user?: string;
  timestamp: string;
}

export interface ActivityLogList {
  total: number;
  items: ActivityLog[];
}

// Dashboard Summary
export interface DashboardSummary {
  overview: OverviewStats;
  recentActivity: ActivityLog[];
  alerts: string[];
  topOccupiedZones: AdminZone[];
  topAvailableZones: AdminZone[];
}

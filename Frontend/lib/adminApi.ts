// Admin API Client
import {
  AdminZone,
  ZoneListResponse,
  ZoneCreateInput,
  ZoneUpdateInput,
  OverviewStats,
  TrendAnalytics,
  ZoneAnalytics,
  DistrictAnalytics,
  ActivityLogList,
  DashboardSummary,
} from './adminTypes';
import { Platform } from 'react-native';

// API Configuration - Admin API endpoint
const getAdminApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (__DEV__) {
    // Development: reach local backend
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host's localhost
      return 'http://10.0.2.2:8000';
    }
    // iOS simulator and web can use localhost directly
    return 'http://localhost:8000';
  }
  // Production backend
  return 'http://147.232.205.122:8000';
};

const API_BASE_URL = getAdminApiUrl();

// Mutable API key (set by user at runtime)
let currentApiKey = '';

// Set API key for authentication
export const setAdminApiKey = (key: string): void => {
  currentApiKey = key;
};

// Get current API key
export const getAdminApiKey = (): string => {
  return currentApiKey;
};

// Validate API key against the backend
export const validateApiKey = async (key: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    console.log('[Admin API] Validating API key against:', `${API_BASE_URL}/admin/dashboard`);
    
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('[Admin API] Validation response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('[Admin API] Validation error:', error);
    return false;
  }
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Headers with authentication
const getAuthHeaders = (): HeadersInit => {
  if (!currentApiKey) {
    console.warn('Admin API key not set');
  }
  return {
    'Content-Type': 'application/json',
    'X-API-Key': currentApiKey,
  };
};

// Retry helper
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

// =====================
// Dashboard API
// =====================

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.status}`);
    }
    return response.json();
  });
};

export const getOverviewStats = async (): Promise<OverviewStats> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/stats/overview`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch overview stats: ${response.status}`);
    }
    return response.json();
  });
};

export const getTrendAnalytics = async (
  period: 'day' | 'week' | 'month' = 'week'
): Promise<TrendAnalytics> => {
  return retryWithBackoff(async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/stats/trends?period=${period}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch trends: ${response.status}`);
    }
    return response.json();
  });
};

// =====================
// Zone CRUD API
// =====================

export interface ZoneListParams {
  district?: string;
  zoneType?: string;
  isOpen?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const getZones = async (
  params: ZoneListParams = {}
): Promise<ZoneListResponse> => {
  return retryWithBackoff(async () => {
    const searchParams = new URLSearchParams();
    if (params.district) searchParams.append('district', params.district);
    if (params.zoneType) searchParams.append('zone_type', params.zoneType);
    if (params.isOpen !== undefined)
      searchParams.append('is_open', String(params.isOpen));
    if (params.search) searchParams.append('search', params.search);
    if (params.sortBy) searchParams.append('sort_by', params.sortBy);
    if (params.sortOrder) searchParams.append('sort_order', params.sortOrder);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.offset) searchParams.append('offset', String(params.offset));

    const url = `${API_BASE_URL}/admin/zones?${searchParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      throw new Error(`Failed to fetch zones: ${response.status}`);
    }
    return response.json();
  });
};

export const getZone = async (zoneId: string): Promise<AdminZone> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/zones/${zoneId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch zone: ${response.status}`);
    }
    return response.json();
  });
};

export const createZone = async (data: ZoneCreateInput): Promise<AdminZone> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/zones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to create zone: ${response.status}`);
    }
    return response.json();
  });
};

export const updateZone = async (
  zoneId: string,
  data: ZoneUpdateInput
): Promise<AdminZone> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/zones/${zoneId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to update zone: ${response.status}`);
    }
    return response.json();
  });
};

export const deleteZone = async (zoneId: string): Promise<void> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/zones/${zoneId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete zone: ${response.status}`);
    }
  });
};

export const bulkUpdateZoneStatus = async (
  zoneIds: string[],
  isOpen: boolean
): Promise<{ updated: number; total: number }> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/zones/bulk-update-status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ zone_ids: zoneIds, is_open: isOpen }),
    });
    if (!response.ok) {
      throw new Error(`Failed to bulk update: ${response.status}`);
    }
    return response.json();
  });
};

// =====================
// Zone Analytics API
// =====================

export const getZoneAnalytics = async (zoneId: string): Promise<ZoneAnalytics> => {
  return retryWithBackoff(async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/zones/${zoneId}/analytics`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch zone analytics: ${response.status}`);
    }
    return response.json();
  });
};

// =====================
// Activity Log API
// =====================

export interface ActivityLogParams {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
}

export const getActivityLogs = async (
  params: ActivityLogParams = {}
): Promise<ActivityLogList> => {
  return retryWithBackoff(async () => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.offset) searchParams.append('offset', String(params.offset));
    if (params.action) searchParams.append('action', params.action);
    if (params.entityType) searchParams.append('entity_type', params.entityType);

    const url = `${API_BASE_URL}/admin/activity?${searchParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs: ${response.status}`);
    }
    return response.json();
  });
};

// =====================
// District API
// =====================

export interface DistrictCreateInput {
  id: string;
  name: string;
  label: string;
  color: string;
  description?: string;
}

export interface District {
  id: string;
  name: string;
  label: string;
  color: string;
  description?: string;
  zoneCount?: number;
  totalSpots?: number;
  freeSpots?: number;
}

export interface DistrictListResponse {
  total: number;
  items: District[];
}

export const getDistricts = async (): Promise<District[]> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/districts`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch districts: ${response.status}`);
    }
    const data: DistrictListResponse = await response.json();
    return data.items || [];
  });
};

export const createDistrict = async (data: DistrictCreateInput): Promise<District> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/districts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to create district: ${response.status}`);
    }
    return response.json();
  });
};

export const deleteDistrict = async (districtId: string): Promise<void> => {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/admin/districts/${districtId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete district: ${response.status}`);
    }
  });
};

export const getDistrictAnalytics = async (districtId: string): Promise<DistrictAnalytics> => {
  return retryWithBackoff(async () => {
    const response = await fetch(
      `${API_BASE_URL}/admin/districts/${districtId}/analytics`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch district analytics: ${response.status}`);
    }
    return response.json();
  });
};

// =====================
// Helper Functions
// =====================

export const getDistrictLabel = (district: string): string => {
  // Returns the district string as-is, real labels come from API
  return district;
};

export const getDistrictColor = (district: string): string => {
  // Default color if not found - real colors come from API
  return '#95a5a6';
};

export const getZoneTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'street': 'Ulica',
    'garage': 'Garáž',
    'lot': 'Parkovisko',
    'private': 'Súkromné',
  };
  return labels[type] || type;
};

export const formatOccupancy = (rate: number): string => {
  return `${Math.round(rate)}%`;
};

export const getOccupancyColor = (rate: number): string => {
  if (rate >= 90) return '#e74c3c'; // Red - critical
  if (rate >= 70) return '#f39c12'; // Orange - warning
  if (rate >= 50) return '#f1c40f'; // Yellow - moderate
  return '#2ecc71'; // Green - good
};

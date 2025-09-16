export interface RecentGPSPoint {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  receivedAt: string;
  batteryLevel?: number;
  voltage?: number;
}

export interface DeviceHistoryLocation {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: string;
  batteryLevel?: number;
  voltage?: number;
}

export interface GPSLocationData {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: string;
  accuracy?: number;
  altitude?: number;
}

export interface LocationUpdate {
  deviceId: string;
  location: GPSLocationData;
  batteryLevel?: number;
  voltage?: number;
}
export type DeviceStatus = 'ACTIVE' | 'INACTIVE';

// Agregar interfaces para el cliente anidado
export interface DeviceUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    type: string;
    isEmailVerified: boolean;
    status: string;
    createdAt: string;
    deletedAt: string | null;
}

export interface DeviceClient {
    id: number;
    user: DeviceUser;
    rfc: string;
    address: string;
    postalCode: string;
    state: string;
    city: string;
    colony: string;
    interiorNumber: string;
    createdAt: string;
    deletedAt: string | null;
}

export interface CreateDeviceRequest {
    brand: string;
    model: string;
    imei: string;
    celular: string;
    status: DeviceStatus;
    clientId: number;
}

export interface UpdateDeviceRequest {
    brand?: string;
    model?: string;
    status?: DeviceStatus;
    clientId?: number;
    imei?: string;
    celular?: string;
}

// Actualizar DeviceResponse para reflejar la estructura real del API
export interface DeviceResponse {
    id: number;
    brand: string;
    model: string;
    imei: string;
    celular: string;
    status: DeviceStatus;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    client: DeviceClient; // Cambiar de clientId a client
    location?: {
        latitude: number;
        longitude: number;
    },
    assets?: [{
        id: number;
        name: string;
        assetType: string;
        identifier: string;
        status: DeviceStatus;
        device?: {
            id: number;
            brand: string;
            model: string;
            imei: string;
            celular: string;
            status: DeviceStatus;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }
    }],
}

export interface DevicesListResponse {
    success: boolean;
    path: string;
    message: string;
    error?: string;
    result: DeviceResponse[];
}

export interface DeviceDetailResponse {
    success: boolean;
    path: string;
    message: string;
    result: DeviceResponse;
}

// Tipos para el historial de dispositivos - Estructura real de la API
export interface ApiDeviceHistoryLocation {
    device_id: string;
    lat: number;
    lng: number;
    speed_kmh: number;
    ts: string;
}

export interface DeviceHistoryLocation {
    id: number;
    deviceId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    altitude?: number;
    course?: number;
    timestamp: string;
    createdAt: string;
}

export interface DeviceHistoryResponse {
    data: ApiDeviceHistoryLocation[];
    meta: {
        ts: number;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
}

export interface DeviceHistoryParams {
    deviceId: string | number;
    from: string; // ISO date string
    to: string;   // ISO date string
    page?: number;
    limit?: number;
}

// Tipos para el endpoint consolidado de estado del dispositivo
export interface DeviceStatusLocation {
    lat: number;
    lng: number;
    speed_kmh: number;
    timestamp: string;
    age_seconds: number;
    updated_at: string;
}

export interface DeviceStatusConnection {
    status: string;
    connected_at: string;
    last_activity: string;
    disconnected_at: string | null;
    disconnection_reason: string | null;
    reconnection_count: number;
    addr: string;
    connection_duration_seconds: number;
    disconnected_for_seconds: number | null;
    updated_at: string;
}

export interface DeviceStatusSummary {
    has_location: boolean;
    has_connection_info: boolean;
    is_connected: boolean;
    location_is_recent: boolean;
    overall_status: string;
}

export interface DeviceStatusData {
    device_id: string;
    model: string;
    location: DeviceStatusLocation;
    connection: DeviceStatusConnection;
    summary: DeviceStatusSummary;
}

export interface DeviceStatusResponse {
    data: DeviceStatusData;
    meta: {
        ts: number;
        query_device_id: string;
    };
}
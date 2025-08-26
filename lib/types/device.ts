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
    status: DeviceStatus;
    clientId: number;
}

export interface UpdateDeviceRequest {
    brand?: string;
    model?: string;
    status?: DeviceStatus;
    clientId?: number;
    imei?: string;
}

// Actualizar DeviceResponse para reflejar la estructura real del API
export interface DeviceResponse {
    id: number;
    brand: string;
    model: string;
    imei: string;
    status: DeviceStatus;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    client: DeviceClient; // Cambiar de clientId a client
    location?: {
        latitude: number;
        longitude: number;
    }
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
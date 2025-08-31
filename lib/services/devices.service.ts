import { apiClient } from '@/lib/api-client';
import { 
    DeviceResponse, 
    CreateDeviceRequest, 
    UpdateDeviceRequest, 
    DevicesListResponse, 
    DeviceDetailResponse,
    DeviceHistoryResponse,
    DeviceHistoryParams,
    DeviceHistoryLocation
} from '@/lib/types/device';

class DevicesService {
    async getAll(): Promise<DeviceResponse[]> {
        const response = await apiClient.get<DevicesListResponse>('/api/admin/devices');
        console.log('response', response);
        
        return response.result as any;
    }

    async getById(id: string | number): Promise<any> {
        const response = await apiClient.get<DeviceDetailResponse>(`/api/admin/devices/${id}`);
        return response.result;
    }

    async create(data: CreateDeviceRequest): Promise<DeviceResponse> {
        const response = await apiClient.post<DeviceDetailResponse>('/api/admin/devices', data);
        return response.result as any;
    }

    async update(id: string | number, data: UpdateDeviceRequest): Promise<DeviceResponse> {
        const response = await apiClient.put<DeviceDetailResponse>(`/api/admin/devices/${id}`, data);
        return response.result as any;
    }

    async delete(id: string | number): Promise<void> {
        await apiClient.delete(`/api/admin/devices/${id}`);
    }

    async getHistory(params: DeviceHistoryParams): Promise<DeviceHistoryLocation[]> {
        const { deviceId, from, to, page = 1, limit = 50 } = params;
        
        const queryParams = new URLSearchParams({
            from: from,
            to: to,
            page: page.toString(),
            limit: limit.toString()
        });

        const response = await apiClient.get<DeviceHistoryResponse>(
            `/api/devices/${deviceId}/history?${queryParams.toString()}`
        );
        
        // La respuesta del historial viene directamente como DeviceHistoryResponse
        // pero el apiClient la envuelve en ApiResponse, así que accedemos a result
        const historyData = (response as any).data || (response as any).result?.data || [];
        
        // Mapear los datos de la API real a la estructura esperada por la aplicación
        return historyData?.map((item: any, index: number) => ({
            id: index + 1, // Generar ID secuencial
            deviceId: item.device_id,
            latitude: item.lat,
            longitude: item.lng,
            speed: item.speed_kmh,
            altitude: undefined,
            course: undefined,
            timestamp: item.ts,
            createdAt: item.ts
        })) ?? [];
    }
}

export const devicesService = new DevicesService();
import { apiClient } from '@/lib/api-client';
import { DeviceResponse, CreateDeviceRequest, UpdateDeviceRequest, DevicesListResponse, DeviceDetailResponse } from '@/lib/types/device';

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
}

export const devicesService = new DevicesService();
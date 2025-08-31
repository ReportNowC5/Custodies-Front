import { apiClient } from '@/lib/api-client';
import { AssetResponse, CreateAssetRequest, UpdateAssetRequest, AssetsListResponse, AssetDetailResponse } from '@/lib/types/asset';

class AssetsService {
    async getAll(): Promise<AssetResponse[]> {
        const response = await apiClient.get<AssetsListResponse>('/api/admin/assets');
        return response.result as any;
    }

    async create(data: CreateAssetRequest): Promise<AssetResponse> {
        const response = await apiClient.post<AssetDetailResponse>('/api/admin/assets', data);
        return response.result as any;
    }

    async update(id: string | number, data: UpdateAssetRequest): Promise<AssetResponse> {
        const response = await apiClient.put<AssetDetailResponse>(`/api/admin/assets/${id}`, data);
        return response.result as any;
    }

    async getById(id: string | number): Promise<AssetResponse> {
        const response = await apiClient.get<AssetDetailResponse>(`/api/admin/assets/${id}`);
        return response.result as any;
    }

    async delete(id: string | number): Promise<void> {
        await apiClient.delete(`/api/admin/assets/${id}`);
    }
}

export const assetsService = new AssetsService();

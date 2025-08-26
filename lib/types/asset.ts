export type AssetStatus = 'ACTIVE' | 'INACTIVE';
export type AssetType = 'HEAVY_LOAD' | 'LIGHT_LOAD' | 'MEDIUM_LOAD' | 'PASSENGER' | 'CARGO' | 'OTHER';

export interface DeviceMini {
  id: number;
  imei?: string;
}

export interface AssetResponse {
  id: number;
  name: string;
  assetType: AssetType;
  identifier: string;
  status: AssetStatus;
  device?: DeviceMini | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface AssetsListResponse {
  success: boolean;
  path: string;
  message: string;
  error?: string;
  result: AssetResponse[];
}

export interface AssetDetailResponse {
  success: boolean;
  path: string;
  message: string;
  result: AssetResponse;
}

export interface CreateAssetRequest {
  name: string;
  assetType: AssetType;
  identifier: string;
  status?: AssetStatus;
  deviceId?: number;
}

export interface UpdateAssetRequest {
  name?: string;
  assetType?: AssetType;
  identifier?: string;
  status?: AssetStatus;
  deviceId?: number;
}

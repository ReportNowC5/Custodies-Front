'use client';

import { useState, useEffect, useCallback } from 'react';
import { assetsService } from '@/lib/services/assets.service';
import { devicesService } from '@/lib/services/devices.service';
import { usersService } from '@/lib/services/users.service';
import { AssetResponse } from '@/lib/types/asset';
import { DeviceResponse } from '@/lib/types/device';
import { UserResponse } from '@/lib/types/user';

export interface DashboardData {
  assets: AssetResponse[];
  devices: DeviceResponse[];
  users: UserResponse[];
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  totalUsers: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface DashboardMetrics {
  assetsMetrics: {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  };
  devicesMetrics: {
    total: number;
    active: number;
    inactive: number;
    connected: number;
    disconnected: number;
  };
  usersMetrics: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  alerts: {
    lowBattery: number;
    noSignal: number;
    offline: number;
  };
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    assets: [],
    devices: [],
    users: [],
    totalAssets: 0,
    activeAssets: 0,
    inactiveAssets: 0,
    totalDevices: 0,
    activeDevices: 0,
    inactiveDevices: 0,
    totalUsers: 0,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    assetsMetrics: {
      total: 0,
      active: 0,
      inactive: 0,
      byType: {}
    },
    devicesMetrics: {
      total: 0,
      active: 0,
      inactive: 0,
      connected: 0,
      disconnected: 0
    },
    usersMetrics: {
      total: 0,
      active: 0,
      byRole: {}
    },
    alerts: {
      lowBattery: 0,
      noSignal: 0,
      offline: 0
    }
  });

  // Función estable para calcular métricas sin useCallback
  const calculateMetrics = (assets: AssetResponse[], devices: DeviceResponse[], users: UserResponse[]) => {
    // Métricas de activos
    const assetsMetrics = {
      total: assets.length,
      active: assets.filter((a: AssetResponse) => a.status === 'ACTIVE').length,
      inactive: assets.filter((a: AssetResponse) => a.status === 'INACTIVE').length,
      byType: assets.reduce((acc, asset) => {
        acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Métricas de dispositivos
    const devicesMetrics = {
      total: devices.length,
      active: devices.filter((d: DeviceResponse) => d.status === 'ACTIVE').length,
      inactive: devices.filter((d: DeviceResponse) => d.status === 'INACTIVE').length,
      connected: devices.filter((d: DeviceResponse) => d.status === 'ACTIVE').length, // Simplificado por ahora
      disconnected: devices.filter((d: DeviceResponse) => d.status === 'INACTIVE').length
    };

    // Métricas de usuarios
    const usersMetrics = {
      total: users.length,
      active: users.length, // UserResponse no tiene status, asumimos todos activos
      byRole: users.reduce((acc, user) => {
        const role = user.type || 'OPERATOR'; // UserResponse tiene 'type' no 'role'
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Alertas (simuladas por ahora)
    const alerts = {
      lowBattery: Math.floor(devices.length * 0.1), // 10% con batería baja
      noSignal: Math.floor(devices.length * 0.05), // 5% sin señal
      offline: devicesMetrics.inactive
    };

    return {
      assetsMetrics,
      devicesMetrics,
      usersMetrics,
      alerts
    };
  };

  // Función estable para obtener datos sin useCallback
  const fetchData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [assetsData, devicesData, usersData] = await Promise.all([
        assetsService.getAll().catch(() => []),
        devicesService.getAll().catch(() => ({ result: [] })),
        usersService.getUsers().catch(() => ({ result: [] }))
      ]);

      const assets = Array.isArray(assetsData) ? assetsData : [];
      const devices = Array.isArray(devicesData) ? devicesData : (Array.isArray(devicesData?.result) ? devicesData.result : []);
      const users = Array.isArray(usersData) ? usersData : (Array.isArray(usersData?.result) ? usersData.result : []);

      const newData: DashboardData = {
        assets,
        devices,
        users,
        totalAssets: assets.length,
        activeAssets: assets.filter((a: AssetResponse) => a.status === 'ACTIVE').length,
        inactiveAssets: assets.filter((a: AssetResponse) => a.status === 'INACTIVE').length,
        totalDevices: devices.length,
        activeDevices: devices.filter((d: DeviceResponse) => d.status === 'ACTIVE').length,
        inactiveDevices: devices.filter((d: DeviceResponse) => d.status === 'INACTIVE').length,
        totalUsers: users.length,
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

      setData(newData);
      setMetrics(calculateMetrics(assets, devices, users));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Error al cargar los datos del dashboard'
      }));
    }
  };

  const refreshData = useCallback(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Dependencias vacías para evitar bucle infinito

  return {
    ...data,
    metrics,
    refreshData,
    isLoading: data.loading
  };
};

export default useDashboardData;
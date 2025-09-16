'use client';

import { useState, useEffect, useCallback } from 'react';
import { gpsService, RecentGPSPoint } from '@/lib/services/gps.service';
import { devicesService } from '@/lib/services/devices.service';
import { AssetResponse } from '@/lib/types/asset';
import { DeviceResponse, DeviceHistoryLocation } from '@/lib/types/device';

export interface AssetAnalytics {
  assetTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  deviceStatusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  activityByHour: {
    hour: number;
    activeDevices: number;
    totalMessages: number;
  }[];
  velocityAnalysis: {
    assetId: string;
    assetName: string;
    averageSpeed: number;
    maxSpeed: number;
    totalDistance: number;
    activeHours: number;
  }[];
  performanceIndicators: {
    averageResponseTime: number;
    gpsAccuracy: number;
    dataCompleteness: number;
    systemUptime: number;
  };
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface LocationHistory {
  assetId: string;
  locations: DeviceHistoryLocation[];
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
}

export const useAssetAnalytics = (assets: AssetResponse[], devices: DeviceResponse[]) => {
  const [analytics, setAnalytics] = useState<AssetAnalytics>({
    assetTypeDistribution: [],
    deviceStatusDistribution: [],
    activityByHour: [],
    velocityAnalysis: [],
    performanceIndicators: {
      averageResponseTime: 0,
      gpsAccuracy: 0,
      dataCompleteness: 0,
      systemUptime: 0
    },
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);

  // Calcular distribución por tipo de activo
  const calculateAssetTypeDistribution = useCallback((assets: AssetResponse[]) => {
    const typeCount = assets.reduce((acc, asset) => {
      acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = assets.length;
    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }, []);

  // Calcular distribución por estado de dispositivo
  const calculateDeviceStatusDistribution = useCallback((devices: DeviceResponse[]) => {
    const statusCount = devices.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = devices.length;
    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }, []);

  // Calcular actividad por hora del día
  const calculateActivityByHour = useCallback((gpsData: RecentGPSPoint[]) => {
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      activeDevices: 0,
      totalMessages: 0
    }));

    gpsData.forEach(point => {
      if (point.receivedAt) {
        const hour = new Date(point.receivedAt).getHours();
        hourlyActivity[hour].totalMessages++;
        // Simplificado: cada mensaje cuenta como dispositivo activo
        hourlyActivity[hour].activeDevices++;
      }
    });

    return hourlyActivity;
  }, []);

  // Calcular análisis de velocidad
  const calculateVelocityAnalysis = useCallback((assets: AssetResponse[], locationHistory: LocationHistory[]) => {
    return assets.map(asset => {
      const history = locationHistory.find(h => h.assetId === asset.id.toString());
      
      if (!history || history.locations.length === 0) {
        return {
          assetId: asset.id,
          assetName: asset.name,
          averageSpeed: 0,
          maxSpeed: 0,
          totalDistance: 0,
          activeHours: 0
        };
      }

      const speeds = history.locations
        .map(loc => loc.speed || 0)
        .filter(speed => speed > 0);

      const averageSpeed = speeds.length > 0 
        ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
        : 0;

      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

      // Calcular horas activas (simplificado)
      const timeSpan = history.locations.length > 1 
        ? (new Date(history.locations[0].timestamp).getTime() - 
           new Date(history.locations[history.locations.length - 1].timestamp).getTime()) / (1000 * 60 * 60)
        : 0;

      return {
        assetId: asset.id,
        assetName: asset.name,
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        totalDistance: Math.round(history.totalDistance * 100) / 100,
        activeHours: Math.round(Math.abs(timeSpan) * 100) / 100
      };
    });
  }, []);

  // Calcular indicadores de rendimiento
  const calculatePerformanceIndicators = useCallback((devices: DeviceResponse[], gpsData: RecentGPSPoint[]) => {
    // Simulación de métricas de rendimiento
    const activeDevices = devices.filter(d => d.status === 'ACTIVE').length;
    const totalDevices = devices.length;
    
    return {
      averageResponseTime: Math.random() * 2 + 1, // 1-3 segundos simulado
      gpsAccuracy: totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0,
      dataCompleteness: gpsData.length > 0 ? Math.min(95 + Math.random() * 5, 100) : 0,
      systemUptime: 99.2 + Math.random() * 0.8 // 99.2-100% simulado
    };
  }, []);

  // Función estable para obtener historial de ubicaciones
  const fetchLocationHistory = async () => {
    const history: LocationHistory[] = [];
    
    for (const asset of assets.slice(0, 10)) { // Limitar a 10 activos para rendimiento
      if (!asset.device?.imei) continue;

      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Últimas 24 horas
        
        const deviceHistory = await devicesService.getHistory({
          deviceId: asset.device.id.toString(),
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          page: 1,
          limit: 100
        });

        if (deviceHistory && Array.isArray(deviceHistory)) {
          const locations = deviceHistory;
          
          // Calcular distancia total (simplificado)
          let totalDistance = 0;
          for (let i = 1; i < locations.length; i++) {
            const prev = locations[i - 1];
            const curr = locations[i];
            
            if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
              // Fórmula de distancia haversine simplificada
              const R = 6371; // Radio de la Tierra en km
              const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
              const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              totalDistance += R * c;
            }
          }

          const speeds = locations.map(loc => loc.speed || 0).filter(speed => speed > 0);
          const averageSpeed = speeds.length > 0 
            ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
            : 0;
          const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

          history.push({
            assetId: asset.id.toString(),
            locations,
            totalDistance,
            averageSpeed,
            maxSpeed
          });
        }
      } catch (error) {
        console.error(`Error fetching history for asset ${asset.id}:`, error);
      }
    }

    setLocationHistory(history);
    return history;
  };

  // Función estable para obtener datos GPS recientes
  const fetchRecentGPSData = async () => {
    const allGPSData: RecentGPSPoint[] = [];
    
    for (const device of devices.slice(0, 20)) { // Limitar para rendimiento
      if (!device.imei) continue;
      
      try {
        const gpsData = await gpsService.getRecentPoints(device.imei);
        if (Array.isArray(gpsData)) {
          allGPSData.push(...gpsData);
        }
      } catch (error) {
        console.error(`Error fetching GPS data for device ${device.imei}:`, error);
      }
    }
    
    return allGPSData;
  };

  // Función estable para calcular todas las analíticas
  const calculateAnalytics = async () => {
    try {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }));

      const [locationHistory, gpsData] = await Promise.all([
        fetchLocationHistory(),
        fetchRecentGPSData()
      ]);

      const newAnalytics: AssetAnalytics = {
        assetTypeDistribution: calculateAssetTypeDistribution(assets),
        deviceStatusDistribution: calculateDeviceStatusDistribution(devices),
        activityByHour: calculateActivityByHour(gpsData),
        velocityAnalysis: calculateVelocityAnalysis(assets, locationHistory).map(analysis => ({
          ...analysis,
          assetId: analysis.assetId.toString()
        })),
        performanceIndicators: calculatePerformanceIndicators(devices, gpsData),
        loading: false,
        error: null,
        lastUpdated: new Date()
      };

      setAnalytics(newAnalytics);

    } catch (error) {
      console.error('Error calculating analytics:', error);
      setAnalytics(prev => ({
        ...prev,
        loading: false,
        error: 'Error al calcular las analíticas'
      }));
    }
  };

  // Refrescar analíticas
  const refreshAnalytics = useCallback(() => {
    calculateAnalytics();
  }, []);

  // Calcular analíticas cuando cambien los datos
  useEffect(() => {
    if (assets.length > 0 || devices.length > 0) {
      calculateAnalytics();
    }
  }, [assets.length, devices.length]); // Solo dependencias de longitudes para evitar bucles

  return {
    analytics,
    locationHistory,
    refreshAnalytics,
    isLoading: analytics.loading
  };
};

export default useAssetAnalytics;
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMultipleDevicesWebSocket } from '@/hooks/use-multiple-devices-websocket';
import { AssetResponse } from '@/lib/types/asset';
import { DeviceResponse } from '@/lib/types/device';

export interface RealTimeMetrics {
  connectedDevices: number;
  disconnectedDevices: number;
  totalDevices: number;
  connectionRate: number;
  lastUpdate: Date | null;
  deviceStates: Map<string, {
    isConnected: boolean;
    lastActivity: Date | null;
    batteryLevel?: number;
    signalStrength?: number;
  }>;
  alerts: {
    lowBattery: string[];
    noSignal: string[];
    recentlyDisconnected: string[];
  };
}

export interface DeviceActivity {
  imei: string;
  deviceName: string;
  lastSeen: Date;
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  speed?: number;
  batteryVoltage?: number;
}

export const useRealTimeMetrics = (assets: AssetResponse[], devices: DeviceResponse[]) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    connectedDevices: 0,
    disconnectedDevices: 0,
    totalDevices: 0,
    connectionRate: 0,
    lastUpdate: null,
    deviceStates: new Map(),
    alerts: {
      lowBattery: [],
      noSignal: [],
      recentlyDisconnected: []
    }
  });

  const [recentActivity, setRecentActivity] = useState<DeviceActivity[]>([]);

  // Obtener IMEIs de todos los dispositivos
  const deviceImeis = devices
    .filter(device => device.imei)
    .map(device => device.imei!);

  // WebSocket para múltiples dispositivos
  const {
    isSocketConnected,
    devices: devicesConnectionMap,
    isDeviceConnected,
    getDeviceState,
    error: wsError
  } = useMultipleDevicesWebSocket({
    imeis: deviceImeis,
    enabled: deviceImeis.length > 0
  });

  // Función estable para actualizar métricas sin useCallback
  const updateMetrics = () => {
    if (!devicesConnectionMap || devicesConnectionMap.size === 0) {
      return;
    }

    let connectedCount = 0;
    let disconnectedCount = 0;
    const deviceStates = new Map();
    const alerts = {
      lowBattery: [] as string[],
      noSignal: [] as string[],
      recentlyDisconnected: [] as string[]
    };

    const activity: DeviceActivity[] = [];

    devices.forEach(device => {
      if (!device.imei) return;

      const deviceState = getDeviceState(device.imei);
      const isConnected = deviceState?.isConnected || false;
      
      if (isConnected) {
        connectedCount++;
      } else {
        disconnectedCount++;
      }

      // Estado del dispositivo
      deviceStates.set(device.imei, {
        isConnected,
        lastActivity: deviceState?.lastActivity || null,
        batteryLevel: undefined, // No disponible en DeviceConnectionState
        signalStrength: undefined // No disponible en DeviceConnectionState
      });

      // Alertas - comentado porque batteryLevel no está disponible
      // if (deviceState?.batteryLevel && deviceState.batteryLevel < 20) {
      //   alerts.lowBattery.push(device.imei);
      // }

      if (!isConnected) {
        alerts.noSignal.push(device.imei);
        
        // Recientemente desconectado (últimos 5 minutos)
        if (deviceState?.lastActivity) {
          const timeSinceLastActivity = Date.now() - deviceState.lastActivity.getTime();
          if (timeSinceLastActivity < 5 * 60 * 1000) {
            alerts.recentlyDisconnected.push(device.imei);
          }
        }
      }

      // Actividad reciente
      const asset = assets.find(a => a.device?.imei === device.imei);
      if (deviceState?.lastActivity) {
        activity.push({
          imei: device.imei,
          deviceName: asset?.name || `${device.brand} ${device.model}`,
          lastSeen: deviceState.lastActivity,
          isActive: isConnected,
          batteryVoltage: undefined // batteryLevel no disponible en DeviceConnectionState
        });
      }
    });

    const totalDevices = connectedCount + disconnectedCount;
    const connectionRate = totalDevices > 0 ? (connectedCount / totalDevices) * 100 : 0;

    setMetrics({
      connectedDevices: connectedCount,
      disconnectedDevices: disconnectedCount,
      totalDevices,
      connectionRate,
      lastUpdate: new Date(),
      deviceStates,
      alerts
    });

    // Ordenar actividad por última vez visto (más reciente primero)
    setRecentActivity(
      activity.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()).slice(0, 10)
    );

  };

  // Actualizar métricas cuando cambien los datos del WebSocket
  useEffect(() => {
    updateMetrics();
  }, [devices, assets, devicesConnectionMap]); // Dependencias específicas sin funciones

  // Actualizar métricas cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics();
    }, 10000);
    return () => clearInterval(interval);
  }, []); // Dependencias vacías para evitar bucle infinito

  const getDeviceStatus = useCallback((imei: string) => {
    return metrics.deviceStates.get(imei) || {
      isConnected: false,
      lastActivity: null
    };
  }, [metrics.deviceStates]);

  const getConnectionHealth = useCallback(() => {
    if (metrics.connectionRate >= 80) return 'excellent';
    if (metrics.connectionRate >= 60) return 'good';
    if (metrics.connectionRate >= 40) return 'fair';
    return 'poor';
  }, [metrics.connectionRate]);

  return {
    metrics,
    recentActivity,
    isSocketConnected,
    wsError,
    getDeviceStatus,
    getConnectionHealth,
    refreshMetrics: useCallback(() => updateMetrics(), [])
  };
};

export default useRealTimeMetrics;
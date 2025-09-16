'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Navigation, 
  Wifi, 
  WifiOff, 
  Battery, 
  Clock,
  RefreshCw,
  Maximize2,
  Filter
} from 'lucide-react';
import { AssetResponse } from '@/lib/types/asset';
import { DeviceResponse } from '@/lib/types/device';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';
import { gpsService } from '@/lib/services/gps.service';

// Definición local de tipos GPS
interface RecentGPSPoint {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  timestamp: string;
  receivedAt: string;
}

interface RealTimeMapProps {
  assets: AssetResponse[];
  devices: DeviceResponse[];
  realTimeMetrics: RealTimeMetrics;
  className?: string;
}

interface DeviceLocation {
  imei: string;
  assetId: string;
  assetName: string;
  assetType: string;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  timestamp: Date;
  isConnected: boolean;
  batteryLevel?: number;
  address?: string;
}

interface MapFilters {
  showConnected: boolean;
  showDisconnected: boolean;
  assetTypes: string[];
  showLowBattery: boolean;
}

const RealTimeMap: React.FC<RealTimeMapProps> = ({
  assets,
  devices,
  realTimeMetrics,
  className = ''
}) => {
  const [deviceLocations, setDeviceLocations] = useState<DeviceLocation[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    showConnected: true,
    showDisconnected: true,
    assetTypes: [],
    showLowBattery: false
  });

  // Obtener ubicaciones de dispositivos
  const fetchDeviceLocations = useCallback(async () => {
    try {
      setLoading(true);
      const locations: DeviceLocation[] = [];

      for (const asset of assets) {
        if (!asset.device?.imei) continue;

        try {
          const gpsPoints = await gpsService.getRecentPoints(asset.device.imei);
          
          if (gpsPoints && gpsPoints.length > 0) {
            const latestPoint = gpsPoints[0];
            
            if (latestPoint.latitude && latestPoint.longitude) {
              const deviceState = realTimeMetrics.deviceStates.get(asset.device.imei);
              
              locations.push({
                imei: asset.device.imei,
                assetId: asset.id.toString(),
                assetName: asset.name,
                assetType: asset.assetType,
                latitude: latestPoint.latitude,
                longitude: latestPoint.longitude,
                speed: latestPoint.speed,
                course: latestPoint.course,
                timestamp: new Date(latestPoint.timestamp),
                isConnected: deviceState?.isConnected || false,
                batteryLevel: deviceState?.batteryLevel,
                // address: 'Ubicación no disponible' // Removido por ahora
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching GPS for asset ${asset.id}:`, error);
        }
      }

      setDeviceLocations(locations);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching device locations:', error);
    } finally {
      setLoading(false);
    }
  }, [assets, realTimeMetrics.deviceStates]);

  // Filtrar ubicaciones según los filtros activos
  const filteredLocations = deviceLocations.filter(location => {
    if (!filters.showConnected && location.isConnected) return false;
    if (!filters.showDisconnected && !location.isConnected) return false;
    if (filters.assetTypes.length > 0 && !filters.assetTypes.includes(location.assetType)) return false;
    if (filters.showLowBattery && (!location.batteryLevel || location.batteryLevel >= 20)) return false;
    return true;
  });

  // Obtener color del marcador según el estado
  const getMarkerColor = (location: DeviceLocation) => {
    if (!location.isConnected) return 'bg-red-500';
    if (location.batteryLevel && location.batteryLevel < 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Obtener icono del tipo de activo
  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'HEAVY_LOAD':
      case 'MEDIUM_LOAD':
      case 'LIGHT_LOAD':
        return '🚛';
      case 'PASSENGER':
        return '🚗';
      case 'CARGO':
        return '📦';
      default:
        return '📍';
    }
  };

  // Formatear velocidad
  const formatSpeed = (speed?: number) => {
    if (!speed) return '0 km/h';
    return `${Math.round(speed)} km/h`;
  };

  // Formatear tiempo transcurrido
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  // Actualizar ubicaciones automáticamente
  useEffect(() => {
    fetchDeviceLocations();
    
    const interval = setInterval(fetchDeviceLocations, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [fetchDeviceLocations]);

  // Obtener tipos de activos únicos para filtros
  const uniqueAssetTypes = [...new Set(assets.map(asset => asset.assetType))];

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa en Tiempo Real
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredLocations.length} de {deviceLocations.length} dispositivos mostrados
            {lastUpdate && (
              <span className="ml-2">
                • Actualizado {formatTimeAgo(lastUpdate)}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeviceLocations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filtros */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
            
            <Button
              variant={filters.showConnected ? "outline" : "ghost"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, showConnected: !prev.showConnected }))}
              className={filters.showConnected ? 'bg-primary text-primary-foreground' : ''}
            >
              <Wifi className="h-3 w-3 mr-1" />
              Conectados ({realTimeMetrics.connectedDevices})
            </Button>
            
            <Button
              variant={filters.showDisconnected ? "outline" : "ghost"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, showDisconnected: !prev.showDisconnected }))}
              className={filters.showDisconnected ? 'bg-primary text-primary-foreground' : ''}
            >
              <WifiOff className="h-3 w-3 mr-1" />
              Desconectados ({realTimeMetrics.disconnectedDevices})
            </Button>
            
            <Button
              variant={filters.showLowBattery ? "outline" : "ghost"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, showLowBattery: !prev.showLowBattery }))}
              className={filters.showLowBattery ? 'bg-primary text-primary-foreground' : ''}
            >
              <Battery className="h-3 w-3 mr-1" />
              Batería Baja
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {uniqueAssetTypes.map(type => (
              <Button
                key={type}
                variant={filters.assetTypes.includes(type) ? "outline" : "ghost"}
                size="sm"
                onClick={() => {
                  setFilters(prev => ({
                    ...prev,
                    assetTypes: prev.assetTypes.includes(type)
                      ? prev.assetTypes.filter(t => t !== type)
                      : [...prev.assetTypes, type]
                  }));
                }}
                className={filters.assetTypes.includes(type) ? 'bg-primary text-primary-foreground' : ''}
              >
                {getAssetTypeIcon(type)} {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Mapa simulado con lista de dispositivos */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Panel de dispositivos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              Dispositivos Activos
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando ubicaciones...</span>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay dispositivos que mostrar con los filtros actuales
              </div>
            ) : (
              filteredLocations.map(location => (
                <div
                  key={location.imei}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedDevice?.imei === location.imei ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedDevice(location)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getMarkerColor(location)}`} />
                      <div>
                        <div className="font-medium text-sm">{location.assetName}</div>
                        <div className="text-xs text-muted-foreground">
                          {getAssetTypeIcon(location.assetType)} {location.assetType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={location.isConnected ? "outline" : "outline"} className={`text-xs ${location.isConnected ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}>
                        {location.isConnected ? (
                          <><Wifi className="h-3 w-3 mr-1" />Online</>
                        ) : (
                          <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                        )}
                      </Badge>
                      
                      {location.batteryLevel && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${location.batteryLevel < 20 ? 'border-red-500 text-red-600' : 'border-green-500 text-green-600'}`}
                        >
                          <Battery className="h-3 w-3 mr-1" />
                          {location.batteryLevel}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {formatSpeed(location.speed)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(location.timestamp)}
                      </span>
                    </div>
                    
                    {location.address && (
                      <div className="mt-1 truncate">
                        📍 {location.address}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Panel de detalles del dispositivo seleccionado */}
          <div className="border rounded-lg p-4">
            {selectedDevice ? (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  {getAssetTypeIcon(selectedDevice.assetType)}
                  {selectedDevice.assetName}
                </h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getMarkerColor(selectedDevice)}`} />
                        {selectedDevice.isConnected ? 'Conectado' : 'Desconectado'}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Velocidad:</span>
                      <div className="mt-1 font-medium">
                        {formatSpeed(selectedDevice.speed)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Batería:</span>
                      <div className="mt-1 font-medium">
                        {selectedDevice.batteryLevel ? `${selectedDevice.batteryLevel}%` : 'N/A'}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Última actualización:</span>
                      <div className="mt-1 font-medium">
                        {formatTimeAgo(selectedDevice.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground text-sm">Coordenadas:</span>
                    <div className="mt-1 font-mono text-sm">
                      {selectedDevice.latitude.toFixed(6)}, {selectedDevice.longitude.toFixed(6)}
                    </div>
                  </div>
                  
                  {selectedDevice.address && (
                    <div>
                      <span className="text-muted-foreground text-sm">Dirección:</span>
                      <div className="mt-1 text-sm">
                        {selectedDevice.address}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">IMEI:</span>
                    <div className="mt-1 font-mono text-sm">
                      {selectedDevice.imei}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Selecciona un dispositivo para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeMap;
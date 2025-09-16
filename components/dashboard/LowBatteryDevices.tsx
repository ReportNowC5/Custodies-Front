'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Battery, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Bell
} from 'lucide-react';
import { AssetResponse } from '@/lib/types/asset';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';

interface LowBatteryDevicesProps {
  assets: AssetResponse[];
  realTimeMetrics: RealTimeMetrics;
  onRefresh?: () => void;
  className?: string;
}

interface LowBatteryDevice {
  assetId: string;
  assetName: string;
  assetType: string;
  imei: string;
  batteryLevel: number;
  isConnected: boolean;
  lastActivity?: Date | null;
  criticalLevel: 'critical' | 'low' | 'warning';
}

const LowBatteryDevices: React.FC<LowBatteryDevicesProps> = ({
  assets,
  realTimeMetrics,
  onRefresh,
  className = ''
}) => {
  // Filtrar dispositivos con batería baja
  const lowBatteryDevices: LowBatteryDevice[] = assets
    .filter(asset => {
      if (!asset.device?.imei) return false;
      const deviceState = realTimeMetrics.deviceStates.get(asset.device.imei);
      return deviceState?.batteryLevel && deviceState.batteryLevel < 30; // Mostrar dispositivos con menos del 30%
    })
    .map(asset => {
      const deviceState = realTimeMetrics.deviceStates.get(asset.device!.imei!)!;
      const batteryLevel = deviceState.batteryLevel!;
      
      return {
        assetId: asset.id.toString(),
        assetName: asset.name,
        assetType: asset.assetType,
        imei: asset.device!.imei!,
        batteryLevel,
        isConnected: deviceState.isConnected,
        lastActivity: deviceState.lastActivity,
        criticalLevel: (batteryLevel < 10 ? 'critical' : batteryLevel < 20 ? 'low' : 'warning') as 'critical' | 'low' | 'warning'
      };
    })
    .sort((a, b) => a.batteryLevel - b.batteryLevel); // Ordenar por nivel de batería (más críticos primero)

  // Estadísticas
  const criticalDevices = lowBatteryDevices.filter(d => d.criticalLevel === 'critical').length;
  const lowDevices = lowBatteryDevices.filter(d => d.criticalLevel === 'low').length;
  const warningDevices = lowBatteryDevices.filter(d => d.criticalLevel === 'warning').length;
  const connectedLowBattery = lowBatteryDevices.filter(d => d.isConnected).length;

  // Función para obtener color según el nivel de batería
  const getBatteryColor = (level: number) => {
    if (level < 10) return 'text-red-600';
    if (level < 20) return 'text-orange-600';
    return 'text-yellow-600';
  };

  // Función para obtener color de fondo según el nivel
  const getBatteryBgColor = (level: number) => {
    if (level < 10) return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    if (level < 20) return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
    return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
  };

  // Función para obtener icono del tipo de activo
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

  // Función para formatear tiempo transcurrido
  const formatTimeAgo = (timestamp?: Date | null) => {
    if (!timestamp) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5 text-yellow-600" />
          Dispositivos con Batería Baja
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{lowBatteryDevices.length} dispositivos requieren atención</span>
            {criticalDevices > 0 && (
              <Badge variant="outline" className="border-red-500 text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalDevices} críticos
              </Badge>
            )}
          </div>
          
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {lowBatteryDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Battery className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-center">
              ¡Excelente! No hay dispositivos con batería baja
            </p>
            <p className="text-sm text-center mt-1">
              Todos los dispositivos tienen más del 30% de batería
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen de alertas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600">{criticalDevices}</div>
                <div className="text-xs text-muted-foreground">Críticos (&lt;10%)</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600">{lowDevices}</div>
                <div className="text-xs text-muted-foreground">Bajos (10-20%)</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600">{warningDevices}</div>
                <div className="text-xs text-muted-foreground">Advertencia (20-30%)</div>
              </div>
            </div>
            
            {/* Lista de dispositivos */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Dispositivos Ordenados por Prioridad
              </h4>
              
              {lowBatteryDevices.map((device) => (
                <div 
                  key={device.imei}
                  className={`p-4 rounded-lg border ${getBatteryBgColor(device.batteryLevel)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icono y info básica */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getAssetTypeIcon(device.assetType)}</span>
                        <div className="flex items-center gap-1">
                          {device.criticalLevel === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                          )}
                          {device.criticalLevel === 'low' && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Información del activo */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{device.assetName}</h5>
                          <Badge variant="outline" className="text-xs">
                            {device.assetType.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          IMEI: {device.imei}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          {/* Estado de conexión */}
                          <div className="flex items-center gap-1">
                            {device.isConnected ? (
                              <><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-600">Online</span></>
                            ) : (
                              <><WifiOff className="h-3 w-3 text-red-500" /><span className="text-red-600">Offline</span></>
                            )}
                          </div>
                          
                          {/* Última actividad */}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(device.lastActivity)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Nivel de batería */}
                    <div className="text-right min-w-24">
                      <div className={`text-2xl font-bold ${getBatteryColor(device.batteryLevel)}`}>
                        {device.batteryLevel}%
                      </div>
                      
                      <div className="mt-2">
                        <Progress 
                          value={device.batteryLevel} 
                          className="h-2 w-20"
                        />
                      </div>
                      
                      <div className="mt-1">
                        <Badge 
                          variant={device.criticalLevel === 'critical' ? "outline" : "soft"}
                          className={`text-xs ${device.criticalLevel === 'critical' ? 'border-red-500 text-red-600' : ''}`}
                        >
                          {device.criticalLevel === 'critical' ? 'Crítico' :
                           device.criticalLevel === 'low' ? 'Bajo' : 'Advertencia'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones recomendadas */}
                  {device.criticalLevel === 'critical' && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900 rounded text-xs">
                      <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                        <Bell className="h-3 w-3" />
                        <strong>Acción requerida:</strong> Batería crítica. Recargar inmediatamente.
                      </div>
                    </div>
                  )}
                  
                  {device.criticalLevel === 'low' && (
                    <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900 rounded text-xs">
                      <div className="flex items-center gap-1 text-orange-700 dark:text-orange-300">
                        <Bell className="h-3 w-3" />
                        <strong>Recomendación:</strong> Programar recarga pronto.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Estadísticas adicionales */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{lowBatteryDevices.length}</div>
                  <div className="text-xs text-muted-foreground">Total con batería baja</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-green-600">{connectedLowBattery}</div>
                  <div className="text-xs text-muted-foreground">Conectados</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-red-600">{criticalDevices}</div>
                  <div className="text-xs text-muted-foreground">Críticos</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold">
                    {lowBatteryDevices.length > 0 ? 
                      (lowBatteryDevices.reduce((sum, d) => sum + d.batteryLevel, 0) / lowBatteryDevices.length).toFixed(1) : 
                      '0'
                    }%
                  </div>
                  <div className="text-xs text-muted-foreground">Promedio</div>
                </div>
              </div>
            </div>
            
            {/* Recomendaciones */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Battery className="h-4 w-4" />
                Recomendaciones de Mantenimiento
              </h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {criticalDevices > 0 && (
                  <div>• <strong>{criticalDevices} dispositivos</strong> requieren recarga inmediata (&lt;10%)</div>
                )}
                {lowDevices > 0 && (
                  <div>• <strong>{lowDevices} dispositivos</strong> necesitan recarga pronto (10-20%)</div>
                )}
                {warningDevices > 0 && (
                  <div>• <strong>{warningDevices} dispositivos</strong> en estado de advertencia (20-30%)</div>
                )}
                <div>• Revisar patrones de uso para optimizar el consumo de batería</div>
                <div>• Considerar programar mantenimiento preventivo para dispositivos frecuentemente bajos</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Última actualización */}
        {realTimeMetrics.lastUpdate && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Última actualización: {realTimeMetrics.lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LowBatteryDevices;
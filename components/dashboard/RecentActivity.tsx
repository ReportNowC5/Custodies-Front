'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  MapPin, 
  Navigation, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { RealTimeMetrics, DeviceActivity } from '@/hooks/use-realtime-metrics';
import { AssetResponse } from '@/lib/types/asset';

interface RecentActivityProps {
  assets: AssetResponse[];
  realTimeMetrics: RealTimeMetrics;
  recentActivity: DeviceActivity[];
  onRefresh?: () => void;
  className?: string;
}

type ActivityFilter = 'all' | 'active' | 'inactive' | 'recent';
type ActivitySort = 'time' | 'name' | 'speed';

const RecentActivity: React.FC<RecentActivityProps> = ({
  assets,
  realTimeMetrics,
  recentActivity,
  onRefresh,
  className = ''
}) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [sortBy, setSortBy] = useState<ActivitySort>('time');
  const [showDetails, setShowDetails] = useState(false);

  // Filtrar actividades
  const filteredActivity = recentActivity.filter(activity => {
    switch (filter) {
      case 'active':
        return activity.isActive;
      case 'inactive':
        return !activity.isActive;
      case 'recent':
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return activity.lastSeen > fiveMinutesAgo;
      default:
        return true;
    }
  });

  // Ordenar actividades
  const sortedActivity = [...filteredActivity].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.deviceName.localeCompare(b.deviceName);
      case 'speed':
        return (b.speed || 0) - (a.speed || 0);
      case 'time':
      default:
        return b.lastSeen.getTime() - a.lastSeen.getTime();
    }
  });

  // Estadísticas
  const activeDevices = recentActivity.filter(a => a.isActive).length;
  const inactiveDevices = recentActivity.filter(a => !a.isActive).length;
  const recentDevices = recentActivity.filter(a => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return a.lastSeen > fiveMinutesAgo;
  }).length;

  // Función para formatear tiempo transcurrido
  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  // Función para obtener icono del tipo de activo
  const getAssetTypeIcon = (deviceName: string) => {
    // Buscar el activo correspondiente
    const asset = assets.find(a => a.name === deviceName || a.device?.imei === deviceName);
    if (!asset) return '📍';
    
    switch (asset.assetType) {
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

  // Función para obtener tendencia de actividad
  const getActivityTrend = (activity: DeviceActivity) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isRecent = activity.lastSeen > fiveMinutesAgo;
    
    if (activity.isActive && isRecent) {
      return { icon: <TrendingUp className="h-3 w-3 text-green-500" />, label: 'Activo reciente' };
    } else if (activity.isActive) {
      return { icon: <Minus className="h-3 w-3 text-blue-500" />, label: 'Activo' };
    } else {
      return { icon: <TrendingDown className="h-3 w-3 text-red-500" />, label: 'Inactivo' };
    }
  };

  // Función para obtener color de velocidad
  const getSpeedColor = (speed?: number) => {
    if (!speed || speed === 0) return 'text-muted-foreground';
    if (speed < 20) return 'text-green-600';
    if (speed < 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{sortedActivity.length} eventos de actividad</span>
            <Badge variant="outline">
              {activeDevices} activos
            </Badge>
            {recentDevices > 0 && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                {recentDevices} recientes
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
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-center">
              No hay actividad reciente registrada
            </p>
            <p className="text-sm text-center mt-1">
              Los eventos de actividad aparecerán aquí cuando los dispositivos estén activos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controles de filtro */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros:</span>
              
              <Button
                variant={filter === 'all' ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
              >
                Todos ({recentActivity.length})
              </Button>
              
              <Button
                variant={filter === 'active' ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFilter('active')}
                className={filter === 'active' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Wifi className="h-3 w-3 mr-1" />
                Activos ({activeDevices})
              </Button>
              
              <Button
                variant={filter === 'inactive' ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFilter('inactive')}
                className={filter === 'inactive' ? 'bg-primary text-primary-foreground' : ''}
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Inactivos ({inactiveDevices})
              </Button>
              
              <Button
                variant={filter === 'recent' ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFilter('recent')}
                className={filter === 'recent' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Clock className="h-3 w-3 mr-1" />
                Recientes ({recentDevices})
              </Button>
              
              <div className="flex items-center gap-1 ml-4">
                <span className="text-sm">Ordenar:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as ActivitySort)}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value="time">Por tiempo</option>
                  <option value="name">Por nombre</option>
                  <option value="speed">Por velocidad</option>
                </select>
              </div>
              
              <Button
                variant={showDetails ? "outline" : "ghost"}
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className={showDetails ? 'bg-primary text-primary-foreground' : ''}
              >
                {showDetails ? 'Menos detalles' : 'Más detalles'}
              </Button>
            </div>
            
            {/* Resumen rápido */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600">{activeDevices}</div>
                <div className="text-xs text-muted-foreground">Dispositivos Activos</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600">{recentDevices}</div>
                <div className="text-xs text-muted-foreground">Actividad Reciente</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                <div className="text-2xl font-bold text-gray-600">{inactiveDevices}</div>
                <div className="text-xs text-muted-foreground">Inactivos</div>
              </div>
            </div>
            
            {/* Lista de actividad */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Eventos de Actividad ({sortedActivity.length})
              </h4>
              
              {sortedActivity.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No hay eventos que coincidan con los filtros seleccionados
                </div>
              ) : (
                sortedActivity.map((activity, index) => {
                  const trend = getActivityTrend(activity);
                  
                  return (
                    <div 
                      key={`${activity.imei}-${index}`}
                      className={`p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                        activity.isActive ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' : 
                        'border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icono y tendencia */}
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{getAssetTypeIcon(activity.deviceName)}</span>
                            {trend.icon}
                          </div>
                          
                          {/* Información del dispositivo */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium">{activity.deviceName}</h5>
                              <Badge 
                                variant={activity.isActive ? "outline" : "soft"}
                                className={`text-xs ${activity.isActive ? 'border-green-500 text-green-600' : ''}`}
                              >
                                {activity.isActive ? (
                                  <><Wifi className="h-3 w-3 mr-1" />Online</>
                                ) : (
                                  <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                                )}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mb-2">
                              IMEI: {activity.imei}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs">
                              {/* Tiempo */}
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(activity.lastSeen)}</span>
                              </div>
                              
                              {/* Velocidad */}
                              {activity.speed !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Navigation className="h-3 w-3" />
                                  <span className={getSpeedColor(activity.speed)}>
                                    {Math.round(activity.speed)} km/h
                                  </span>
                                </div>
                              )}
                              
                              {/* Ubicación */}
                              {activity.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-32">
                                    {activity.location.latitude.toFixed(4)}, {activity.location.longitude.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              
                              {/* Batería */}
                              {activity.batteryVoltage && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">🔋</span>
                                  <span>{activity.batteryVoltage}%</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Detalles adicionales */}
                            {showDetails && (
                              <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-muted-foreground">Estado:</span>
                                    <span className="ml-1">{trend.label}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Última vez visto:</span>
                                    <span className="ml-1">{activity.lastSeen.toLocaleTimeString()}</span>
                                  </div>
                                  {activity.location && (
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Coordenadas:</span>
                                      <span className="ml-1 font-mono">
                                        {activity.location.latitude.toFixed(6)}, {activity.location.longitude.toFixed(6)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Indicador de tiempo */}
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{activity.lastSeen.toLocaleTimeString()}</div>
                          <div className="mt-1">
                            {formatTimeAgo(activity.lastSeen)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Estadísticas adicionales */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{recentActivity.length}</div>
                  <div className="text-xs text-muted-foreground">Total eventos</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-green-600">{activeDevices}</div>
                  <div className="text-xs text-muted-foreground">Activos</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold text-blue-600">{recentDevices}</div>
                  <div className="text-xs text-muted-foreground">Últimos 5min</div>
                </div>
                
                <div>
                  <div className="text-lg font-bold">
                    {recentActivity.length > 0 ? 
                      ((activeDevices / recentActivity.length) * 100).toFixed(0) : 
                      '0'
                    }%
                  </div>
                  <div className="text-xs text-muted-foreground">Tasa actividad</div>
                </div>
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

export default RecentActivity;
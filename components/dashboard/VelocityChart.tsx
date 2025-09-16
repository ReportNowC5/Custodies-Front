'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Gauge, TrendingUp, Filter, Navigation, Clock } from 'lucide-react';
import { AssetAnalytics } from '@/hooks/use-asset-analytics';

interface VelocityChartProps {
  analytics: AssetAnalytics;
  className?: string;
}

type ChartType = 'bar' | 'scatter';
type SortBy = 'name' | 'averageSpeed' | 'maxSpeed' | 'totalDistance' | 'activeHours';

const VelocityChart: React.FC<VelocityChartProps> = React.memo(({ 
  analytics,
  className = ''
}) => {
  const { velocityAnalysis, loading } = analytics;
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [sortBy, setSortBy] = useState<SortBy>('averageSpeed');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // Memoizar datos filtrados y ordenados
  const filteredData = useMemo(() => {
    return velocityAnalysis
      .filter(item => !showOnlyActive || item.averageSpeed > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.assetName.localeCompare(b.assetName);
          case 'averageSpeed':
            return b.averageSpeed - a.averageSpeed;
          case 'maxSpeed':
            return b.maxSpeed - a.maxSpeed;
          case 'totalDistance':
            return b.totalDistance - a.totalDistance;
          case 'activeHours':
            return b.activeHours - a.activeHours;
          default:
            return 0;
        }
      })
      .slice(0, 20); // Mostrar solo los primeros 20 para mejor visualización
  }, [velocityAnalysis, showOnlyActive, sortBy]);

  // Memoizar estadísticas calculadas
  const statistics = useMemo(() => {
    const totalAssets = velocityAnalysis.length;
    const activeAssets = velocityAnalysis.filter(item => item.averageSpeed > 0).length;
    const averageSpeed = velocityAnalysis.length > 0 ? velocityAnalysis.reduce((sum, item) => sum + item.averageSpeed, 0) / Math.max(totalAssets, 1) : 0;
    const maxSpeedOverall = velocityAnalysis.length > 0 ? Math.max(...velocityAnalysis.map(item => item.maxSpeed)) : 0;
    const totalDistanceOverall = velocityAnalysis.length > 0 ? velocityAnalysis.reduce((sum, item) => sum + item.totalDistance, 0) : 0;
    
    const fastestAsset = velocityAnalysis.length > 0 ? velocityAnalysis.reduce((prev, current) => 
      prev.maxSpeed > current.maxSpeed ? prev : current
    ) : null;
    
    const mostActiveAsset = velocityAnalysis.length > 0 ? velocityAnalysis.reduce((prev, current) => 
      prev.totalDistance > current.totalDistance ? prev : current
    ) : null;

    return {
      totalAssets,
      activeAssets,
      averageSpeed,
      maxSpeedOverall,
      totalDistanceOverall,
      fastestAsset,
      mostActiveAsset
    };
  }, [velocityAnalysis]);

  // Memoizar tooltip personalizado
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
          <div className="font-medium mb-2">{data?.assetName || 'Sin nombre'}</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Velocidad promedio:</span>
              <span className="font-medium">{data?.averageSpeed || 0} km/h</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Velocidad máxima:</span>
              <span className="font-medium">{data?.maxSpeed || 0} km/h</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Distancia total:</span>
              <span className="font-medium">{data?.totalDistance || 0} km</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Horas activas:</span>
              <span className="font-medium">{data?.activeHours || 0}h</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  // Memoizar funciones de utilidad
  const getSpeedColor = useCallback((speed: number) => {
    if (speed === 0) return '#e5e7eb'; // gray-200
    if (speed < 20) return '#22c55e'; // green-500
    if (speed < 40) return '#eab308'; // yellow-500
    if (speed < 60) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  }, []);

  const getSpeedCategory = useCallback((speed: number) => {
    if (speed === 0) return 'Inactivo';
    if (speed < 20) return 'Lento';
    if (speed < 40) return 'Moderado';
    if (speed < 60) return 'Rápido';
    return 'Muy Rápido';
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Análisis de Velocidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (velocityAnalysis.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Análisis de Velocidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Gauge className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay datos de velocidad disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Análisis de Velocidades
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{statistics.activeAssets} de {statistics.totalAssets} activos con datos</span>
          <Badge variant="outline">
            <TrendingUp className="h-3 w-3 mr-1" />
            Promedio: {statistics.averageSpeed.toFixed(1)} km/h
          </Badge>
          <Badge variant="soft">
            Máximo: {statistics.maxSpeedOverall.toFixed(1)} km/h
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Controles */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
            
            <Button
              variant={chartType === 'bar' ? "outline" : "ghost"}
              size="sm"
              onClick={() => setChartType('bar')}
              className={chartType === 'bar' ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}
            >
              Barras
            </Button>
            
            <Button
              variant={chartType === 'scatter' ? "outline" : "ghost"}
              size="sm"
              onClick={() => setChartType('scatter')}
              className={chartType === 'scatter' ? 'bg-blue-50 border-blue-500 text-blue-600' : ''}
            >
              Dispersión
            </Button>
            
            <Button
              variant={showOnlyActive ? "outline" : "ghost"}
              size="sm"
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={showOnlyActive ? 'bg-green-50 border-green-500 text-green-600' : ''}
            >
              Solo activos
            </Button>
            
            <div className="flex items-center gap-1 ml-4">
              <span className="text-sm">Ordenar por:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                <option value="averageSpeed">Velocidad promedio</option>
                <option value="maxSpeed">Velocidad máxima</option>
                <option value="totalDistance">Distancia total</option>
                <option value="activeHours">Horas activas</option>
                <option value="name">Nombre</option>
              </select>
            </div>
          </div>
          
          {/* Gráfico principal */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="assetName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="averageSpeed" 
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    name="Velocidad Promedio"
                  />
                </BarChart>
              ) : (
                <ScatterChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="totalDistance" 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Distancia (km)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="averageSpeed"
                    tick={{ fontSize: 12 }} 
                    label={{ value: 'Velocidad Promedio (km/h)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter 
                    data={filteredData}
                    fill="#3b82f6"
                    name="Activos"
                  />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Top performers */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Más rápidos */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Activos Más Rápidos
              </h4>
              <div className="space-y-2">
                {velocityAnalysis
                  .filter(item => item.maxSpeed > 0)
                  .sort((a, b) => b.maxSpeed - a.maxSpeed)
                  .slice(0, 5)
                  .map((asset, index) => (
                    <div key={asset.assetId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{asset.assetName}</div>
                          <div className="text-xs text-muted-foreground">
                            Promedio: {asset.averageSpeed} km/h
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{asset.maxSpeed}</div>
                        <div className="text-xs text-muted-foreground">km/h máx</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
            
            {/* Más activos */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activos Más Activos
              </h4>
              <div className="space-y-2">
                {velocityAnalysis
                  .filter(item => item.totalDistance > 0)
                  .sort((a, b) => b.totalDistance - a.totalDistance)
                  .slice(0, 5)
                  .map((asset, index) => (
                    <div key={asset.assetId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{asset.assetName}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.activeHours}h activas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{asset.totalDistance}</div>
                        <div className="text-xs text-muted-foreground">km total</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          
          {/* Estadísticas generales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.averageSpeed.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Velocidad promedio</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.maxSpeedOverall.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Velocidad máxima</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.totalDistanceOverall.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Distancia total (km)</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.activeAssets}</div>
              <div className="text-xs text-muted-foreground">Activos activos</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {((statistics.activeAssets / Math.max(statistics.totalAssets, 1)) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Tasa de actividad</div>
            </div>
          </div>
          
          {/* Insights */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Insights de Velocidad
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {statistics.fastestAsset && (
                <div>
                  • El activo más rápido es <strong>{statistics.fastestAsset.assetName}</strong> con una velocidad máxima de {statistics.fastestAsset.maxSpeed} km/h
                </div>
              )}
              {statistics.mostActiveAsset && (
                <div>
                  • El activo más activo es <strong>{statistics.mostActiveAsset.assetName}</strong> con {statistics.mostActiveAsset.totalDistance} km recorridos
                </div>
              )}
              <div>
                • Velocidad promedio de la flota: <strong>{statistics.averageSpeed.toFixed(1)} km/h</strong>
              </div>
              <div>
                • {statistics.activeAssets} de {statistics.totalAssets} activos ({((statistics.activeAssets / Math.max(statistics.totalAssets, 1)) * 100).toFixed(1)}%) han registrado actividad
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

VelocityChart.displayName = 'VelocityChart';

export default VelocityChart;
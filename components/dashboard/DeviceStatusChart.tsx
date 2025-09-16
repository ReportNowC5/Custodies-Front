'use client';

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { AssetAnalytics } from '@/hooks/use-asset-analytics';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';

interface DeviceStatusChartProps {
  analytics: AssetAnalytics;
  realTimeMetrics: RealTimeMetrics;
  className?: string;
}

const DeviceStatusChart: React.FC<DeviceStatusChartProps> = React.memo(({ 
  analytics,
  realTimeMetrics,
  className = ''
}) => {
  const { deviceStatusDistribution, loading } = analytics;

  // Memoizar datos del gráfico
  const chartData = useMemo(() => {
    return [
      {
        name: 'Conectados',
        value: realTimeMetrics.connectedDevices,
        color: '#22c55e', // green-500
        icon: <Wifi className="h-4 w-4" />,
        description: 'Dispositivos activos y conectados'
      },
      {
        name: 'Desconectados',
        value: realTimeMetrics.disconnectedDevices,
        color: '#ef4444', // red-500
        icon: <WifiOff className="h-4 w-4" />,
        description: 'Dispositivos sin conexión'
      },
      {
        name: 'Batería Baja',
        value: Array.isArray(realTimeMetrics.alerts.lowBattery) ? realTimeMetrics.alerts.lowBattery.length : realTimeMetrics.alerts.lowBattery,
        color: '#f59e0b', // amber-500
        icon: <AlertCircle className="h-4 w-4" />,
        description: 'Dispositivos con batería crítica'
      }
    ].filter(item => (typeof item.value === 'number' ? item.value : 0) > 0); // Solo mostrar categorías con datos
  }, [realTimeMetrics.connectedDevices, realTimeMetrics.disconnectedDevices, realTimeMetrics.alerts.lowBattery]);

  const totalDevices = realTimeMetrics.totalDevices;
  const connectionRate = realTimeMetrics.connectionRate;

  // Memoizar tooltip personalizado
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      const percentage = totalDevices > 0 ? ((data?.value || 0) / totalDevices * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {data?.icon || '📱'}
            <span className="font-medium">{data?.name || 'Sin nombre'}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Cantidad: <span className="font-medium">{data?.value || 0}</span></div>
            <div>Porcentaje: <span className="font-medium">{percentage}%</span></div>
            <div className="mt-1 text-xs">{data?.description || 'Sin descripción'}</div>
          </div>
        </div>
      );
    }
    return null;
  }, [totalDevices]);

  // Memoizar componente del centro del donut
  const CenterLabel = useCallback(() => {
    const healthStatus = connectionRate >= 80 ? 'Excelente' : 
                        connectionRate >= 60 ? 'Bueno' : 
                        connectionRate >= 40 ? 'Regular' : 'Crítico';
    
    const healthColor = connectionRate >= 80 ? 'text-green-600' : 
                       connectionRate >= 60 ? 'text-blue-600' : 
                       connectionRate >= 40 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold">{totalDevices}</div>
        <div className="text-xs text-muted-foreground">Dispositivos</div>
        <div className={`text-sm font-medium mt-1 ${healthColor}`}>
          {healthStatus}
        </div>
        <div className="text-xs text-muted-foreground">
          {connectionRate.toFixed(1)}% conectados
        </div>
      </div>
    );
  }, [totalDevices, connectionRate]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado de Dispositivos
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

  if (totalDevices === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado de Dispositivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay dispositivos registrados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Estado de Dispositivos
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Total: {totalDevices} dispositivos</span>
          <Badge 
            variant={connectionRate >= 80 ? "outline" : connectionRate >= 40 ? "soft" : "outline"}
          >
            {connectionRate.toFixed(1)}% conectados
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de donut */}
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <CenterLabel />
          </div>
          
          {/* Estadísticas detalladas */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Estado Detallado
            </h4>
            
            {/* Dispositivos conectados */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <Wifi className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Conectados</div>
                  <div className="text-xs text-muted-foreground">
                    Funcionando correctamente
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-600">
                  {realTimeMetrics.connectedDevices}
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalDevices > 0 ? ((realTimeMetrics.connectedDevices / totalDevices) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            
            {/* Dispositivos desconectados */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <WifiOff className="h-4 w-4 text-red-600" />
                <div>
                  <div className="font-medium text-sm">Desconectados</div>
                  <div className="text-xs text-muted-foreground">
                    Sin conexión activa
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-red-600">
                  {realTimeMetrics.disconnectedDevices}
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalDevices > 0 ? ((realTimeMetrics.disconnectedDevices / totalDevices) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            
            {/* Alertas de batería baja */}
            {(Array.isArray(realTimeMetrics.alerts.lowBattery) ? realTimeMetrics.alerts.lowBattery.length : realTimeMetrics.alerts.lowBattery) > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <div>
                    <div className="font-medium text-sm">Batería Baja</div>
                    <div className="text-xs text-muted-foreground">
                      Requieren atención
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-amber-600">
                    {Array.isArray(realTimeMetrics.alerts.lowBattery) ? realTimeMetrics.alerts.lowBattery.length : realTimeMetrics.alerts.lowBattery}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    &lt; 20%
                  </div>
                </div>
              </div>
            )}
            
            {/* Dispositivos recientemente desconectados */}
            {(Array.isArray(realTimeMetrics.alerts.recentlyDisconnected) ? realTimeMetrics.alerts.recentlyDisconnected.length : 0) > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="font-medium text-sm">Recién Desconectados</div>
                    <div className="text-xs text-muted-foreground">
                      Últimos 5 minutos
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-orange-600">
                    {Array.isArray(realTimeMetrics.alerts.recentlyDisconnected) ? realTimeMetrics.alerts.recentlyDisconnected.length : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recientes
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Métricas de rendimiento */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {realTimeMetrics.connectedDevices}
              </div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-red-600">
                {realTimeMetrics.disconnectedDevices}
              </div>
              <div className="text-xs text-muted-foreground">Offline</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {Array.isArray(realTimeMetrics.alerts.lowBattery) ? realTimeMetrics.alerts.lowBattery.length : realTimeMetrics.alerts.lowBattery}
              </div>
              <div className="text-xs text-muted-foreground">Batería baja</div>
            </div>
            
            <div>
              <div className={`text-2xl font-bold ${
                connectionRate >= 80 ? 'text-green-600' : 
                connectionRate >= 60 ? 'text-blue-600' : 
                connectionRate >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {connectionRate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Conectividad</div>
            </div>
          </div>
        </div>
        
        {/* Última actualización */}
        {realTimeMetrics.lastUpdate && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Última actualización: {realTimeMetrics.lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

DeviceStatusChart.displayName = 'DeviceStatusChart';

export default DeviceStatusChart;
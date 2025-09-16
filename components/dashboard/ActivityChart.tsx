'use client';

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Clock, TrendingUp, Activity } from 'lucide-react';
import { AssetAnalytics } from '@/hooks/use-asset-analytics';

interface ActivityChartProps {
  analytics: AssetAnalytics;
  className?: string;
}

const ActivityChart: React.FC<ActivityChartProps> = React.memo(({ 
  analytics,
  className = ''
}) => {
  const { activityByHour, loading } = analytics;

  // Memoizar datos formateados para el gráfico
  const chartData = useMemo(() => {
    return activityByHour.map(item => ({
      hour: item.hour,
      hourLabel: `${item.hour.toString().padStart(2, '0')}:00`,
      activeDevices: item.activeDevices,
      totalMessages: item.totalMessages,
      period: item.hour < 6 ? 'Madrugada' :
              item.hour < 12 ? 'Mañana' :
              item.hour < 18 ? 'Tarde' : 'Noche'
    }));
  }, [activityByHour]);

  // Memoizar estadísticas calculadas
  const statistics = useMemo(() => {
    const totalMessages = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.totalMessages, 0) : 0;
    const peakHour = chartData.length > 0 ? chartData.reduce((prev, current) => 
      prev.totalMessages > current.totalMessages ? prev : current
    ) : null;
    const averageActivity = totalMessages / 24;
    
    // Encontrar períodos de mayor actividad
    const periodActivity = chartData.length > 0 ? chartData.reduce((acc, item) => {
      acc[item.period] = (acc[item.period] || 0) + item.totalMessages;
      return acc;
    }, {} as Record<string, number>) : {};
    
    const mostActivePeriod = Object.entries(periodActivity).length > 0 
      ? Object.entries(periodActivity).reduce((prev, current) => prev[1] > current[1] ? prev : current)
      : null;

    return {
      totalMessages,
      peakHour,
      averageActivity,
      periodActivity,
      mostActivePeriod
    };
  }, [chartData]);

  // Memoizar tooltip personalizado
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="font-medium mb-2">{label || 'Sin etiqueta'}</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Dispositivos activos:</span>
              <span className="font-medium">{data?.activeDevices || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Mensajes totales:</span>
              <span className="font-medium">{data?.totalMessages || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium">{data?.period || 'Sin período'}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  // Memoizar función para obtener color según la actividad
  const getActivityColor = useCallback((messages: number) => {
    if (messages === 0) return '#e5e7eb'; // gray-200
    if (messages < statistics.averageActivity * 0.5) return '#fbbf24'; // amber-400
    if (messages < statistics.averageActivity) return '#60a5fa'; // blue-400
    if (messages < statistics.averageActivity * 1.5) return '#34d399'; // emerald-400
    return '#f87171'; // red-400
  }, [statistics.averageActivity]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividad por Hora del Día
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

  if (statistics.totalMessages === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividad por Hora del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Clock className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay datos de actividad disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Actividad por Hora del Día
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Total: {statistics.totalMessages.toLocaleString()} mensajes</span>
          <Badge variant="outline">
            <TrendingUp className="h-3 w-3 mr-1" />
            {statistics.peakHour ? `Pico: ${statistics.peakHour.hourLabel} (${statistics.peakHour.totalMessages} mensajes)` : 'Sin datos'}
          </Badge>
          <Badge variant="outline">
            {statistics.mostActivePeriod ? `Período más activo: ${statistics.mostActivePeriod[0]}` : 'Sin datos'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Gráfico de barras principal */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fontSize: 12 }}
                  interval={1}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="totalMessages" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                  name="Mensajes"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfico de línea para dispositivos activos */}
          <div className="h-48">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              Dispositivos Activos por Hora
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fontSize: 12 }}
                  interval={1}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="activeDevices" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  name="Dispositivos Activos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Mapa de calor por períodos */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Actividad por Períodos del Día
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(statistics.periodActivity).map(([period, messages]) => {
                const percentage = statistics.totalMessages > 0 ? (messages / statistics.totalMessages) * 100 : 0;
                return (
                  <div 
                    key={period}
                    className="p-3 rounded-lg border text-center"
                    style={{ 
                      backgroundColor: `${getActivityColor(messages)}20`,
                      borderColor: getActivityColor(messages)
                    }}
                  >
                    <div className="font-medium text-sm">{period}</div>
                    <div className="text-lg font-bold mt-1">{messages}</div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Estadísticas detalladas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.totalMessages.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total mensajes</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.averageActivity.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Promedio/hora</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.peakHour?.hourLabel}</div>
              <div className="text-xs text-muted-foreground">Hora pico</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.max(...chartData.map(d => d.activeDevices))}
              </div>
              <div className="text-xs text-muted-foreground">Máx. dispositivos</div>
            </div>
          </div>
          
          {/* Insights */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Insights de Actividad
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {statistics.mostActivePeriod && (
                <div>
                  • El período más activo es <strong>{statistics.mostActivePeriod[0]}</strong> con {statistics.mostActivePeriod[1]} mensajes ({((statistics.mostActivePeriod[1] / statistics.totalMessages) * 100).toFixed(1)}% del total)
                </div>
              )}
              {statistics.peakHour && (
                <div>
                  • La hora pico es a las <strong>{statistics.peakHour.hourLabel}</strong> con {statistics.peakHour.totalMessages} mensajes
                </div>
              )}
              <div>
                • Promedio de actividad: <strong>{statistics.averageActivity.toFixed(1)} mensajes por hora</strong>
              </div>
              {chartData.length > 0 && (
                <div>
                  • Máximo de dispositivos activos simultáneamente: <strong>{Math.max(...chartData.map(d => d.activeDevices))}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ActivityChart.displayName = 'ActivityChart';

export default ActivityChart;
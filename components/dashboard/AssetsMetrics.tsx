'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Truck, 
  Users, 
  Wifi, 
  WifiOff, 
  Battery, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { DashboardData, DashboardMetrics } from '@/hooks/use-dashboard-data';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';

interface AssetsMetricsProps {
  data: DashboardData;
  metrics: DashboardMetrics;
  realTimeMetrics: RealTimeMetrics;
  className?: string;
}

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  progress?: number;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}> = ({ title, value, subtitle, icon, trend, progress, variant = 'default' }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getCardStyle = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'destructive':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return '';
    }
  };

  return (
    <Card className={getCardStyle()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {progress !== undefined && (
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(1)}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AssetsMetrics: React.FC<AssetsMetricsProps> = ({
  data,
  metrics,
  realTimeMetrics,
  className = ''
}) => {
  const connectionRate = realTimeMetrics.connectionRate;
  const getConnectionVariant = () => {
    if (connectionRate >= 80) return 'success';
    if (connectionRate >= 60) return 'default';
    if (connectionRate >= 40) return 'warning';
    return 'destructive';
  };

  const getConnectionTrend = () => {
    if (connectionRate >= 80) return 'up';
    if (connectionRate < 40) return 'down';
    return 'neutral';
  };

  const totalAlerts = metrics.alerts.lowBattery + metrics.alerts.noSignal + metrics.alerts.offline;
  const alertVariant = totalAlerts > 5 ? 'destructive' : totalAlerts > 2 ? 'warning' : 'default';

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {/* Total de Activos */}
      <MetricCard
        title="Total de Activos"
        value={data.totalAssets}
        subtitle={`${data.activeAssets} activos, ${data.inactiveAssets} inactivos`}
        icon={<Truck className="h-4 w-4" />}
        progress={(data.activeAssets / Math.max(data.totalAssets, 1)) * 100}
        variant={data.activeAssets > data.inactiveAssets ? 'success' : 'warning'}
        trend={data.activeAssets > data.inactiveAssets ? 'up' : 'down'}
      />

      {/* Dispositivos Conectados */}
      <MetricCard
        title="Dispositivos Conectados"
        value={`${realTimeMetrics.connectedDevices}/${realTimeMetrics.totalDevices}`}
        subtitle={`Tasa de conexión: ${connectionRate.toFixed(1)}%`}
        icon={connectionRate >= 60 ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        progress={connectionRate}
        variant={getConnectionVariant()}
        trend={getConnectionTrend()}
      />

      {/* Total de Usuarios */}
      <MetricCard
        title="Usuarios del Sistema"
        value={data.totalUsers}
        subtitle={`${metrics.usersMetrics.active} usuarios activos`}
        icon={<Users className="h-4 w-4" />}
        progress={(metrics.usersMetrics.active / Math.max(data.totalUsers, 1)) * 100}
        variant="default"
      />

      {/* Alertas Activas */}
      <Card className={alertVariant === 'destructive' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : alertVariant === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
          <div className="flex items-center space-x-1">
            {totalAlerts > 5 ? <TrendingDown className="h-4 w-4 text-red-500" /> : null}
            <AlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAlerts}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {metrics.alerts.lowBattery > 0 && (
              <Badge variant="outline" className="text-xs">
                <Battery className="h-3 w-3 mr-1" />
                {metrics.alerts.lowBattery}
              </Badge>
            )}
            {metrics.alerts.noSignal > 0 && (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-3 w-3 mr-1" />
                {metrics.alerts.noSignal}
              </Badge>
            )}
            {metrics.alerts.offline > 0 && (
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                {metrics.alerts.offline}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas adicionales en cards más pequeños */}
      <div className="md:col-span-2 lg:col-span-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Distribución por tipo de activo */}
          {Object.entries(metrics.assetsMetrics.byType).slice(0, 3).map(([type, count]) => (
            <Card key={type} className="">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {type.replace('_', ' ')}
                </div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">
                  {((count / data.totalAssets) * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Estado de la conexión */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Estado de Red
              </div>
              <div className="text-xl font-bold">
                {connectionRate >= 80 ? 'Excelente' : 
                 connectionRate >= 60 ? 'Bueno' : 
                 connectionRate >= 40 ? 'Regular' : 'Deficiente'}
              </div>
              <div className="text-xs text-muted-foreground">
                {realTimeMetrics.lastUpdate ? 
                  `Actualizado ${realTimeMetrics.lastUpdate.toLocaleTimeString()}` : 
                  'Sin actualizar'
                }
              </div>
            </CardContent>
          </Card>

          {/* Dispositivos con batería baja */}
          <Card className={metrics.alerts.lowBattery > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Batería Baja
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {metrics.alerts.lowBattery}
              </div>
              <div className="text-xs text-muted-foreground">
                Requieren atención
              </div>
            </CardContent>
          </Card>

          {/* Dispositivos sin señal */}
          <Card className={metrics.alerts.noSignal > 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : ''}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Sin Señal
              </div>
              <div className="text-xl font-bold text-red-600">
                {metrics.alerts.noSignal}
              </div>
              <div className="text-xs text-muted-foreground">
                Desconectados
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssetsMetrics;
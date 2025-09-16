'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Gauge, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Wifi, 
  Database, 
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { AssetAnalytics } from '@/hooks/use-asset-analytics';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';
import { DashboardMetrics } from '@/hooks/use-dashboard-data';

interface PerformanceIndicatorsProps {
  analytics: AssetAnalytics;
  realTimeMetrics: RealTimeMetrics;
  dashboardMetrics: DashboardMetrics;
  className?: string;
}

interface KPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  description: string;
  category: 'performance' | 'connectivity' | 'efficiency' | 'reliability';
}

const PerformanceIndicators: React.FC<PerformanceIndicatorsProps> = ({
  analytics,
  realTimeMetrics,
  dashboardMetrics,
  className = ''
}) => {
  const { performanceIndicators, loading } = analytics;

  // Calcular KPIs del sistema
  const kpis: KPI[] = [
    // Performance
    {
      id: 'response_time',
      name: 'Tiempo de Respuesta',
      value: performanceIndicators?.averageResponseTime || 0,
      unit: 's',
      target: 2.0,
      status: (performanceIndicators?.averageResponseTime || 0) < 1.5 ? 'excellent' : 
              (performanceIndicators?.averageResponseTime || 0) < 2.5 ? 'good' : 
              (performanceIndicators?.averageResponseTime || 0) < 4.0 ? 'warning' : 'critical',
      trend: 'stable',
      icon: <Clock className="h-4 w-4" />,
      description: 'Tiempo promedio de respuesta del sistema',
      category: 'performance'
    },
    {
      id: 'system_uptime',
      name: 'Tiempo de Actividad',
      value: performanceIndicators?.systemUptime || 0,
      unit: '%',
      target: 99.5,
      status: (performanceIndicators?.systemUptime || 0) >= 99.5 ? 'excellent' : 
              (performanceIndicators?.systemUptime || 0) >= 99.0 ? 'good' : 
              (performanceIndicators?.systemUptime || 0) >= 95.0 ? 'warning' : 'critical',
      trend: 'up',
      icon: <Zap className="h-4 w-4" />,
      description: 'Porcentaje de tiempo que el sistema está operativo',
      category: 'reliability'
    },
    
    // Connectivity
    {
      id: 'connection_rate',
      name: 'Tasa de Conexión',
      value: realTimeMetrics?.connectionRate || 0,
      unit: '%',
      target: 85.0,
      status: (realTimeMetrics?.connectionRate || 0) >= 85 ? 'excellent' : 
              (realTimeMetrics?.connectionRate || 0) >= 70 ? 'good' : 
              (realTimeMetrics?.connectionRate || 0) >= 50 ? 'warning' : 'critical',
      trend: (realTimeMetrics?.connectionRate || 0) >= 80 ? 'up' : 
             (realTimeMetrics?.connectionRate || 0) >= 60 ? 'stable' : 'down',
      icon: <Wifi className="h-4 w-4" />,
      description: 'Porcentaje de dispositivos conectados',
      category: 'connectivity'
    },
    {
      id: 'gps_accuracy',
      name: 'Precisión GPS',
      value: performanceIndicators?.gpsAccuracy || 0,
      unit: '%',
      target: 95.0,
      status: (performanceIndicators?.gpsAccuracy || 0) >= 95 ? 'excellent' : 
              (performanceIndicators?.gpsAccuracy || 0) >= 90 ? 'good' : 
              (performanceIndicators?.gpsAccuracy || 0) >= 80 ? 'warning' : 'critical',
      trend: 'stable',
      icon: <Target className="h-4 w-4" />,
      description: 'Precisión de las coordenadas GPS recibidas',
      category: 'performance'
    },
    
    // Efficiency
    {
      id: 'data_completeness',
      name: 'Completitud de Datos',
      value: performanceIndicators?.dataCompleteness || 0,
      unit: '%',
      target: 95.0,
      status: (performanceIndicators?.dataCompleteness || 0) >= 95 ? 'excellent' : 
              (performanceIndicators?.dataCompleteness || 0) >= 90 ? 'good' : 
              (performanceIndicators?.dataCompleteness || 0) >= 80 ? 'warning' : 'critical',
      trend: 'up',
      icon: <Database className="h-4 w-4" />,
      description: 'Porcentaje de datos completos recibidos',
      category: 'efficiency'
    },
    {
      id: 'active_assets_ratio',
      name: 'Ratio de Activos Activos',
      value: ((dashboardMetrics?.assetsMetrics?.active || 0) / Math.max(dashboardMetrics?.assetsMetrics?.total || 1, 1)) * 100,
      unit: '%',
      target: 80.0,
      status: (((dashboardMetrics?.assetsMetrics?.active || 0) / Math.max(dashboardMetrics?.assetsMetrics?.total || 1, 1)) * 100) >= 80 ? 'excellent' : 
              (((dashboardMetrics?.assetsMetrics?.active || 0) / Math.max(dashboardMetrics?.assetsMetrics?.total || 1, 1)) * 100) >= 60 ? 'good' : 
              (((dashboardMetrics?.assetsMetrics?.active || 0) / Math.max(dashboardMetrics?.assetsMetrics?.total || 1, 1)) * 100) >= 40 ? 'warning' : 'critical',
      trend: (dashboardMetrics?.assetsMetrics?.active || 0) > (dashboardMetrics?.assetsMetrics?.inactive || 0) ? 'up' : 'down',
      icon: <Activity className="h-4 w-4" />,
      description: 'Porcentaje de activos en estado activo',
      category: 'efficiency'
    }
  ];

  // Función para obtener color según el estado
  const getStatusColor = (status: KPI['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
    }
  };

  // Función para obtener color de fondo según el estado
  const getStatusBgColor = (status: KPI['status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'good': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'critical': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    }
  };

  // Función para obtener icono de estado
  const getStatusIcon = (status: KPI['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Función para obtener icono de tendencia
  const getTrendIcon = (trend: KPI['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'stable': return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    }
  };

  // Calcular puntuación general del sistema
  const overallScore = kpis.length > 0 ? kpis.reduce((sum, kpi) => {
    const score = kpi.status === 'excellent' ? 100 : 
                  kpi.status === 'good' ? 80 : 
                  kpi.status === 'warning' ? 60 : 40;
    return sum + score;
  }, 0) / kpis.length : 0;

  const overallStatus = overallScore >= 90 ? 'excellent' : 
                       overallScore >= 75 ? 'good' : 
                       overallScore >= 60 ? 'warning' : 'critical';

  // Agrupar KPIs por categoría
  const kpisByCategory = kpis.length > 0 ? kpis.reduce((acc, kpi) => {
    if (!acc[kpi.category]) acc[kpi.category] = [];
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, KPI[]>) : {};

  const categoryNames = {
    performance: 'Rendimiento',
    connectivity: 'Conectividad',
    efficiency: 'Eficiencia',
    reliability: 'Confiabilidad'
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Indicadores de Rendimiento
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Indicadores de Rendimiento (KPIs)
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Puntuación general del sistema:</span>
          <Badge 
            variant={overallStatus === 'excellent' || overallStatus === 'good' ? "outline" : "outline"}
            className={`${getStatusColor(overallStatus)} ${overallStatus === 'critical' || overallStatus === 'warning' ? 'border-red-500' : 'border-green-500'}`}
          >
            {getStatusIcon(overallStatus)}
            <span className="ml-1">{overallScore.toFixed(1)}/100</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Puntuación general */}
          <div className={`p-4 rounded-lg border ${getStatusBgColor(overallStatus)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Estado General del Sistema</h3>
              {getStatusIcon(overallStatus)}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={overallScore} className="h-3" />
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(overallStatus)}`}>
                {overallScore.toFixed(1)}%
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {overallStatus === 'excellent' ? 'Sistema funcionando de manera excelente' :
               overallStatus === 'good' ? 'Sistema funcionando correctamente' :
               overallStatus === 'warning' ? 'Sistema requiere atención' :
               'Sistema en estado crítico'}
            </div>
          </div>
          
          {/* KPIs por categoría */}
          {Object.entries(kpisByCategory).map(([category, categoryKpis]) => (
            <div key={category}>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                {categoryNames[category as keyof typeof categoryNames]}
              </h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                {categoryKpis.map((kpi) => (
                  <div 
                    key={kpi.id}
                    className={`p-4 rounded-lg border ${getStatusBgColor(kpi.status)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {kpi.icon}
                        <h5 className="font-medium text-sm">{kpi.name}</h5>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpi.trend)}
                        {getStatusIcon(kpi.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between mb-2">
                      <div className={`text-2xl font-bold ${getStatusColor(kpi.status)}`}>
                        {kpi.value.toFixed(kpi.unit === '%' ? 1 : 2)}{kpi.unit}
                      </div>
                      {kpi.target && (
                        <div className="text-xs text-muted-foreground">
                          Meta: {kpi.target}{kpi.unit}
                        </div>
                      )}
                    </div>
                    
                    {kpi.target && (
                      <div className="mb-2">
                        <Progress 
                          value={Math.min((kpi.value / kpi.target) * 100, 100)} 
                          className="h-2" 
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {((kpi.value / kpi.target) * 100).toFixed(1)}% del objetivo
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {kpi.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Resumen de alertas */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Resumen de Estado
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {kpis.filter(k => k.status === 'excellent').length}
                </div>
                <div className="text-xs text-muted-foreground">Excelentes</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {kpis.filter(k => k.status === 'good').length}
                </div>
                <div className="text-xs text-muted-foreground">Buenos</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-yellow-600">
                  {kpis.filter(k => k.status === 'warning').length}
                </div>
                <div className="text-xs text-muted-foreground">Advertencias</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-red-600">
                  {kpis.filter(k => k.status === 'critical').length}
                </div>
                <div className="text-xs text-muted-foreground">Críticos</div>
              </div>
            </div>
          </div>
          
          {/* Recomendaciones */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recomendaciones de Mejora
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {kpis.filter(k => k.status === 'critical').length > 0 && (
                <div>• <strong>Crítico:</strong> {kpis.filter(k => k.status === 'critical').length} indicadores requieren atención inmediata</div>
              )}
              {kpis.filter(k => k.status === 'warning').length > 0 && (
                <div>• <strong>Advertencia:</strong> {kpis.filter(k => k.status === 'warning').length} indicadores necesitan monitoreo</div>
              )}
              {(realTimeMetrics?.connectionRate || 0) < 80 && (
                <div>• Mejorar la conectividad de dispositivos para alcanzar el 85% objetivo</div>
              )}
              {(performanceIndicators?.averageResponseTime || 0) > 2.5 && (
                <div>• Optimizar el tiempo de respuesta del sistema</div>
              )}
              {(dashboardMetrics?.assetsMetrics?.active || 0) / Math.max(dashboardMetrics?.assetsMetrics?.total || 1, 1) < 0.8 && (
                <div>• Revisar y activar más activos para mejorar la eficiencia operativa</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceIndicators;
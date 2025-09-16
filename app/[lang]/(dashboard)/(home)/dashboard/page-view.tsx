"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar } from "lucide-react";
import DatePickerWithRange from "@/components/date-picker-with-range";

// Dashboard hooks
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useRealTimeMetrics } from '@/hooks/use-realtime-metrics';
import { useAssetAnalytics } from '@/hooks/use-asset-analytics';

// Dashboard components
import AssetsMetrics from '@/components/dashboard/AssetsMetrics';
import RealTimeMap from '@/components/dashboard/RealTimeMap';
import AssetTypeDistribution from '@/components/dashboard/AssetTypeDistribution';
import DeviceStatusChart from '@/components/dashboard/DeviceStatusChart';
import ActivityChart from '@/components/dashboard/ActivityChart';
import VelocityChart from '@/components/dashboard/VelocityChart';
import AssetsTable from '@/components/dashboard/AssetsTable';
import LowBatteryDevices from '@/components/dashboard/LowBatteryDevices';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PerformanceIndicators from '@/components/dashboard/PerformanceIndicators';

interface DashboardPageViewProps {
  trans: {
    [key: string]: any;
  };
}

const DashboardPageView = React.memo(({ trans }: DashboardPageViewProps) => {
  // Hooks para obtener datos del dashboard
  const {
    assets,
    devices,
    users,
    metrics: dashboardMetrics,
    refreshData,
    isLoading: dashboardLoading,
    error: dashboardError
  } = useDashboardData();

  const {
    metrics: realTimeMetrics,
    recentActivity,
    refreshMetrics
  } = useRealTimeMetrics(assets, devices);

  const {
    analytics,
    refreshAnalytics,
    isLoading: analyticsLoading
  } = useAssetAnalytics(assets, devices);

  // Función para refrescar todos los datos - memoizada
  const handleRefreshAll = React.useCallback(() => {
    refreshData();
    refreshMetrics();
    refreshAnalytics();
  }, [refreshData, refreshMetrics, refreshAnalytics]);

  // Memoizar datos calculados para evitar re-renders
  const dashboardData = React.useMemo(() => ({
    assets,
    devices,
    users,
    totalAssets: assets.length,
    activeAssets: assets.filter(a => a.status === 'ACTIVE').length,
    inactiveAssets: assets.filter(a => a.status === 'INACTIVE').length,
    totalDevices: devices.length,
    activeDevices: devices.filter(d => d.status === 'ACTIVE').length,
    inactiveDevices: devices.filter(d => d.status === 'INACTIVE').length,
    totalUsers: users.length,
    loading: dashboardLoading,
    error: dashboardError,
    lastUpdated: new Date()
  }), [assets, devices, users, dashboardLoading, dashboardError]);

  // Memoizar el título del dashboard
  const dashboardTitle = React.useMemo(() => 
    String(trans?.dashboard?.analytics || trans?.analytics || 'Dashboard GPS - Análisis en Tiempo Real'),
    [trans]
  );

  // Memoizar el estado de loading
  const isRefreshing = React.useMemo(() => 
    dashboardLoading || analyticsLoading,
    [dashboardLoading, analyticsLoading]
  );

  return (
    <div className="space-y-6" key="dashboard-container">
      {/* Header */}
      <div className="flex items-center flex-wrap justify-between gap-4" key="dashboard-header">
        <div className="text-2xl font-medium text-default-800">
          {dashboardTitle}
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange key="dashboard-date-picker" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            key="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Error handling */}
      {dashboardError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200">
            Error al cargar los datos: {dashboardError}
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <AssetsMetrics 
        key="assets-metrics"
        data={dashboardData}
        metrics={dashboardMetrics}
        realTimeMetrics={realTimeMetrics}
      />

      {/* Mapa en tiempo real y gráficos principales */}
      <div className="grid gap-6 lg:grid-cols-2" key="main-charts-grid">
        <RealTimeMap 
          key="realtime-map"
          assets={assets}
          devices={devices}
          realTimeMetrics={realTimeMetrics}
        />
        <div className="space-y-6" key="side-charts">
          <AssetTypeDistribution key="asset-type-dist" analytics={analytics} />
          <DeviceStatusChart 
            key="device-status-chart"
            analytics={analytics}
            realTimeMetrics={realTimeMetrics}
          />
        </div>
      </div>

      {/* Gráficos de análisis */}
      <div className="grid gap-6 lg:grid-cols-2" key="analysis-charts-grid">
        <ActivityChart key="activity-chart" analytics={analytics} />
        <VelocityChart key="velocity-chart" analytics={analytics} />
      </div>

      {/* Indicadores de rendimiento */}
      <PerformanceIndicators 
        key="performance-indicators"
        analytics={analytics}
        realTimeMetrics={realTimeMetrics}
        dashboardMetrics={dashboardMetrics}
      />

      {/* Tablas de datos */}
      <div className="grid gap-6 lg:grid-cols-3" key="data-tables-grid">
        <div className="lg:col-span-2" key="assets-table-container">
          <AssetsTable 
            key="assets-table"
            assets={assets}
            realTimeMetrics={realTimeMetrics}
          />
        </div>
        <div className="space-y-6" key="side-widgets">
          <LowBatteryDevices 
            key="low-battery-devices"
            assets={assets}
            realTimeMetrics={realTimeMetrics}
            onRefresh={refreshMetrics}
          />
          <RecentActivity 
            key="recent-activity"
            assets={assets}
            realTimeMetrics={realTimeMetrics}
            recentActivity={recentActivity}
            onRefresh={refreshMetrics}
          />
        </div>
      </div>

      {/* Footer con información de actualización */}
      <div className="text-center text-sm text-muted-foreground py-4" key="dashboard-footer">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            Dashboard actualizado automáticamente cada 30 segundos
            {realTimeMetrics.lastUpdate && (
              <span className="ml-2">
                • Última actualización: {realTimeMetrics.lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

DashboardPageView.displayName = "DashboardPageView";

export default DashboardPageView;

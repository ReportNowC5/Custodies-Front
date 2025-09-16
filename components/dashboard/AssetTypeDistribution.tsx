'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, Package } from 'lucide-react';
import { AssetAnalytics } from '@/hooks/use-asset-analytics';

interface AssetTypeDistributionProps {
  analytics: AssetAnalytics;
  className?: string;
}

// Colores para cada tipo de activo
const ASSET_TYPE_COLORS: Record<string, string> = {
  'HEAVY_LOAD': '#ef4444', // red-500
  'MEDIUM_LOAD': '#f97316', // orange-500
  'LIGHT_LOAD': '#eab308', // yellow-500
  'PASSENGER': '#22c55e', // green-500
  'CARGO': '#3b82f6', // blue-500
  'OTHER': '#8b5cf6', // violet-500
};

// Iconos para cada tipo de activo
const ASSET_TYPE_ICONS: Record<string, string> = {
  'HEAVY_LOAD': '🚛',
  'MEDIUM_LOAD': '🚚',
  'LIGHT_LOAD': '🚐',
  'PASSENGER': '🚗',
  'CARGO': '📦',
  'OTHER': '🚙',
};

// Nombres legibles para los tipos
const ASSET_TYPE_NAMES: Record<string, string> = {
  'HEAVY_LOAD': 'Carga Pesada',
  'MEDIUM_LOAD': 'Carga Media',
  'LIGHT_LOAD': 'Carga Ligera',
  'PASSENGER': 'Pasajeros',
  'CARGO': 'Carga',
  'OTHER': 'Otros',
};

const AssetTypeDistribution: React.FC<AssetTypeDistributionProps> = ({
  analytics,
  className = ''
}) => {
  const { assetTypeDistribution, loading } = analytics;

  // Preparar datos para el gráfico
  const chartData = assetTypeDistribution.map(item => ({
    name: ASSET_TYPE_NAMES[item.type] || item.type,
    value: item.count,
    percentage: item.percentage,
    type: item.type,
    color: ASSET_TYPE_COLORS[item.type] || '#6b7280',
    icon: ASSET_TYPE_ICONS[item.type] || '📍'
  }));

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{data?.icon || '📦'}</span>
            <span className="font-medium">{data?.name || 'Sin nombre'}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Cantidad: <span className="font-medium">{data?.value || 0}</span></div>
            <div>Porcentaje: <span className="font-medium">{(data?.percentage || 0).toFixed(1)}%</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Leyenda personalizada
  const CustomLegend = ({ payload }: any) => {
    if (!payload || !Array.isArray(payload)) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => {
          // Validación defensiva para evitar errores de propiedades undefined
          if (!entry || !entry.payload) return null;
          
          return (
            <div 
              key={index}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-muted/50"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color || '#ccc' }}
              />
              <span className="text-xs">{entry.payload?.icon || '📦'}</span>
              <span>{entry.value || 0}</span>
              <span className="text-muted-foreground">
                ({(entry.payload?.percentage || 0).toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Distribución por Tipo de Activo
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

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Distribución por Tipo de Activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p>No hay datos de activos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAssets = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.value, 0) : 0;
  const mostCommonType = chartData.length > 0 ? chartData.reduce((prev, current) => 
    prev.value > current.value ? prev : current
  ) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Distribución por Tipo de Activo
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: {totalAssets} activos</span>
          {mostCommonType && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Más común: {mostCommonType.icon} {mostCommonType.name} ({mostCommonType.percentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de pie */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
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
          </div>
          
          {/* Lista detallada */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Detalles por Tipo
            </h4>
            
            {chartData
              .sort((a, b) => b.value - a.value)
              .map((item, index) => (
                <div 
                  key={item.type}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}% del total
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg">{item.value}</div>
                    <div className="text-xs text-muted-foreground">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        
        {/* Leyenda */}
        <CustomLegend payload={chartData} />
        
        {/* Estadísticas adicionales */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{chartData.length}</div>
              <div className="text-xs text-muted-foreground">Tipos diferentes</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold">{totalAssets}</div>
              <div className="text-xs text-muted-foreground">Total activos</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold">
                {mostCommonType ? mostCommonType.percentage.toFixed(0) : '0'}%
              </div>
              <div className="text-xs text-muted-foreground">Tipo dominante</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold">
                {(totalAssets / chartData.length).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Promedio por tipo</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetTypeDistribution;
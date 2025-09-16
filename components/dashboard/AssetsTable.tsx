'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MapPin, 
  Search, 
  Filter, 
  Navigation, 
  Clock, 
  Wifi, 
  WifiOff, 
  Battery,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { AssetResponse } from '@/lib/types/asset';
import { RealTimeMetrics } from '@/hooks/use-realtime-metrics';

interface AssetsTableProps {
  assets: AssetResponse[];
  realTimeMetrics: RealTimeMetrics;
  className?: string;
}

interface AssetWithLocation {
  id: string;
  name: string;
  type: string;
  status: string;
  device?: {
    imei?: string;
  } | null;
  lastLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp: Date;
    speed?: number;
  };
  connectionStatus: {
    isConnected: boolean;
    lastActivity?: Date | null;
    batteryLevel?: number;
  };
}

type SortField = 'name' | 'type' | 'status' | 'lastActivity' | 'speed' | 'battery';
type SortDirection = 'asc' | 'desc';

const AssetsTable: React.FC<AssetsTableProps> = ({
  assets,
  realTimeMetrics,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'connected' | 'disconnected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Combinar datos de activos con métricas en tiempo real
  const assetsWithLocation: AssetWithLocation[] = useMemo(() => {
    return assets.map(asset => {
      const deviceState = asset.device?.imei ? 
        realTimeMetrics.deviceStates.get(asset.device.imei) : null;
      
      return {
        id: asset.id.toString(),
        name: asset.name,
        type: asset.assetType,
        status: asset.status,
        device: asset.device ? { imei: asset.device.imei } : null,
        connectionStatus: {
          isConnected: deviceState?.isConnected || false,
          lastActivity: deviceState?.lastActivity,
          batteryLevel: deviceState?.batteryLevel
        }
      };
    });
  }, [assets, realTimeMetrics.deviceStates]);

  // Filtrar y ordenar datos
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assetsWithLocation;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.device?.imei?.includes(searchTerm) ||
        asset.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => {
        switch (statusFilter) {
          case 'active':
            return asset.status === 'ACTIVE';
          case 'inactive':
            return asset.status === 'INACTIVE';
          case 'connected':
            return asset.connectionStatus?.isConnected || false;
          case 'disconnected':
            return !(asset.connectionStatus?.isConnected || false);
          default:
            return true;
        }
      });
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.type === typeFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'lastActivity':
          aValue = a.connectionStatus?.lastActivity?.getTime() || 0;
          bValue = b.connectionStatus?.lastActivity?.getTime() || 0;
          break;
        case 'speed':
          aValue = a.lastLocation?.speed || 0;
          bValue = b.lastLocation?.speed || 0;
          break;
        case 'battery':
          aValue = a.connectionStatus?.batteryLevel || 0;
          bValue = b.connectionStatus?.batteryLevel || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [assetsWithLocation, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // Obtener tipos únicos para el filtro
  const uniqueTypes = [...new Set(assets.map(asset => asset.assetType))];

  // Función para manejar ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  // Componente de encabezado ordenable
  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Lista de Activos
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando {filteredAndSortedAssets.length} de {assets.length} activos</span>
          <Badge variant="outline">
            {realTimeMetrics.connectedDevices} conectados
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Controles de filtro y búsqueda */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, IMEI o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="connected">Conectados</option>
              <option value="disconnected">Desconectados</option>
            </select>
            
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="all">Todos los tipos</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {getAssetTypeIcon(type)} {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name">Activo</SortableHeader>
                <SortableHeader field="type">Tipo</SortableHeader>
                <SortableHeader field="status">Estado</SortableHeader>
                <TableHead>Conexión</TableHead>
                <SortableHeader field="lastActivity">Última Actividad</SortableHeader>
                <SortableHeader field="speed">Velocidad</SortableHeader>
                <SortableHeader field="battery">Batería</SortableHeader>
                <TableHead>Ubicación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron activos con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/50">
                    {/* Activo */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getAssetTypeIcon(asset.type)}</span>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.device?.imei || 'Sin IMEI'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Tipo */}
                    <TableCell>
                      <Badge variant="outline">
                        {asset.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    
                    {/* Estado */}
                    <TableCell>
                      <Badge variant={asset.status === 'ACTIVE' ? "outline" : "soft"}>
                        {asset.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    
                    {/* Conexión */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {asset.connectionStatus?.isConnected ? (
                          <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-600 text-sm">Online</span></>
                        ) : (
                          <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-red-600 text-sm">Offline</span></>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Última Actividad */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(asset.connectionStatus?.lastActivity)}
                      </div>
                    </TableCell>
                    
                    {/* Velocidad */}
                    <TableCell>
                      {asset.lastLocation?.speed ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Navigation className="h-3 w-3" />
                          {Math.round(asset.lastLocation.speed)} km/h
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Batería */}
                    <TableCell>
                      {asset.connectionStatus?.batteryLevel ? (
                        <div className="flex items-center gap-1">
                          <Battery className={`h-3 w-3 ${
                            (asset.connectionStatus?.batteryLevel || 0) < 20 ? 'text-red-500' :
                            (asset.connectionStatus?.batteryLevel || 0) < 50 ? 'text-yellow-500' :
                            'text-green-500'
                          }`} />
                          <span className={`text-sm ${
                            (asset.connectionStatus?.batteryLevel || 0) < 20 ? 'text-red-600' :
                            (asset.connectionStatus?.batteryLevel || 0) < 50 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {asset.connectionStatus?.batteryLevel || 0}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Ubicación */}
                    <TableCell>
                      {asset.lastLocation ? (
                        <div className="text-sm">
                          <div className="font-mono text-xs">
                            {asset.lastLocation.latitude.toFixed(4)}, {asset.lastLocation.longitude.toFixed(4)}
                          </div>
                          {asset.lastLocation.address && (
                            <div className="text-xs text-muted-foreground truncate max-w-32">
                              {asset.lastLocation.address}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin ubicación</span>
                      )}
                    </TableCell>
                    
                    {/* Acciones */}
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Resumen */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Total: {filteredAndSortedAssets.length} activos</span>
            <span>Conectados: {filteredAndSortedAssets.filter(a => a.connectionStatus?.isConnected).length}</span>
            <span>Activos: {filteredAndSortedAssets.filter(a => a.status === 'ACTIVE').length}</span>
          </div>
          
          {realTimeMetrics.lastUpdate && (
            <span>
              Última actualización: {realTimeMetrics.lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetsTable;
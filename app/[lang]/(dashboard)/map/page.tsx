"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Importar DeviceMap dinámicamente para evitar problemas de SSR
const DeviceMap = dynamic(() => import('@/components/devices/device-map').then(mod => mod.DeviceMap), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando mapa...</p>
            </div>
        </div>
    )
});

import { assetsService } from '@/lib/services/assets.service';
import { devicesService } from '@/lib/services/devices.service';
import { AssetResponse } from '@/lib/types/asset';
import { DeviceResponse, DeviceHistoryLocation } from '@/lib/types/device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SpeedLegend } from '@/components/ui/speed-legend';
import { useDeviceWebSocket } from '@/hooks/use-device-websocket';
import { useMultipleDevicesWebSocket } from '@/hooks/use-multiple-devices-websocket';
import { useResizableLayout } from '@/hooks/use-resizable-layout';
import { ResizeDivider } from '@/components/ui/resize-divider';
import { RealtimeRouteMap } from '@/components/devices/realtime-route-map';
import {
    ArrowLeft,
    Hash,
    Activity,
    Users,
    MapPin,
    Truck,
    Smartphone,
    Navigation,
    Wifi,
    WifiOff,
    Clock,
    Phone,
    Calendar,
    Battery
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store";
import { themes } from "@/config/thems";

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return 'Activo';
        case 'INACTIVE':
            return 'Inactivo';
        default:
            return status;
    }
};

const getAssetTypeLabel = (type: string) => {
    switch (type) {
        case 'HEAVY_LOAD':
            return 'Carga Pesada';
        case 'LIGHT_LOAD':
            return 'Carga Ligera';
        case 'MEDIUM_LOAD':
            return 'Carga Media';
        case 'PASSENGER':
            return 'Pasajeros';
        case 'CARGO':
            return 'Carga';
        case 'OTHER':
            return 'Otro';
        default:
            return type || '';
    }
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Interfaz para activos con información de dispositivo
interface AssetWithDevice extends AssetResponse {
    deviceDetails?: DeviceResponse;
    isOnline?: boolean;
    lastLocation?: { latitude: number; longitude: number; timestamp: string };
    recentPoints?: DeviceHistoryLocation[];
}

// Función para determinar si un dispositivo está conectado basado en su última actividad (fallback)
const isDeviceConnectedFallback = (lastLocation?: { timestamp: string }) => {
    if (!lastLocation?.timestamp) return false;
    
    const lastActivity = new Date(lastLocation.timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    // Considerar conectado si tuvo actividad en los últimos 5 minutos (reducido de 30 min)
    return diffInMinutes <= 5;
};

export default function MapPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<AssetWithDevice[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<AssetWithDevice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Theme configuration
    const { theme, setTheme, resolvedTheme: mode } = useTheme();
    const { theme: config, setTheme: setConfig } = useThemeStore();
    const newTheme = themes.find((theme) => theme.name === config);

    // Resizable layout hook
    const {
        panelWidth,
        isResizing,
        isDesktop,
        handleResizeStart,
        handleResizeEnd,
        setPanelWidth,
        validatePanelWidth
    } = useResizableLayout();

    // WebSocket para múltiples dispositivos
    const deviceImeis = assets
        .filter(asset => asset.deviceDetails?.imei)
        .map(asset => asset.deviceDetails!.imei!);
    
    const {
        isSocketConnected,
        devices: devicesConnectionMap,
        isDeviceConnected,
        getDeviceState,
        error: multiWsError
    } = useMultipleDevicesWebSocket({
        imeis: deviceImeis,
        enabled: deviceImeis.length > 0
    });

    // WebSocket para el activo seleccionado (datos GPS en tiempo real)
    const {
        isConnected,
        isConnecting,
        error: wsError,
        lastUpdate,
        gpsData,
        deviceConnectionStatus,
        deviceLastConnection,
        deviceLastActivity
    } = useDeviceWebSocket({
        imei: selectedAsset?.deviceDetails?.imei,
        enabled: !!selectedAsset?.deviceDetails?.imei
    });

    // Cargar todos los activos con sus dispositivos
    useEffect(() => {
        const fetchAssetsWithDevices = async () => {
            try {
                setLoading(true);
                const assetsData = await assetsService.getAll();

                // Enriquecer cada activo con información del dispositivo
                const enrichedAssets = await Promise.all(
                    assetsData.map(async (asset) => {
                        const enrichedAsset: AssetWithDevice = { ...asset };

                        if (asset.device?.id) {
                            try {
                                // Obtener detalles completos del dispositivo
                                const deviceDetails = await devicesService.getById(asset.device.id);
                                enrichedAsset.deviceDetails = deviceDetails;

                                // Obtener las últimas 5 posiciones
                                if (deviceDetails.imei) {
                                    try {
                                        // Usar un rango de fechas muy amplio para obtener todo el historial disponible
                                        const veryOldDate = new Date('2020-01-01').toISOString();
                                        const now = new Date().toISOString();

                                        const recentHistory = await devicesService.getHistory({
                                            deviceId: deviceDetails.imei,
                                            from: veryOldDate,
                                            to: now,
                                            limit: 10 // Solo 5 para carga inicial
                                        });

                                        // Ordenar por timestamp descendente (más reciente primero) y tomar las últimas 20
                                        const sortedHistory = recentHistory
                                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

                                        // enrichedAsset.recentPoints = sortedHistory.slice(0, 10);
                                        enrichedAsset.recentPoints = sortedHistory;

                                        if (sortedHistory.length > 0) {
                                            const latest = sortedHistory[0]; // El más reciente
                                            enrichedAsset.lastLocation = {
                                                latitude: latest.latitude,
                                                longitude: latest.longitude,
                                                timestamp: latest.timestamp
                                            };
                                            
                                            console.log(`📍 Cargadas ${enrichedAsset.recentPoints.length} posiciones históricas para ${asset.name}`);
                                        } else {
                                            console.log(`⚠️ Sin datos GPS recientes para ${asset.name}`);
                                        }
                                    } catch (historyError) {
                                        console.warn(`Error loading history for device ${deviceDetails.imei}:`, historyError);
                                    }
                                }
                            } catch (deviceError) {
                                console.warn(`Error loading device details for asset ${asset.id}:`, deviceError);
                            }
                        }

                        return enrichedAsset;
                    })
                );

                setAssets(enrichedAssets);

                // Seleccionar el primer activo con dispositivo por defecto
                const firstAssetWithDevice = enrichedAssets.find(a => a.deviceDetails);
                if (firstAssetWithDevice) {
                    setSelectedAsset(firstAssetWithDevice);
                }

            } catch (err) {
                console.error('Error fetching assets:', err);
                setError('Error al cargar los activos');
                toast.error('Error al cargar los activos');
            } finally {
                setLoading(false);
            }
        };

        fetchAssetsWithDevices();
    }, []);

    // Efecto para actualizar el estado de conexión de los assets con datos del WebSocket múltiple
    useEffect(() => {
        if (assets.length > 0 && devicesConnectionMap.size > 0) {
            setAssets(prevAssets => 
                prevAssets.map(asset => {
                    if (asset.deviceDetails?.imei) {
                        const deviceState = getDeviceState(asset.deviceDetails.imei);
                        
                        // Solo actualizar si tenemos datos específicos para este IMEI
                        if (deviceState) {
                            let connectionStatus = deviceState.isConnected;
                            
                            // Verificar actividad reciente específica de este dispositivo
                            if (deviceState.lastActivity) {
                                const timeSinceActivity = (new Date().getTime() - deviceState.lastActivity.getTime()) / (1000 * 60);
                                // Solo considerar conectado si la actividad es realmente reciente (2 minutos)
                                connectionStatus = timeSinceActivity <= 2;
                            }
                            
                            // Solo actualizar si el estado realmente cambió
                            if (asset.isOnline !== connectionStatus) {
                                console.log(`🔄 Actualizando estado de ${asset.name} (${asset.deviceDetails.imei}): ${asset.isOnline} → ${connectionStatus}`);
                                return {
                                    ...asset,
                                    isOnline: connectionStatus
                                };
                            }
                        } else if (asset.lastLocation && !asset.isOnline) {
                            // Solo aplicar fallback si no está conectado y tenemos ubicación
                            const fallbackStatus = isDeviceConnectedFallback(asset.lastLocation);
                            if (fallbackStatus !== asset.isOnline) {
                                return {
                                    ...asset,
                                    isOnline: fallbackStatus
                                };
                            }
                        }
                    }
                    return asset;
                })
            );
        }
    }, [devicesConnectionMap, getDeviceState, isDeviceConnected]);

    // Función para manejar la selección limpia de assets
    const handleAssetSelection = useCallback((asset: AssetWithDevice) => {
        console.log(`🎯 Seleccionando asset: ${asset.name} (ID: ${asset.id})`);
        
        // Si es el mismo asset, no hacer nada
        if (selectedAsset?.id === asset.id) {
            console.log(`⚠️ Asset ${asset.name} ya está seleccionado`);
            return;
        }
        
        // Limpiar completamente el estado del asset anterior
        if (selectedAsset) {
            console.log(`🧹 Limpiando datos del asset anterior: ${selectedAsset.name}`);
            
            // Resetear datos GPS y ubicación del asset anterior en la lista
            setAssets(prevAssets => 
                prevAssets.map(prevAsset => {
                    if (prevAsset.id === selectedAsset.id) {
                        // Mantener solo los datos históricos originales, limpiar datos en tiempo real
                        return {
                            ...prevAsset,
                            // No limpiar lastLocation ni recentPoints ya que son datos históricos válidos
                        };
                    }
                    return prevAsset;
                })
            );
        }
        
        // Validar coordenadas del nuevo asset
        if (asset.lastLocation) {
            const { latitude, longitude } = asset.lastLocation;
            if (typeof latitude === 'number' && typeof longitude === 'number' && 
                !isNaN(latitude) && !isNaN(longitude) && 
                latitude >= -90 && latitude <= 90 && 
                longitude >= -180 && longitude <= 180) {
                console.log(`📍 Coordenadas válidas del asset seleccionado: ${latitude}, ${longitude}`);
            } else {
                console.warn(`⚠️ Coordenadas inválidas para ${asset.name}:`, { latitude, longitude });
            }
        } else {
            console.warn(`⚠️ Asset ${asset.name} no tiene ubicación disponible`);
        }
        
        // Seleccionar el nuevo asset (esto activará el WebSocket para el nuevo IMEI)
        setSelectedAsset(asset);
        
        console.log(`✅ Asset ${asset.name} seleccionado exitosamente`);
    }, [selectedAsset]);

    // Efecto para limpiar datos del WebSocket cuando cambia el asset seleccionado
    useEffect(() => {
        if (selectedAsset) {
            console.log(`🔄 Asset seleccionado cambiado a: ${selectedAsset.name} (IMEI: ${selectedAsset.deviceDetails?.imei || 'N/A'})`);
            // Los datos del WebSocket se limpiarán automáticamente al cambiar el IMEI en useDeviceWebSocket
        }
    }, [selectedAsset?.id, selectedAsset?.deviceDetails?.imei]);

    // Efecto para actualizar la posición del asset seleccionado con datos GPS en tiempo real
    useEffect(() => {
        // Verificar que tenemos un asset seleccionado y datos GPS válidos
        if (!selectedAsset || !gpsData || !gpsData.data) {
            return;
        }
        
        // Verificar que los datos GPS corresponden al asset seleccionado
        const gpsDeviceId = gpsData.deviceId;
        const selectedDeviceImei = selectedAsset.deviceDetails?.imei;
        
        if (!selectedDeviceImei || gpsDeviceId !== selectedDeviceImei) {
            console.warn(`⚠️ Datos GPS ignorados: no corresponden al asset seleccionado. GPS IMEI: ${gpsDeviceId}, Asset IMEI: ${selectedDeviceImei}`);
            return;
        }
        
        console.log(`📡 Procesando datos GPS para asset seleccionado: ${selectedAsset.name} (IMEI: ${selectedDeviceImei})`);
        
        const { latitude: lat, longitude: lng, lat: altLat, lng: altLng, speed, course, rumbo } = gpsData.data;
        
        // Extraer coordenadas (soportar diferentes formatos)
        const newLatitude = lat || altLat;
        const newLongitude = lng || altLng;
        const newCourse = course || rumbo;
        
        // Validar coordenadas
        if (!newLatitude || !newLongitude || 
            typeof newLatitude !== 'number' || typeof newLongitude !== 'number' ||
            isNaN(newLatitude) || isNaN(newLongitude) ||
            newLatitude < -90 || newLatitude > 90 ||
            newLongitude < -180 || newLongitude > 180) {
            console.warn(`⚠️ Coordenadas GPS inválidas ignoradas:`, { newLatitude, newLongitude });
            return;
        }
        
        const newTimestamp = new Date().toISOString();
        
        // Crear nuevo punto GPS compatible con DeviceHistoryLocation
        const newGpsPoint: DeviceHistoryLocation = {
            id: Date.now(),
            deviceId: selectedDeviceImei,
            latitude: newLatitude,
            longitude: newLongitude,
            timestamp: newTimestamp,
            speed: speed || 0,
            course: newCourse || 0,
            createdAt: newTimestamp
        };
        
        console.log('🔍 DEBUG Nuevo punto GPS creado:', newGpsPoint);
        
        // Actualizar la posición del asset seleccionado inmediatamente
        setSelectedAsset(prevAsset => {
            if (!prevAsset || prevAsset.id !== selectedAsset.id) {
                return prevAsset;
            }
            
            // Mantener las últimas 10 posiciones para el trazado en tiempo real
            const currentPoints = prevAsset.recentPoints || [];
            // const updatedPoints = [newGpsPoint, ...currentPoints].slice(0, 10);
            const updatedPoints = [newGpsPoint, ...currentPoints];
            
            return {
                ...prevAsset,
                lastLocation: {
                    latitude: newLatitude,
                    longitude: newLongitude,
                    timestamp: newTimestamp
                },
                recentPoints: updatedPoints
            };
        });
        
        // También actualizar en la lista de assets - SOLO el asset seleccionado
        setAssets(prevAssets => 
            prevAssets.map(asset => {
                if (asset.id === selectedAsset.id) {
                    const currentPoints = asset.recentPoints || [];
                    // const updatedPoints = [newGpsPoint, ...currentPoints].slice(0, 10);
                    const updatedPoints = [newGpsPoint, ...currentPoints];
                    
                    return {
                        ...asset,
                        lastLocation: {
                            latitude: newLatitude,
                            longitude: newLongitude,
                            timestamp: newTimestamp
                        },
                        recentPoints: updatedPoints,
                        isOnline: true // Marcar como conectado si recibimos datos GPS
                    };
                }
                return asset;
            })
        );
        
        console.log(`🗺️ Posición actualizada para ${selectedAsset.name}: ${newLatitude}, ${newLongitude} | Puntos: ${(selectedAsset.recentPoints?.length || 0) + 1}`);
    }, [gpsData, selectedAsset?.id, selectedAsset?.deviceDetails?.imei]);

    // El WebSocket se mantiene solo para el asset seleccionado para datos en tiempo real
    // El estado de conexión de la lista se basa en la última actividad de cada dispositivo

    if (loading) {
        return (
            <div
                style={{
                    "--theme-primary": `hsl(${newTheme?.cssVars[mode === "dark" ? "dark" : "light"].primary})`,
                } as React.CSSProperties}
                className="min-h-screen bg-background flex items-center justify-center"
            >
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--theme-primary] mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando mapa en tiempo real...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    "--theme-primary": `hsl(${newTheme?.cssVars[mode === "dark" ? "dark" : "light"].primary})`,
                } as React.CSSProperties}
                className="min-h-screen bg-background flex items-center justify-center"
            >
                <div className="text-center">
                    <div className="text-destructive text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => router.back()} variant="outline" className="border-[--theme-primary] text-[--theme-primary] hover:bg-[--theme-primary] hover:text-primary-foreground">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                "--theme-primary": `hsl(${newTheme?.cssVars[mode === "dark" ? "dark" : "light"].primary})`,
            } as React.CSSProperties}
            className="min-h-screen bg-background font-sans"
        >
            {/* Header */}
            <div className="bg-card border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            if (selectedAsset?.deviceDetails?.id) {
                                router.push(`/devices/${selectedAsset.deviceDetails.id}`);
                            } else {
                                router.back();
                            }
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-[--theme-primary] hover:bg-[--theme-primary]/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Mapa en Tiempo Real
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
                {/* Left Panel - Assets List */}
                <div
                    className="order-1 w-full bg-background border-r border-border overflow-hidden transition-all duration-200 ease-out"
                    style={{
                        width: isDesktop ? `${panelWidth}%` : '100%'
                    }}
                >
                    <div className="p-4 lg:p-6 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-[--theme-primary]" />
                            Activos en Tiempo Real
                        </h3>

                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            <div className="space-y-3">
                                {assets.map((asset) => (
                                    <Card
                                        key={asset.id}
                                        className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedAsset?.id === asset.id
                                                ? 'border-2 border-[--theme-primary] bg-[--theme-primary]/5'
                                                : 'hover:bg-muted/50'
                                            }`}
                                        onClick={() => {
                                            // Función mejorada para selección limpia de assets
                                            handleAssetSelection(asset);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[--theme-primary] text-primary-foreground rounded-lg flex items-center justify-center">
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-foreground">{asset.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{getAssetTypeLabel(asset.assetType)}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge
                                                    variant={asset.status === 'ACTIVE' ? 'soft' : 'outline'}
                                                    className={asset.status === 'ACTIVE' ? 'bg-[--theme-primary] text-primary-foreground' : 'bg-muted text-muted-foreground'}
                                                >
                                                    {getStatusLabel(asset.status)}
                                                </Badge>
                                                {asset.deviceDetails && (
                                                    <div className="flex items-center gap-1">
                                                        {asset.isOnline ? (
                                                            <>
                                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                <span className="text-xs text-green-600 font-medium">Conectado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                                <span className="text-xs text-red-600 font-medium">Desconectado</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {asset.deviceDetails ? (
                                                <>
                                                    {/* Columna Izquierda */}
                                                    <div className="space-y-2">
                                                        {/* No. telefónico */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Phone className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">No. telefónico</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {asset.deviceDetails.client?.user?.phone || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* IMEI */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Hash className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">IMEI</div>
                                                                <div className="text-xs font-medium text-foreground font-mono truncate">
                                                                    {asset.deviceDetails.imei}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Creado */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Calendar className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">Creado</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {formatDate(asset.deviceDetails.createdAt)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Última conexión GPS */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Activity className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">Última conexión GPS</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {asset.lastLocation?.timestamp ? formatDate(asset.lastLocation.timestamp) : 'Sin conexión'}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    💾 Datos de base de datos
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Columna Derecha */}
                                                    <div className="space-y-2">
                                                        {/* Última posición recibida */}
                                                        {asset.lastLocation && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs text-muted-foreground">Última posición recibida</div>
                                                                    <div className="text-xs font-medium text-foreground truncate">
                                                                        {formatDate(asset.lastLocation.timestamp)}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        {asset.lastLocation.latitude.toFixed(6)}, {asset.lastLocation.longitude.toFixed(6)}
                                                                        {asset.recentPoints && asset.recentPoints.length > 0 && asset.recentPoints[0].speed && (
                                                                            <span className="ml-2">• {asset.recentPoints[0].speed.toFixed(1)} km/h</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Activo relacionado */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Truck className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">Activo relacionado</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {asset.name}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Cliente */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Users className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">Cliente</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    {asset.deviceDetails.client?.user?.name || 'Report Now'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Carga del dispositivo */}
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Battery className="h-4 w-4 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-muted-foreground">Carga del dispositivo</div>
                                                                <div className="text-xs font-medium text-foreground truncate">
                                                                    Sin datos
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                                                    <WifiOff className="h-4 w-4" />
                                                    <span className="text-xs">Sin dispositivo GPS</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resize Divider - Only visible on desktop */}
                <ResizeDivider
                    isResizing={isResizing}
                    isDesktop={isDesktop}
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                    className="order-2"
                />

                {/* Right Panel - Real-time Map (rediseñado con RealtimeRouteMap) */}
                <div
                    className="order-3 relative h-64 lg:h-full transition-all duration-200 ease-out"
                    style={{
                        width: isDesktop ? `${100 - panelWidth}%` : '100%',
                        flex: isDesktop ? 'none' : '1'
                    }}
                >
                    {selectedAsset ? (
                        <RealtimeRouteMap
                            imei={selectedAsset.deviceDetails?.imei || ''}
                            theme={mode}
                            // initialHistory={(selectedAsset.recentPoints || []).slice(0, 10)}
                            initialHistory={(selectedAsset.recentPoints || [])}
                            livePoint={gpsData?.data && selectedAsset.deviceDetails?.imei === gpsData.deviceId ? {
                                id: Date.now(),
                                deviceId: gpsData.deviceId,
                                latitude: gpsData.data.latitude || gpsData.data.lat,
                                longitude: gpsData.data.longitude || gpsData.data.lng,
                                timestamp: new Date().toISOString(),
                                course: gpsData.data.course || gpsData.data.rumbo || 0,
                                speed: gpsData.data.speed || 0,
                                createdAt: new Date().toISOString()
                            } : null}
                            isConnected={!!(gpsData?.data && selectedAsset.deviceDetails?.imei === gpsData.deviceId)}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <div className="text-center max-w-md px-4">
                                <MapPin className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-4 text-muted-foreground" />
                                <p className="text-sm lg:text-base text-muted-foreground font-medium">Selecciona un activo</p>
                                <p className="text-xs lg:text-sm text-muted-foreground/70 mt-1">Elige un activo de la lista para ver su ubicación en tiempo real</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
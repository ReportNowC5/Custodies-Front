"use client";
import React, { useEffect, useState } from 'react';
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
    Clock
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
    
    // Considerar conectado si tuvo actividad en los últimos 30 minutos
    return diffInMinutes <= 30;
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

                                // Obtener últimos 20 puntos del día actual
                                if (deviceDetails.imei) {
                                    try {
                                        const today = new Date();
                                        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

                                        const recentHistory = await devicesService.getHistory({
                                            deviceId: deviceDetails.imei,
                                            from: startOfDay.toISOString(),
                                            to: endOfDay.toISOString(),
                                            limit: 20
                                        });

                                        enrichedAsset.recentPoints = recentHistory.slice(0, 20);

                                        if (recentHistory.length > 0) {
                                            const latest = recentHistory[0];
                                            enrichedAsset.lastLocation = {
                                                latitude: latest.latitude,
                                                longitude: latest.longitude,
                                                timestamp: latest.timestamp
                                            };
                                            
                                            // El estado de conexión se actualizará con el WebSocket múltiple
                                            // Por ahora usar fallback basado en timestamp
                                            enrichedAsset.isOnline = isDeviceConnectedFallback(enrichedAsset.lastLocation);
                                        } else {
                                            // Sin datos recientes = desconectado
                                            enrichedAsset.isOnline = false;
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
                        const isConnectedViaWS = isDeviceConnected(asset.deviceDetails.imei);
                        
                        return {
                            ...asset,
                            isOnline: deviceState ? deviceState.isConnected : (asset.isOnline || false)
                        };
                    }
                    return asset;
                })
            );
        }
    }, [devicesConnectionMap, assets.length, getDeviceState, isDeviceConnected]);

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
                                        onClick={() => setSelectedAsset(asset)}
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

                                        <div className="space-y-2 text-sm">
                                            {asset.deviceDetails ? (
                                                <>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Smartphone className="h-4 w-4" />
                                                        <span>{asset.deviceDetails.brand} {asset.deviceDetails.model}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Hash className="h-4 w-4" />
                                                        <span className="font-mono text-xs">{asset.deviceDetails.imei}</span>
                                                    </div>
                                                    {asset.lastLocation && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <MapPin className="h-4 w-4" />
                                                            <span className="text-xs">
                                                                {asset.lastLocation.latitude.toFixed(4)}, {asset.lastLocation.longitude.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {asset.recentPoints && asset.recentPoints.length > 0 && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Clock className="h-4 w-4" />
                                                            <span className="text-xs">
                                                                {asset.recentPoints.length} puntos hoy
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-muted-foreground">
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

                {/* Right Panel - Real-time Map */}
                <div
                    className="order-3 relative h-64 lg:h-full transition-all duration-200 ease-out"
                    style={{
                        width: isDesktop ? `${100 - panelWidth}%` : '100%',
                        flex: isDesktop ? 'none' : '1'
                    }}
                >
                    {selectedAsset?.lastLocation ? (
                        <div className="relative w-full h-full">
                            <DeviceMap
                                latitude={selectedAsset.lastLocation.latitude}
                                longitude={selectedAsset.lastLocation.longitude}
                                deviceName={`${selectedAsset.name} (${selectedAsset.deviceDetails?.brand} ${selectedAsset.deviceDetails?.model})`}
                                className="w-full h-full"
                                historyLocations={selectedAsset.recentPoints || []}
                                showRoute={selectedAsset.recentPoints && selectedAsset.recentPoints.length > 1}
                                routeColor="#10B981"
                                routeWeight={3}
                                fitToRoute={false}
                                shouldFlyTo={false}
                                isPlaying={false}
                                currentLocationIndex={0}
                                showProgressiveRoute={false}
                                isHistoryView={false}
                                hasValidCoordinates={true}
                                isConnected={selectedAsset?.deviceDetails?.imei ? 
                            (isDeviceConnected(selectedAsset.deviceDetails.imei) || selectedAsset.isOnline || false) : 
                            (selectedAsset?.isOnline || false)
                        }
                                lastLocationUpdate={selectedAsset.lastLocation.timestamp}
                                theme={mode}
                            />

                            {/* Speed Legend */}
                            {selectedAsset.recentPoints && selectedAsset.recentPoints.length > 0 && (
                                <div className="absolute top-4 right-4 z-10">
                                    <SpeedLegend compact={true} className="bg-card/95 backdrop-blur-sm border border-border shadow-lg" />
                                </div>
                            )}

                            {/* Connection Status */}
                            <div className="absolute top-4 left-4 z-10">
                                <Card className="p-3 bg-card/95 backdrop-blur-sm border border-border shadow-lg">
                                    <div className="flex items-center gap-2">
                                        {(selectedAsset?.deviceDetails?.imei ? 
                            isDeviceConnected(selectedAsset.deviceDetails.imei) : 
                            selectedAsset?.isOnline
                        ) ? (
                            <>
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-green-600">Conectado</span>
                            </>
                        ) : (
                            <>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium text-red-600">Desconectado</span>
                            </>
                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {selectedAsset.recentPoints?.length || 0} puntos GPS hoy
                                        {selectedAsset.lastLocation && (
                                            <div className="mt-1">
                                                Última actividad: {new Date(selectedAsset.lastLocation.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Asset Info */}
                            <div className="absolute bottom-4 left-4 z-10">
                                <Card className="p-3 bg-card/95 backdrop-blur-sm border border-border shadow-lg max-w-xs">
                                    <div className="text-sm font-medium text-foreground mb-1">
                                        {selectedAsset.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {selectedAsset.lastLocation.latitude.toFixed(6)}, {selectedAsset.lastLocation.longitude.toFixed(6)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Última actualización: {formatDate(selectedAsset.lastLocation.timestamp)}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-4 text-muted-foreground" />
                                <p className="text-sm lg:text-base text-muted-foreground font-medium">
                                    {selectedAsset ? 'Sin datos de ubicación' : 'Selecciona un activo'}
                                </p>
                                <p className="text-xs lg:text-sm text-muted-foreground/70 mt-1">
                                    {selectedAsset
                                        ? 'Este activo no tiene datos GPS disponibles'
                                        : 'Elige un activo de la lista para ver su ubicación en tiempo real'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
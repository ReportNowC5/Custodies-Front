"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DeviceMap } from '@/components/devices/device-map';
import { BatteryIndicator } from '@/components/devices/battery-indicator';
import { useDeviceWebSocket } from '@/hooks/use-device-websocket';
import { useMapAnimations } from '@/hooks/use-map-animations';
import { devicesService } from '@/lib/services/devices.service';
import { DeviceResponse, DeviceStatusResponse } from '@/lib/types/device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Hash, Calendar, Activity, Users, MapPin, Battery } from 'lucide-react';
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

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Función para validar coordenadas GPS
const isValidCoordinate = (lat: any, lng: any) => {
    if (lat === null || lng === null || lat === undefined || lng === undefined) {
        return false;
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    return !isNaN(latitude) && !isNaN(longitude) && 
           latitude >= -90 && latitude <= 90 && 
           longitude >= -180 && longitude <= 180;
};

// Función para extraer coordenadas válidas de los datos GPS
const getValidCoordinates = (gpsData: any) => {
    if (!gpsData) return null;
    
    // Intentar parsear si es string JSON
    let parsedData = gpsData;
    if (typeof gpsData === 'string') {
        try {
            parsedData = JSON.parse(gpsData);
        } catch (e) {
            return null;
        }
    }
    
    // Solo procesar si es tipo 'location'
    if (parsedData.type !== 'location') {
        return null;
    }
    
    // Buscar coordenadas en el nuevo formato de datos
    let lat = null;
    let lng = null;
    
    // Formato nuevo: data.lat, data.lng
    if (parsedData.data && parsedData.data.lat && parsedData.data.lng) {
        lat = parsedData.data.lat;
        lng = parsedData.data.lng;
    }
    // Formatos alternativos
    else {
        lat = parsedData.latitude || parsedData.lat || null;
        lng = parsedData.longitude || parsedData.lng || parsedData.lon || null;
    }
    
    if (isValidCoordinate(lat, lng)) {
        return {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        };
    }
    
    return null;
};

// Función para extraer datos de batería del WebSocket
const getBatteryData = (gpsData: any) => {
    if (!gpsData) return null;
    
    // Intentar parsear si es string JSON
    let parsedData = gpsData;
    if (typeof gpsData === 'string') {
        try {
            parsedData = JSON.parse(gpsData);
        } catch (e) {
            return null;
        }
    }
    
    // Solo procesar si es tipo 'status' y tiene datos de voltaje
    if (parsedData.type !== 'status' || !parsedData.data) {
        return null;
    }
    
    const statusData = parsedData.data;
    const voltage = statusData.voltaje || statusData.voltage;
    
    if (voltage && !isNaN(parseFloat(voltage))) {
        return {
            voltage: parseFloat(voltage)
        };
    }
    
    return null;
};

export default function DeviceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [device, setDevice] = useState<DeviceResponse | null>(null);
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapCoordinates, setMapCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
    const [batteryData, setBatteryData] = useState<{voltage: number} | null>(null);
    const [lastConnection, setLastConnection] = useState<string | null>(null);
    const [lastPosition, setLastPosition] = useState<{timestamp: string, latitude: number, longitude: number} | null>(null);
    const [lastLocationUpdate, setLastLocationUpdate] = useState<string | null>(null);
    
    // Theme configuration
    const { theme, setTheme, resolvedTheme: mode } = useTheme();
    const { theme: config, setTheme: setConfig } = useThemeStore();
    const newTheme = themes.find((theme) => theme.name === config);
    
    // WebSocket connection for real-time GPS data
    const {
        isConnected,
        isConnecting,
        error: wsError,
        lastUpdate,
        gpsData,
        reconnectAttempts
    } = useDeviceWebSocket({
        imei: device?.imei,
        enabled: !!device?.imei
    });

    // Log connection status when IMEI is available
    useEffect(() => {
        if (device?.imei) {
            console.log('🚀 Dispositivo cargado - Iniciando conexión WebSocket');
            console.log('🎯 IMEI del dispositivo:', device.imei);
            console.log('📡 URL del WebSocket:', 'wss://suplentes7.incidentq.com/gps');
            console.log('🔄 Estado de conexión:', isConnected ? 'Conectado' : 'Desconectado');
        }
    }, [device?.imei, isConnected]);
    
    // Hook para manejar animaciones del mapa con seguimiento en tiempo real
    const mapAnimations = useMapAnimations({
        coordinates: mapCoordinates,
        isConnected,
        gpsData,
        autoFollow: true, // Habilitar seguimiento automático
        flyToDuration: 1300,
        shakeOnUpdate: true
    });

    // Toast de debug para datos WebSocket recibidos
    useEffect(() => {
        console.log('gpsData', gpsData);
        
        if (gpsData && device?.imei) {
            let parsedData = gpsData;
            if (typeof gpsData === 'string') {
                try {
                    parsedData = JSON.parse(gpsData);
                } catch (e) {
                    parsedData = { rawData: gpsData };
                }
            }

            // Mostrar toast de debug con información relevante
            const dataType = parsedData.type || 'unknown';
            const deviceId = parsedData.deviceId || parsedData.data?.imei || 'N/A';
            
            if (dataType === 'status') {
                const statusData = parsedData.data || {};
                toast.success(
                    `📊 Datos de estado recibidos`,
                    {
                        description: `Dispositivo: ${deviceId} | Voltaje: ${statusData.voltaje || 'N/A'}V | GSM: ${statusData.gsm || 'N/A'}/5 | Alarma: ${statusData.alarma === 0 ? 'Sin alarma' : statusData.alarma || 'N/A'}`,
                        duration: 3000,
                        className: 'border-l-4 border-l-green-500'
                    }
                );
            } else if (dataType === 'location') {
                const coords = getValidCoordinates(gpsData);
                toast.info(
                    `📍 Datos de ubicación recibidos`,
                    {
                        description: coords 
                            ? `Dispositivo: ${deviceId} | Lat: ${coords.latitude.toFixed(6)} | Lng: ${coords.longitude.toFixed(6)}`
                            : `Dispositivo: ${deviceId} | Sin coordenadas válidas`,
                        duration: 3000,
                        className: 'border-l-4 border-l-blue-500'
                    }
                );
            } else {
                toast(
                    `📡 Datos WebSocket recibidos`,
                    {
                        description: `Dispositivo: ${deviceId} | Tipo: ${dataType} | Timestamp: ${new Date().toLocaleTimeString()}`,
                        duration: 2000,
                        className: 'border-l-4 border-l-purple-500'
                    }
                );
            }
        }
    }, [gpsData, device?.imei]);

    // Actualizar coordenadas del mapa cuando lleguen datos GPS válidos
    useEffect(() => {
        const validCoords = getValidCoordinates(gpsData);
        if (validCoords) {
            console.log('📍 Actualizando coordenadas del mapa:', validCoords);
            setMapCoordinates(validCoords);
            setLastLocationUpdate(new Date().toISOString());
            setLastPosition({
                timestamp: new Date().toISOString(),
                latitude: validCoords.latitude,
                longitude: validCoords.longitude
            });
        }
    }, [gpsData]);

    // Actualizar última conexión cuando se conecte el WebSocket
    useEffect(() => {
        if (isConnected) {
            setLastConnection(new Date().toISOString());
        }
    }, [isConnected]);

    // Actualizar datos de batería cuando lleguen datos de estado
    useEffect(() => {
        const batteryInfo = getBatteryData(gpsData);
        if (batteryInfo) {
            console.log('🔋 Actualizando datos de batería:', batteryInfo);
            setBatteryData(batteryInfo);
        }
    }, [gpsData]);

    useEffect(() => {
        const fetchDeviceData = async () => {
            try {
                setLoading(true);
                
                // Cargar datos básicos del dispositivo
                const deviceData = await devicesService.getById(params.id as string);
                setDevice(deviceData);                
                
                // Cargar estado consolidado del dispositivo usando el IMEI
                if (deviceData?.imei) {
                    try {
                        const statusData = await devicesService.getDeviceStatus(deviceData.imei);
                        setDeviceStatus(statusData);
                        
                        // Procesar datos de ubicación del estado consolidado
                        if (statusData.data.location && statusData.data.summary.has_location) {
                            setMapCoordinates({
                                latitude: statusData.data.location.lat,
                                longitude: statusData.data.location.lng
                            });
                            
                            setLastPosition({
                                timestamp: statusData.data.location.timestamp,
                                latitude: statusData.data.location.lat,
                                longitude: statusData.data.location.lng
                            });
                            
                            setLastLocationUpdate(statusData.data.location.updated_at);
                        }
                        
                        // Procesar datos de conexión del estado consolidado
                        if (statusData.data.connection && statusData.data.summary.has_connection_info) {
                            setLastConnection(statusData.data.connection.connected_at);
                        }
                        
                        console.log('📊 Estado consolidado del dispositivo cargado:', statusData);
                    } catch (statusErr) {
                        console.warn('⚠️ Error al cargar estado consolidado, usando datos básicos:', statusErr);
                        // Continuar con datos básicos si el endpoint consolidado falla
                    }
                }
            } catch (err) {
                console.error('Error fetching device:', err);
                setError('Error al cargar los datos del dispositivo');
                toast.error('Error al cargar los datos del dispositivo');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchDeviceData();
        }
    }, [params.id]);

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
                    <p className="text-muted-foreground">Cargando datos del dispositivo...</p>
                </div>
            </div>
        );
    }

    if (error || !device) {
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
                    <p className="text-muted-foreground mb-4">{error || 'Dispositivo no encontrado'}</p>
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
                        onClick={() => router.back()}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-[--theme-primary] hover:bg-[--theme-primary]/10"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Detalles del dispositivo
                    </Button>
                </div>
            </div>

            {/* Main Content - Mobile First Layout */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
                {/* Map Section - Top on mobile, Right on desktop */}
                <div className="order-1 lg:order-2 flex-1 relative h-64 lg:h-full">
                    <DeviceMap
                        latitude={mapCoordinates?.latitude || (deviceStatus?.data?.location?.lat || device?.location?.latitude || 19.4326)}
                        longitude={mapCoordinates?.longitude || (deviceStatus?.data?.location?.lng || device?.location?.longitude || -99.1332)}
                        deviceName={`${device.brand} ${device.model}`}
                        className="w-full h-full"
                        shouldFlyTo={mapAnimations.shouldFlyTo}
                        shouldShakeMarker={mapAnimations.shouldShakeMarker}
                        onAnimationComplete={mapAnimations.onAnimationComplete}
                        hasValidCoordinates={!!mapCoordinates || !!deviceStatus?.data?.summary?.has_location}
                        isConnected={isConnected || deviceStatus?.data?.summary?.is_connected || false}
                        lastLocationUpdate={lastPosition?.timestamp || deviceStatus?.data?.location?.timestamp || null}
                        theme={mode}
                    />
                </div>

                {/* Device Info Section - Bottom on mobile, Left on desktop */}
                <div className="order-2 lg:order-1 w-full lg:w-1/3 bg-card border-t lg:border-t-0 lg:border-r border-border p-4 lg:p-6 overflow-y-auto flex-shrink-0">
                    {/* Device Header */}
                    <div className="mb-4 lg:mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[--theme-primary] text-primary-foreground rounded-lg flex items-center justify-center">
                                    <Hash className="h-5 w-5 lg:h-6 lg:w-6" />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">#{device.id.toString().padStart(5, '0')}</div>
                                    <h2 className="text-base lg:text-lg font-semibold text-foreground">{device.brand}</h2>
                                    <div className="text-sm text-muted-foreground">{device.model}</div>
                                </div>
                            </div>
                            <Badge
                                variant={device.status === 'ACTIVE' ? 'soft' : 'outline'}
                                className={device.status === 'ACTIVE' ? 'bg-[--theme-primary] text-primary-foreground px-3 py-1' : 'bg-destructive text-destructive-foreground px-3 py-1'}
                            >
                                {getStatusLabel(device.status)}
                            </Badge>
                        </div>
                    </div>

                    {/* Device Details List */}
                    <div className="space-y-3 lg:space-y-4">
                        {/* Phone Number */}
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">No. telefónico</div>
                                <div className="text-sm font-medium text-foreground truncate">{device.client?.user?.phone || 'N/A'}</div>
                            </div>
                        </div>

                        {/* IMEI */}
                        <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">IMEI</div>
                                <div className="text-sm font-medium text-foreground font-mono truncate">{device.imei}</div>
                            </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">Creado</div>
                                <div className="text-sm font-medium text-foreground truncate">{formatDate(device.createdAt)}</div>
                            </div>
                        </div>

                        {/* Last Connection */}
                        <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">Última conexión</div>
                                <div className="text-sm font-medium text-foreground truncate">
                                    {lastConnection || deviceStatus?.data?.connection?.connected_at 
                                        ? formatDate(lastConnection || deviceStatus?.data?.connection?.connected_at || '') 
                                        : 'Sin conexión'}
                                </div>
                                {/*{deviceStatus?.data?.summary?.is_connected && (
                                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        Conectado ({deviceStatus.data.connection.connection_duration_seconds}s)
                                    </div>
                                )}*/}
                            </div>
                        </div>

                        {/* Last Position */}
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">Última posición recibida</div>
                                <div className="text-sm font-medium text-foreground truncate">
                                    {lastPosition?.timestamp || deviceStatus?.data?.location?.timestamp 
                                        ? formatDate(lastPosition?.timestamp || deviceStatus?.data?.location?.timestamp || '') 
                                        : 'Sin posición'}
                                </div>
                                {(lastPosition || deviceStatus?.data?.location) && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {(lastPosition?.latitude || deviceStatus?.data?.location?.lat)?.toFixed(6)}, {(lastPosition?.longitude || deviceStatus?.data?.location?.lng)?.toFixed(6)}
                                        {deviceStatus?.data?.location?.speed_kmh !== undefined && (
                                            <span className="ml-2">• {deviceStatus.data.location.speed_kmh} km/h</span>
                                        )}
                                    </div>
                                )}
                                {/*{deviceStatus?.data?.summary?.location_is_recent && (
                                    <div className="text-xs text-green-600 mt-1">
                                        📍 Ubicación reciente ({deviceStatus.data.location.age_seconds}s)
                                    </div>
                                )}*/}
                            </div>
                        </div>

                        {/* Related Asset */}
                        <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">Activo relacionado</div>
                                {
                                    device.assets?.map((item) => {
                                        return (
                                            <div key={item.id}>
                                                <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs lg:text-sm text-muted-foreground">Cliente</div>
                                <div className="text-sm font-medium text-foreground truncate">{device.client?.user?.name || 'Report Now'}</div>
                            </div>
                        </div>

                        {/* Battery Status */}
                        {batteryData && (
                            <div className="flex items-center gap-3">
                                <Battery className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs lg:text-sm text-muted-foreground">Carga del dispositivo</div>
                                    <div className="mt-1">
                                        <BatteryIndicator
                                            voltage={batteryData.voltage}
                                            size="sm"
                                            showVoltage={true}
                                            showPercentage={true}
                                            className=""
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Real-time Status Section */}
                    {/*<div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 lg:mb-4">Estado en Tiempo Real</h3>
                        <RealTimeStatus
                            isConnected={isConnected}
                            isConnecting={isConnecting}
                            error={wsError}
                            lastUpdate={lastUpdate}
                            gpsData={gpsData}
                            reconnectAttempts={reconnectAttempts}
                        />
                    </div>*/}
                </div>
            </div>
        </div>
    );
}
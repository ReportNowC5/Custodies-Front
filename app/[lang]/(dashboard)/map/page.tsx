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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    Battery,
    History,
    Filter,
    ChevronDown,
    ChevronUp,
    Award
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
    historicalData?: DeviceHistoryLocation[]; // Datos históricos filtrados
}

// Interfaz para el estado de filtros de historial
interface HistoryFilter {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
}

// Función para obtener fechas por defecto (últimas 24 horas)
const getDefaultDateRange = () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
        startDate: yesterday.toISOString().split('T')[0],
        startTime: '00:00',
        endDate: yesterday.toISOString().split('T')[0],
        endTime: '23:59'
    };
};

// Función para determinar si un dispositivo está conectado basado en su última actividad (fallback)
const isDeviceConnectedFallback = (lastLocation?: { timestamp: string }) => {
    if (!lastLocation?.timestamp) return false;
    
    const lastActivity = new Date(lastLocation.timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    // Considerar conectado si tuvo actividad en los últimos 5 minutos (reducido de 30 min)
    return diffInMinutes <= 5;
};

// Función para calcular la distancia entre dos puntos GPS (fórmula de Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en kilómetros
};

// Función para calcular la distancia total recorrida basada en puntos del historial
const calculateTotalDistance = (points: DeviceHistoryLocation[]): number => {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
        const prevPoint = points[i-1];
        const currentPoint = points[i];
        totalDistance += calculateDistance(
            prevPoint.latitude,
            prevPoint.longitude,
            currentPoint.latitude,
            currentPoint.longitude
        );
    }
    
    return totalDistance;
};

export default function MapPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<AssetWithDevice[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<AssetWithDevice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para el sistema de historial
    const [assetsWithHistoryEnabled, setAssetsWithHistoryEnabled] = useState<Set<number>>(new Set());
    const [historyFilters, setHistoryFilters] = useState<Record<number, HistoryFilter>>({});
    const [loadingHistory, setLoadingHistory] = useState<Set<number>>(new Set());
    const [expandedHistoryControls, setExpandedHistoryControls] = useState<Set<number>>(new Set());
    
    // Estado para el manejo de vistas
    const [showAssetDetails, setShowAssetDetails] = useState(false);
    
    // Estado para manejar el punto seleccionado del historial
    const [selectedHistoryPoint, setSelectedHistoryPoint] = useState<DeviceHistoryLocation | null>(null);
    
    // Referencia al componente del mapa para controlar la vista
    const [mapRef, setMapRef] = useState<any>(null);

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
                                            limit: 999999
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
        if (devicesConnectionMap.size > 0) {
            setAssets(prevAssets => {
                if (prevAssets.length === 0) return prevAssets;
                
                let hasChanges = false;
                const updatedAssets = prevAssets.map(asset => {
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
                                hasChanges = true;
                                return {
                                    ...asset,
                                    isOnline: connectionStatus
                                };
                            }
                        } else if (asset.lastLocation && !asset.isOnline) {
                            // Solo aplicar fallback si no está conectado y tenemos ubicación
                            const fallbackStatus = isDeviceConnectedFallback(asset.lastLocation);
                            if (fallbackStatus !== asset.isOnline) {
                                hasChanges = true;
                                return {
                                    ...asset,
                                    isOnline: fallbackStatus
                                };
                            }
                        }
                    }
                    return asset;
                });
                
                // Solo actualizar el estado si realmente hay cambios
                return hasChanges ? updatedAssets : prevAssets;
            });
        }
    }, [devicesConnectionMap]); // Solo depender del mapa de conexiones

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
        
        // Cambiar a la vista de detalles del dispositivo
        setShowAssetDetails(true);
        
        console.log(`✅ Asset ${asset.name} seleccionado exitosamente`);
    }, [selectedAsset]);

    // Función para volver al listado de activos
    const handleBackToAssetList = useCallback(() => {
        setShowAssetDetails(false);
        // Mantener el asset seleccionado para el mapa pero mostrar la vista de listado
    }, []);
    
    // Función para manejar clic en elemento del historial
    const handleHistoryPointClick = useCallback((point: DeviceHistoryLocation) => {
        // Validar coordenadas antes de proceder
        if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' ||
            isNaN(point.latitude) || isNaN(point.longitude) ||
            point.latitude < -90 || point.latitude > 90 ||
            point.longitude < -180 || point.longitude > 180) {
            console.warn('⚠️ Coordenadas inválidas en punto del historial:', point);
            return;
        }
        
        setSelectedHistoryPoint(point);
        console.log(`📍 Centrando mapa en punto del historial: ${point.latitude}, ${point.longitude}`);
    }, []);

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
            const updatedPoints = [newGpsPoint, ...currentPoints].slice(0, 10);
            
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
                    const updatedPoints = [newGpsPoint, ...currentPoints].slice(0, 10);
                    
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
        
        console.log(`🗺️ Posición actualizada para ${selectedAsset.name}: ${newLatitude}, ${newLongitude}`);
    }, [gpsData?.deviceId, gpsData?.data, selectedAsset?.id, selectedAsset?.deviceDetails?.imei]);

    // Función para convertir fecha y hora local a UTC
    const convertToUTC = (dateStr: string, timeStr: string) => {
        const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
        return localDateTime.toISOString();
    };

    // Función para cargar historial de un activo específico
    const loadAssetHistory = async (asset: AssetWithDevice, filters: HistoryFilter) => {
        if (!asset.deviceDetails?.imei) {
            toast.error('No hay dispositivo asociado al activo');
            return;
        }

        const assetId = asset.id;
        setLoadingHistory(prev => new Set([...prev, assetId]));

        try {
            const fromDateTimeUTC = convertToUTC(filters.startDate, filters.startTime);
            const toDateTimeUTC = convertToUTC(filters.endDate, filters.endTime);

            console.log(`🔍 Cargando historial para ${asset.name} (${asset.deviceDetails.imei})`);
            console.log('Rango de fechas:', { from: fromDateTimeUTC, to: toDateTimeUTC });

            const history = await devicesService.getHistory({
                deviceId: asset.deviceDetails.imei,
                from: fromDateTimeUTC,
                to: toDateTimeUTC,
                page: 1,
                limit: 999999
            });

            // Ordenar por fecha descendente (más reciente primero)
            history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Actualizar el activo con los datos históricos
            setAssets(prevAssets => 
                prevAssets.map(prevAsset => 
                    prevAsset.id === assetId 
                        ? { ...prevAsset, historicalData: history }
                        : prevAsset
                )
            );

            // Si es el activo seleccionado, también actualizar el estado seleccionado
            if (selectedAsset?.id === assetId) {
                setSelectedAsset(prev => prev ? { ...prev, historicalData: history } : null);
            }

            toast.success(`Historial cargado para ${asset.name}`, {
                description: `Se encontraron ${history.length} ubicaciones`
            });

            console.log(`✅ Historial cargado para ${asset.name}: ${history.length} puntos`);
        } catch (error) {
            console.error(`Error loading history for asset ${asset.name}:`, error);
            toast.error(`Error al cargar historial de ${asset.name}`, {
                description: 'No se pudo obtener el historial de ubicaciones'
            });
        } finally {
            setLoadingHistory(prev => {
                const newSet = new Set(prev);
                newSet.delete(assetId);
                return newSet;
            });
        }
    };

    // Función para manejar el toggle del checkbox de historial
    const handleHistoryToggle = (asset: AssetWithDevice, enabled: boolean) => {
        const assetId = asset.id;
        
        if (enabled) {
            // Habilitar historial
            setAssetsWithHistoryEnabled(prev => new Set([...prev, assetId]));
            
            // Inicializar filtros con valores por defecto si no existen
            if (!historyFilters[assetId]) {
                const defaultFilters = getDefaultDateRange();
                setHistoryFilters(prev => ({
                    ...prev,
                    [assetId]: defaultFilters
                }));
                
                // Cargar historial inmediatamente con filtros por defecto
                loadAssetHistory(asset, defaultFilters);
            } else {
                // Cargar historial con filtros existentes
                loadAssetHistory(asset, historyFilters[assetId]);
            }
            
            // Expandir controles automáticamente
            setExpandedHistoryControls(prev => new Set([...prev, assetId]));
        } else {
            // Deshabilitar historial
            setAssetsWithHistoryEnabled(prev => {
                const newSet = new Set(prev);
                newSet.delete(assetId);
                return newSet;
            });
            
            // Limpiar datos históricos
            setAssets(prevAssets => 
                prevAssets.map(prevAsset => 
                    prevAsset.id === assetId 
                        ? { ...prevAsset, historicalData: undefined }
                        : prevAsset
                )
            );
            
            // Si es el activo seleccionado, también limpiar el estado seleccionado
            if (selectedAsset?.id === assetId) {
                setSelectedAsset(prev => prev ? { ...prev, historicalData: undefined } : null);
            }
            
            // Colapsar controles
            setExpandedHistoryControls(prev => {
                const newSet = new Set(prev);
                newSet.delete(assetId);
                return newSet;
            });
        }
    };

    // Función para actualizar filtros de un activo
    const updateHistoryFilters = (assetId: number, filters: Partial<HistoryFilter>) => {
        setHistoryFilters(prev => ({
            ...prev,
            [assetId]: { ...prev[assetId], ...filters }
        }));
    };

    // Función para aplicar filtros de historial
    const applyHistoryFilters = (asset: AssetWithDevice) => {
        const filters = historyFilters[asset.id];
        if (!filters) return;
        
        // Validación: Solo permitir filtrar por un día completo
        //if (filters.startDate !== filters.endDate) {
        //    toast.error('Error de filtrado', {
        //        description: 'Solo se permite filtrar por un día completo. Selecciona la misma fecha para inicio y fin.'
        //    });
        //    return;
        //}
        
        // Validación: Bloquear fechas futuras
        const today = new Date().toISOString().split('T')[0];
        if (filters.startDate > today) {
            toast.error('Fecha inválida', {
                description: 'No se pueden seleccionar fechas futuras.'
            });
            return;
        }
        
        // Validación: Verificar que la hora de inicio sea anterior a la hora de fin
        const startDateTime = new Date(`${filters.startDate}T${filters.startTime}:00`);
        const endDateTime = new Date(`${filters.endDate}T${filters.endTime}:00`);
        
        if (startDateTime >= endDateTime) {
            toast.error('Horario inválido', {
                description: 'La hora de inicio debe ser anterior a la hora de fin.'
            });
            return;
        }
        
        // Validación: Limitar el rango máximo a 24 horas
        const timeDiffHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
        if (timeDiffHours > 24) {
            toast.error('Rango de tiempo excedido', {
                description: 'El rango de filtrado no puede exceder las 24 horas.'
            });
            return;
        }
        
        loadAssetHistory(asset, filters);
    };

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
                            if (showAssetDetails) {
                                handleBackToAssetList();
                            } else if (selectedAsset?.deviceDetails?.id) {
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
                        {showAssetDetails ? 'Volver al listado de activos' : 'Mapa en Tiempo Real'}
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
                        {!showAssetDetails ? (
                            // Vista de listado de activos
                            <>
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

                                        {/* Información básica simplificada */}
                                        <div className="text-sm">
                                            {asset.deviceDetails ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Hash className="h-4 w-4 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-muted-foreground">IMEI</div>
                                                            <div className="text-xs font-medium text-foreground font-mono truncate">
                                                                {asset.deviceDetails.imei}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {asset.lastLocation && (
                                                        <div className="text-right">
                                                            <div className="text-xs text-muted-foreground">Última ubicación</div>
                                                            <div className="text-xs font-medium text-foreground">
                                                                {formatDate(asset.lastLocation.timestamp)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
                            </>
                        ) : (
                            // Vista de detalles del dispositivo
                            selectedAsset && (
                                <>
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                            <Smartphone className="h-5 w-5 text-[--theme-primary]" />
                                            Información del Dispositivo
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{selectedAsset.name}</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                                        {/* Información completa del activo */}
                                        <Card className="p-4">
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-[--theme-primary]" />
                                                Información del Activo
                                            </h4>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Nombre del activo</div>
                                                        <div className="font-medium text-foreground">{selectedAsset.name}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Tipo de activo</div>
                                                        <div className="text-foreground">{getAssetTypeLabel(selectedAsset.assetType)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Award className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Estado del activo</div>
                                                        <div className="text-foreground">{getStatusLabel(selectedAsset.status)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Información del dispositivo GPS */}
                                        <Card className="p-4">
                                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <Smartphone className="h-4 w-4 text-[--theme-primary]" />
                                                Dispositivo GPS
                                            </h4>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">IMEI</div>
                                                        <div className="font-mono text-foreground">{selectedAsset.deviceDetails?.imei}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">No. telefónico</div>
                                                        <div className="text-foreground">{selectedAsset.deviceDetails?.client?.user?.phone || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Cliente</div>
                                                        <div className="text-foreground">{selectedAsset.deviceDetails?.client?.user?.name || 'Report Now'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Fecha de creación</div>
                                                        <div className="text-foreground">{selectedAsset.deviceDetails?.createdAt ? formatDate(selectedAsset.deviceDetails.createdAt) : 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Última conexión GPS</div>
                                                        <div className="text-foreground">
                                                            {selectedAsset.lastLocation?.timestamp ? formatDate(selectedAsset.lastLocation.timestamp) : 'Sin conexión'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            💾 Datos de base de datos
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedAsset.lastLocation && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="text-xs text-muted-foreground">Última posición recibida</div>
                                                            <div className="text-foreground">
                                                                {formatDate(selectedAsset.lastLocation.timestamp)}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {selectedAsset.lastLocation.latitude.toFixed(6)}, {selectedAsset.lastLocation.longitude.toFixed(6)}
                                                                {selectedAsset.recentPoints && selectedAsset.recentPoints.length > 0 && selectedAsset.recentPoints[0].speed && (
                                                                    <span className="ml-2">• {selectedAsset.recentPoints[0].speed.toFixed(1)} km/h</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    {selectedAsset.isOnline ? (
                                                        <Wifi className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <WifiOff className="h-4 w-4 text-red-500" />
                                                    )}
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Estado de conexión</div>
                                                        <div className={`font-medium ${
                                                            selectedAsset.isOnline ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                            {selectedAsset.isOnline ? 'Conectado' : 'Desconectado'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Battery className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Carga del dispositivo</div>
                                                        <div className="text-foreground">Sin datos</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Historial completo del activo */}
                                        <Card className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                    <History className="h-4 w-4 text-[--theme-primary]" />
                                                    Historial Completo
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`full-history-${selectedAsset.id}`}
                                                        checked={assetsWithHistoryEnabled.has(selectedAsset.id)}
                                                        onCheckedChange={(checked) => handleHistoryToggle(selectedAsset, !!checked)}
                                                        className="border-[--theme-primary] data-[state=checked]:bg-[--theme-primary] data-[state=checked]:border-[--theme-primary]"
                                                    />
                                                    <label 
                                                        htmlFor={`full-history-${selectedAsset.id}`}
                                                        className="text-sm font-medium text-foreground cursor-pointer"
                                                    >
                                                        Mostrar historial
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Controles de filtrado mejorados */}
                                            {assetsWithHistoryEnabled.has(selectedAsset.id) && (
                                                <div className="space-y-3 mb-4">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                                                            <Input
                                                                type="date"
                                                                value={historyFilters[selectedAsset.id]?.startDate || ''}
                                                                onChange={(e) => {
                                                                    const selectedDate = e.target.value;
                                                                    // Sincronización automática: startDate y endDate siempre iguales
                                                                    updateHistoryFilters(selectedAsset.id, { 
                                                                        startDate: selectedDate,
                                                                        endDate: selectedDate // Automáticamente sincronizar endDate
                                                                    });
                                                                }}
                                                                max={new Date().toISOString().split('T')[0]}
                                                                className="h-8 text-xs border-border"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground">Hora inicio</label>
                                                            <Input
                                                                type="time"
                                                                value={historyFilters[selectedAsset.id]?.startTime || '00:00'}
                                                                onChange={(e) => updateHistoryFilters(selectedAsset.id, { startTime: e.target.value })}
                                                                className="h-8 text-xs border-border"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground">Hora fin</label>
                                                            <Input
                                                                type="time"
                                                                value={historyFilters[selectedAsset.id]?.endTime || '23:59'}
                                                                onChange={(e) => updateHistoryFilters(selectedAsset.id, { endTime: e.target.value })}
                                                                className="h-8 text-xs border-border"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground">Acción</label>
                                                            <Button
                                                                onClick={() => applyHistoryFilters(selectedAsset)}
                                                                disabled={loadingHistory.has(selectedAsset.id)}
                                                                size="sm"
                                                                className="h-8 text-xs bg-[--theme-primary] text-primary-foreground hover:bg-[--theme-primary]/90 w-full"
                                                            >
                                                                <Filter className="h-3 w-3 mr-1" />
                                                                {loadingHistory.has(selectedAsset.id) ? 'Cargando...' : 'Filtrar'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Información del historial cargado y distancia total */}
                                                    {selectedAsset.historicalData && selectedAsset.historicalData.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                                                📊 {selectedAsset.historicalData.length} ubicaciones cargadas
                                                            </div>
                                                            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
                                                                🛣️ Distancia: {calculateTotalDistance(selectedAsset.historicalData).toFixed(2)} km
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Mostrar distancia 0 cuando no hay historial filtrado */}
                                                    {assetsWithHistoryEnabled.has(selectedAsset.id) && (!selectedAsset.historicalData || selectedAsset.historicalData.length === 0) && (
                                                        <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
                                                            🛣️ Distancia total recorrida: 0.00 km
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Lista de ubicaciones recientes con funcionalidad de clic */}
                                            {assetsWithHistoryEnabled.has(selectedAsset.id) && (
                                                <ScrollArea className="h-64">
                                                    <div className="space-y-2">
                                                        {(selectedAsset.historicalData || selectedAsset.recentPoints || []).map((point, index) => (
                                                            <div 
                                                                key={point.id || index} 
                                                                className="flex items-center gap-3 p-2 bg-muted/30 rounded text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                                                                onClick={() => handleHistoryPointClick(point)}
                                                                title="Haz clic para centrar el mapa en esta ubicación"
                                                            >
                                                                <MapPin className="h-3 w-3 text-[--theme-primary] flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-foreground">
                                                                        {formatDate(point.timestamp)}
                                                                    </div>
                                                                    <div className="text-muted-foreground truncate">
                                                                        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                                                                    </div>
                                                                    {point.speed && (
                                                                        <div className="text-muted-foreground">
                                                                            Velocidad: {point.speed.toFixed(1)} km/h
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Navigation className="h-3 w-3 text-muted-foreground opacity-50" />
                                                            </div>
                                                        ))}
                                                        {(!selectedAsset.recentPoints || selectedAsset.recentPoints.length === 0) && (
                                                            <div className="text-center text-muted-foreground py-4">
                                                                No hay datos de ubicación disponibles
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            )}
                                        </Card>
                                    </div>
                                </>
                            )
                        )}
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
                            ref={setMapRef}
                            imei={selectedAsset.deviceDetails?.imei || ''}
                            theme={mode}
                            // Priorizar datos históricos si están disponibles, sino usar datos recientes
                            initialHistory={
                                assetsWithHistoryEnabled.has(selectedAsset.id) && selectedAsset.historicalData
                                    ? selectedAsset.historicalData
                                    : (selectedAsset.recentPoints || [])
                            }
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
                            // Indicar si estamos mostrando datos históricos
                            showingHistoricalData={assetsWithHistoryEnabled.has(selectedAsset.id) && !!selectedAsset.historicalData}
                            // Limitar puntos solo cuando NO se muestra historial
                            limitPoints={!assetsWithHistoryEnabled.has(selectedAsset.id)}
                            // Punto seleccionado del historial
                            selectedHistoryPoint={selectedHistoryPoint}
                        />
                    ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <div className="text-center max-w-md px-4">
                                <MapPin className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                    Selecciona un activo para visualizar
                                </h3>
                                <p className="text-xs lg:text-sm text-muted-foreground/70 mt-1">Elige un activo de la lista para ver su ubicación en tiempo real</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
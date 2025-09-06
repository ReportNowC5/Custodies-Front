"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    ArrowLeft, 
    Hash, 
    Calendar, 
    Activity, 
    Users, 
    MapPin, 
    Battery,
    Truck,
    Smartphone,
    Edit,
    Trash2,
    Play,
    Pause,
    Square,
    Filter,
    Clock,
    Navigation,
    SkipForward,
    SkipBack
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from "next-themes";
import { useThemeStore } from "@/store";
import { themes } from "@/config/thems";
import { useResizableLayout } from '@/hooks/use-resizable-layout';
import { ResizeDivider } from '@/components/ui/resize-divider';
import { SpeedLegend } from '@/components/ui/speed-legend';

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

const formatHistoryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Función para obtener fechas por defecto (día actual)
const getDefaultDateRange = () => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // Día actual
    return { 
        startDate: currentDate, 
        endDate: currentDate,
        startTime: '00:00',
        endTime: '23:59'
    };
};

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [asset, setAsset] = useState<AssetResponse | null>(null);
    const [device, setDevice] = useState<DeviceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [locationHistory, setLocationHistory] = useState<DeviceHistoryLocation[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // Filtros para el historial
    const defaultDates = getDefaultDateRange();
    const [startDate, setStartDate] = useState(defaultDates.startDate);
    const [startTime, setStartTime] = useState(defaultDates.startTime);
    const [endDate, setEndDate] = useState(defaultDates.endDate);
    const [endTime, setEndTime] = useState(defaultDates.endTime);
    // const [stopDuration, setStopDuration] = useState('>1 min'); // Comentado temporalmente
    
    // Estados para reproducción de ruta
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null);
    
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

    // Función para cargar historial de ubicaciones
    const loadLocationHistory = async (deviceId: string, from: string, to: string) => {
        try {
            setLoadingHistory(true);
            const history = await devicesService.getHistory({
                deviceId,
                from: from,
                to: to,
                page: 1,
                limit: 500
            });

            // Ordenar por fecha descendente
            history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setLocationHistory(history);
            
            // Si hay datos, establecer las coordenadas del mapa con la ubicación más reciente
            if (history.length > 0) {
                const latestLocation = history[0]; // Asumiendo que vienen ordenados por fecha desc
                // El mapa se actualizará automáticamente cuando se pase la prop
            }
            
            toast.success('Historial cargado', {
                description: `Se encontraron ${history.length} ubicaciones`
            });
        } catch (error) {
            console.error('Error loading location history:', error);
            toast.error('Error al cargar el historial', {
                description: 'No se pudo obtener el historial de ubicaciones'
            });
            setLocationHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Cargar datos del activo y dispositivo
    useEffect(() => {
        const fetchAsset = async () => {
            try {
                setLoading(true);
                const assetData = await assetsService.getById(params.id as string);
                setAsset(assetData);
                
                // Si el activo tiene un dispositivo asociado, obtener sus detalles
                if (assetData.device?.id) {
                    try {
                        const deviceData = await devicesService.getById(assetData.device.id);
                        setDevice(deviceData);
                        
                        // Cargar historial inicial con fechas por defecto
                        const fromDateTime = `${defaultDates.startDate}T00:00:00Z`;
                        const toDateTime = `${defaultDates.endDate}T23:59:59Z`;
                        await loadLocationHistory(assetData.device?.imei as string, fromDateTime, toDateTime);
                    } catch (deviceError) {
                        console.error('Error fetching device:', deviceError);
                        toast.error('Error al cargar datos del dispositivo');
                    }
                }
            } catch (err) {
                console.error('Error fetching asset:', err);
                setError('Error al cargar los datos del activo');
                toast.error('Error al cargar los datos del activo');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchAsset();
        }
    }, [params.id]);

    // Función para convertir fecha y hora local a UTC
    const convertToUTC = (dateStr: string, timeStr: string) => {
        const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
        return localDateTime.toISOString();
    };

    const handleFilter = async () => {
        if (!device?.id) {
            toast.error('No hay dispositivo asociado');
            return;
        }
        
        if (!startDate || !endDate || !startTime || !endTime) {
            toast.error('Por favor completa todos los campos de fecha y hora');
            return;
        }
        
        // Convertir fechas locales a UTC antes de enviar al backend
        const fromDateTimeUTC = convertToUTC(startDate, startTime);
        const toDateTimeUTC = convertToUTC(endDate, endTime);
        
        // Log para debugging - mostrar conversión
        console.log('Fechas originales:', {
            from: `${startDate}T${startTime}:00`,
            to: `${endDate}T${endTime}:00`
        });
        console.log('Fechas convertidas a UTC:', {
            from: fromDateTimeUTC,
            to: toDateTimeUTC
        });
        
        await loadLocationHistory(device?.imei as string, fromDateTimeUTC, toDateTimeUTC);
    };

    const handlePlayRoute = () => {
        if (locationHistory.length === 0) {
            toast.error('No hay datos de ubicación para reproducir');
            return;
        }
        
        if (isPlaying) {
            // Pausar reproducción - mantener posición actual
            setIsPlaying(false);
            if (playbackInterval) {
                clearInterval(playbackInterval);
                setPlaybackInterval(null);
            }
            toast.info('Reproducción pausada');
        } else {
            // Iniciar/reanudar reproducción - solo reiniciar si está al final
            setIsPlaying(true);
            
            // Solo reiniciar si estamos al final del recorrido
            if (currentLocationIndex >= locationHistory.length - 1) {
                setCurrentLocationIndex(0);
            }
            
            const interval = setInterval(() => {
                setCurrentLocationIndex(prevIndex => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex >= locationHistory.length) {
                        // Fin de la reproducción
                        setIsPlaying(false);
                        clearInterval(interval);
                        setPlaybackInterval(null);
                        toast.success('Reproducción completada');
                        return locationHistory.length - 1; // Mantener en el último punto
                    }
                    return nextIndex;
                });
            }, 2000 / playbackSpeed); // Velocidad ajustable
            
            setPlaybackInterval(interval);
            const action = currentLocationIndex === 0 ? 'Iniciando' : 'Reanudando';
            toast.success(`${action} reproducción`, {
                description: `${action} desde punto ${currentLocationIndex + 1} de ${locationHistory.length}`
            });
        }
    };
    
    const handleStopRoute = () => {
        setIsPlaying(false);
        setCurrentLocationIndex(0);
        if (playbackInterval) {
            clearInterval(playbackInterval);
            setPlaybackInterval(null);
        }
        toast.info('Reproducción detenida');
    };
    
    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
        if (isPlaying && playbackInterval) {
            // Reiniciar el intervalo con la nueva velocidad manteniendo posición
            clearInterval(playbackInterval);
            const newInterval = setInterval(() => {
                setCurrentLocationIndex(prevIndex => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex >= locationHistory.length) {
                        setIsPlaying(false);
                        clearInterval(newInterval);
                        setPlaybackInterval(null);
                        toast.success('Reproducción completada');
                        return locationHistory.length - 1; // Mantener en el último punto
                    }
                    return nextIndex;
                });
            }, 2000 / speed);
            setPlaybackInterval(newInterval);
        }
    };
    
    // Limpiar intervalo al desmontar el componente
    useEffect(() => {
        return () => {
            if (playbackInterval) {
                clearInterval(playbackInterval);
            }
        };
    }, [playbackInterval]);



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
                    <p className="text-muted-foreground">Cargando datos del activo...</p>
                </div>
            </div>
        );
    }

    if (error || !asset) {
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
                    <p className="text-muted-foreground mb-4">{error || 'Activo no encontrado'}</p>
                    <Button onClick={() => router.back()} variant="outline" className="border-[--theme-primary] text-[--theme-primary] hover:bg-[--theme-primary] hover:text-primary-foreground">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    // Obtener la ubicación para el mapa (actual durante reproducción o la más reciente)
    const currentPlaybackLocation = isPlaying && locationHistory.length > 0 ? locationHistory[currentLocationIndex] : null;
    const latestLocation = locationHistory.length > 0 ? locationHistory[0] : null;
    const mapLocation = currentPlaybackLocation || latestLocation;

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
                        Detalles del activo
                    </Button>
                </div>
            </div>

            {/* Main Content - Layout similar a Figma */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
                {/* Left Panel - Asset Info and Location History */}
                <div 
                    className="order-1 w-full bg-background p-4 lg:p-6 overflow-y-auto transition-all duration-200 ease-out"
                    style={{
                        width: isDesktop ? `${panelWidth}%` : '100%'
                    }}
                >
                    {/* Asset Details Card */}
                    <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
                        {/* Asset Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[--theme-primary] text-primary-foreground rounded-lg flex items-center justify-center">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-xs text-[--theme-primary] font-medium mb-1">#{asset.id.toString().padStart(6, '0')}</div>
                                    <h2 className="text-xl font-bold text-foreground">{asset.name}</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge
                                    variant={asset.status === 'ACTIVE' ? 'soft' : 'outline'}
                                    className={asset.status === 'ACTIVE' ? 'bg-[--theme-primary] text-primary-foreground' : 'bg-muted text-muted-foreground'}
                                >
                                    {getStatusLabel(asset.status)}
                                </Badge>
                                <Button size="sm" variant="outline" className="border-[--theme-primary] text-[--theme-primary] hover:bg-[--theme-primary] hover:text-primary-foreground">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Asset Details List */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 py-3 border-b border-border">
                                <Hash className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">Id del activo</div>
                                    <div className="text-sm text-muted-foreground">{asset.identifier || 'N.A.'}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 py-3 border-b border-border">
                                <Activity className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">Tipo de activo</div>
                                    <div className="text-sm text-muted-foreground">{getAssetTypeLabel(asset.assetType)}</div>
                                </div>
                            </div>

                            {device && (
                                <>
                                    <div className="flex items-center gap-4 py-3 border-b border-border">
                                        <Smartphone className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-foreground">Dispositivo asignado</div>
                                            <div className="text-sm text-muted-foreground">{device.brand} {device.model}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 py-3 border-b border-border">
                                        <Hash className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-foreground">IMEI del dispositivo</div>
                                            <div className="text-sm text-muted-foreground font-mono">{device.imei}</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center gap-4 py-3 border-b border-border">
                                <Calendar className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">Creado</div>
                                    <div className="text-sm text-muted-foreground">{formatDate(asset.createdAt)}</div>
                                </div>
                            </div>

                            {latestLocation && (
                                <div className="flex items-center gap-4 py-3 border-b border-border">
                                    <MapPin className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">Última ubicación</div>
                                        <div className="text-sm text-muted-foreground">
                                            {latestLocation.latitude.toFixed(6)}, {latestLocation.longitude.toFixed(6)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 py-3">
                                <Users className="h-4 w-4 text-[--theme-primary] flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">Cliente</div>
                                    <div className="text-sm text-muted-foreground">{device?.client?.user?.name || 'Report Now'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location History Card */}
                    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                        <h3 className="text-xl font-bold text-foreground mb-6">Historial de ubicaciones</h3>
                        
                        {/* Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground block">Fecha inicio</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border-border h-10 text-sm focus:ring-2 focus:ring-[--theme-primary]/20"
                                    placeholder="Fecha de inicio"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground block">Hora inicio</label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="border-border h-10 text-sm focus:ring-2 focus:ring-[--theme-primary]/20"
                                    placeholder="Hora de inicio"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground block">Fecha fin</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border-border h-10 text-sm focus:ring-2 focus:ring-[--theme-primary]/20"
                                    placeholder="Fecha de fin"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground block">Hora fin</label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="border-border h-10 text-sm focus:ring-2 focus:ring-[--theme-primary]/20"
                                    placeholder="Hora de fin"
                                />
                            </div>
                            {/* Filtro de Paradas comentado temporalmente
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">Paradas</label>
                                <Select value={stopDuration} onValueChange={setStopDuration}>
                                    <SelectTrigger className="border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=">1 min">&gt;1 min</SelectItem>
                                        <SelectItem value=">5 min">&gt;5 min</SelectItem>
                                        <SelectItem value=">10 min">&gt;10 min</SelectItem>
                                        <SelectItem value=">30 min">&gt;30 min</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            */}
                            <div className="space-y-2 sm:flex sm:items-end sm:space-y-0">
                                <Button 
                                    onClick={handleFilter}
                                    disabled={loadingHistory || !device}
                                    className="bg-[--theme-primary] text-primary-foreground hover:bg-[--theme-primary]/90 w-full h-10 text-sm font-medium"
                                >
                                    <Filter className="h-4 w-4 mr-2" />
                                    {loadingHistory ? 'Filtrando...' : 'Filtrar'}
                                </Button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4 mb-6">
                            {/* Playback Controls */}
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={handlePlayRoute}
                                    disabled={locationHistory.length === 0}
                                    className="border-[--theme-primary] text-[--theme-primary] hover:bg-[--theme-primary] hover:text-primary-foreground"
                                >
                                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    {isPlaying ? 'Pausar' : 'Reproducir ruta'}
                                </Button>
                                
                                <Button 
                                    variant="outline" 
                                    onClick={handleStopRoute}
                                    disabled={locationHistory.length === 0 || (!isPlaying && currentLocationIndex === 0)}
                                    className="border-muted-foreground text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Square className="h-4 w-4 mr-2" />
                                    Detener
                                </Button>
                                

                            </div>
                            
                            {/* Speed Controls and Progress */}
                            {locationHistory.length > 0 && (
                                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">Velocidad:</span>
                                        <div className="flex gap-1">
                                            {[0.5, 1, 2, 4].map(speed => (
                                                <Button
                                                    key={speed}
                                                    variant={playbackSpeed === speed ? "soft" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleSpeedChange(speed)}
                                                    className={playbackSpeed === speed ? "bg-[--theme-primary] text-primary-foreground" : ""}
                                                >
                                                    {speed}x
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                                            <span>Progreso</span>
                                            <span>{currentLocationIndex + 1} / {locationHistory.length}</span>
                                        </div>
                                        <div className="w-full bg-border rounded-full h-2">
                                            <div 
                                                className="bg-[--theme-primary] h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${((currentLocationIndex + 1) / locationHistory.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="space-y-4">
                            {loadingHistory ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--theme-primary] mx-auto mb-2"></div>
                                    <p className="text-sm text-muted-foreground">Cargando historial...</p>
                                </div>
                            ) : locationHistory.length > 0 ? (
                                locationHistory.map((location, index) => {
                                    const isCurrentPlayback = isPlaying && index === currentLocationIndex;
                                    const isLatest = index === 0;
                                    
                                    return (
                                        <div key={location.id} className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                    isCurrentPlayback 
                                                        ? 'bg-[--theme-primary] ring-2 ring-[--theme-primary]/30 ring-offset-2 animate-pulse' 
                                                        : isLatest 
                                                            ? 'bg-[--theme-primary]' 
                                                            : 'bg-muted-foreground'
                                                }`}></div>
                                                {index < locationHistory.length - 1 && (
                                                    <div className="w-px h-8 bg-border ml-1 mt-1"></div>
                                                )}
                                            </div>
                                            <div className={`flex-1 min-w-0 transition-all duration-300 ${
                                                isCurrentPlayback ? 'bg-[--theme-primary]/10 -ml-2 pl-2 pr-2 py-1 rounded' : ''
                                            }`}>
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    {formatHistoryDate(location.timestamp)}
                                                    {isCurrentPlayback && (
                                                        <span className="ml-2 text-[--theme-primary] font-medium">• Reproduciendo</span>
                                                    )}
                                                </div>
                                                <div className={`text-sm font-medium ${
                                                    isCurrentPlayback || isLatest 
                                                        ? 'text-[--theme-primary]' 
                                                        : 'text-foreground'
                                                }`}>
                                                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                                </div>
                                                {location.speed && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {Math.round(location.speed)} km/h
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-muted-foreground">
                                        {device ? 'No se encontraron ubicaciones en el rango seleccionado' : 'No hay dispositivo asociado'}
                                    </p>
                                </div>
                            )}
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

                {/* Right Panel - Map */}
                <div 
                    className="order-3 lg:order-3 relative h-64 lg:h-full transition-all duration-200 ease-out"
                    style={{
                        width: isDesktop ? `${100 - panelWidth}%` : '100%',
                        flex: isDesktop ? 'none' : '1'
                    }}
                >
                    {mapLocation ? (
                        <div className="relative w-full h-full">
                            <DeviceMap
                                latitude={mapLocation.latitude}
                                longitude={mapLocation.longitude}
                                deviceName={`${asset.name} (${device?.brand} ${device?.model})`}
                                className="w-full h-full"
                                historyLocations={locationHistory}
                                showRoute={locationHistory.length > 1}
                                routeColor="#10B981"
                                routeWeight={3}
                                fitToRoute={false}
                                shouldFlyTo={false}
                                isPlaying={isPlaying}
                                currentLocationIndex={currentLocationIndex}
                                showProgressiveRoute={true}
                                isHistoryView={true}
                                theme={mode}
                            />
                            
                            {/* Playback Indicator */}
                            {isPlaying && (
                                <div className="absolute top-4 left-4 bg-[--theme-primary] text-primary-foreground px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                    <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium">Reproduciendo</span>
                                    <span className="text-xs opacity-80">
                                        {currentLocationIndex + 1}/{locationHistory.length}
                                    </span>
                                </div>
                            )}
                            
                            {/* Speed Legend */}
                            {locationHistory.length > 0 && (
                                <div className="absolute top-4 right-4 z-10">
                                    <SpeedLegend compact={true} className="bg-card/95 backdrop-blur-sm border border-border shadow-lg" />
                                </div>
                            )}
                            
                            {/* Current Location Info */}
                            {currentPlaybackLocation && (
                                <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        {formatHistoryDate(currentPlaybackLocation.timestamp)}
                                    </div>
                                    <div className="text-sm font-medium text-foreground">
                                        {currentPlaybackLocation.latitude.toFixed(6)}, {currentPlaybackLocation.longitude.toFixed(6)}
                                    </div>
                                    {currentPlaybackLocation.speed && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Velocidad: {Math.round(currentPlaybackLocation.speed)} km/h
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-4 text-muted-foreground" />
                                <p className="text-sm lg:text-base text-muted-foreground font-medium">
                                    {device ? 'No hay datos de ubicación' : 'Sin dispositivo asociado'}
                                </p>
                                <p className="text-xs lg:text-sm text-muted-foreground/70 mt-1">
                                    {device ? 'Selecciona un rango de fechas y presiona Filtrar' : 'Este activo no tiene un dispositivo GPS asignado'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
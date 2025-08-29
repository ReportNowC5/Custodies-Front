"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Wifi,
    WifiOff,
    Loader2,
    Clock,
    MapPin,
    Activity,
    AlertCircle,
    Smartphone,
    Hash,
    Navigation,
    MapPinOff,
    Radar
} from 'lucide-react';

interface RealTimeStatusProps {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    lastUpdate: Date | null;
    gpsData: any | null;
    reconnectAttempts: number;
}

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Función para formatear timestamp unix a fecha legible
const formatUnixTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Función para formatear hex data con espaciado
const formatHexData = (hexString: string) => {
    if (!hexString) return 'No disponible';
    return hexString.match(/.{1,4}/g)?.join(' ') || hexString;
};

// Función para detectar el protocolo automáticamente
const detectProtocol = (data: any) => {
    if (!data) return 'unknown';

    // Buscar protocolo en diferentes ubicaciones posibles
    const protocolSources = [
        data.data?.protocolo,
        data.data?.protocol,
        data.protocolo,
        data.protocol,
        data.type,
        data.version
    ];

    for (const source of protocolSources) {
        if (source && source !== 'unknown') {
            return source;
        }
    }

    // Si tiene estructura específica del protocolo 0x23
    if (data.eventId && data.deviceId && data.data) {
        return data.data?.protocolo || '0x23';
    }

    return 'unknown';
};

// Función para buscar coordenadas GPS en diferentes campos
const findGPSCoordinates = (data: any) => {
    if (!data) return { latitude: null, longitude: null, timestamp: null };

    // Posibles ubicaciones de coordenadas GPS
    const latSources = [
        data.latitude, data.lat, data.coords?.lat, data.location?.latitude,
        data.gps?.latitude, data.position?.lat, data.data?.latitude, data.data?.lat
    ];

    const lngSources = [
        data.longitude, data.lng, data.lon, data.coords?.lng, data.coords?.lon,
        data.location?.longitude, data.gps?.longitude, data.position?.lng,
        data.position?.lon, data.data?.longitude, data.data?.lng, data.data?.lon
    ];

    const timestampSources = [
        data.timestamp, data.ts, data.time, data.gpsTime,
        data.location?.timestamp, data.coords?.timestamp, data.data?.timestamp
    ];

    let latitude = null;
    let longitude = null;
    let timestamp = null;

    // Encontrar primera coordenada válida
    for (const lat of latSources) {
        if (lat !== null && lat !== undefined && !isNaN(parseFloat(lat))) {
            latitude = parseFloat(lat);
            break;
        }
    }

    for (const lng of lngSources) {
        if (lng !== null && lng !== undefined && !isNaN(parseFloat(lng))) {
            longitude = parseFloat(lng);
            break;
        }
    }

    for (const ts of timestampSources) {
        if (ts) {
            timestamp = ts;
            break;
        }
    }

    return { latitude, longitude, timestamp };
};

// Función para calcular porcentaje de batería basado en voltaje
const calculateBatteryPercentage = (voltage: number) => {
    // Rango típico para dispositivos GPS: 3.3V (0%) a 4.2V (100%)
    const minVoltage = 3.3;
    const maxVoltage = 4.2;
    
    if (voltage <= minVoltage) return 0;
    if (voltage >= maxVoltage) return 100;
    
    return Math.round(((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100);
};

// Función para formatear datos tipo 'status'
const formatStatusData = (data: any) => {
    if (!data || data.type !== 'status') return null;

    console.log('📊 Datos de status recibidos:', data);

    const statusData = data.data || {};
    
    // Calcular porcentaje de batería
    const batteryPercentage = statusData.voltaje ? calculateBatteryPercentage(statusData.voltaje) : null;
    
    return {
        type: 'status',
        device: {
            imei: statusData.imei || data.deviceId || 'No disponible',
            modelo: statusData.modelo || 'No disponible',
            protocolo: statusData.protocolo || 'No disponible'
        },
        status: {
            voltaje: statusData.voltaje || null,
            batteryPercentage,
            gsm: statusData.gsm || null,
            alarma: statusData.alarma || null,
            status: statusData.status || null,
            source: statusData.source || null,
            timestamp: statusData.timestamp || data.ts || null
        },
        event: {
            eventId: data.eventId ? `${data.eventId.substring(0, 8)}...` : 'No disponible',
            deviceId: data.deviceId || 'No disponible',
            type: data.type,
            timestamp: data.ts ? formatUnixTimestamp(data.ts) : 'No disponible'
        }
    };
};

// Función para formatear datos de cualquier protocolo GPS
const formatProtocolData = (data: any) => {
    if (!data) return null;

    console.log('📡 Datos GPS recibidos:', data);

    // Si es tipo 'status', usar formateo específico
    if (data.type === 'status') {
        return formatStatusData(data);
    }

    // Intentar parsear si es string JSON
    let parsedData = data;
    if (typeof data === 'string') {
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            // Si no se puede parsear, mantener como string
            parsedData = { rawData: data };
        }
    }

    // Detectar protocolo automáticamente
    const detectedProtocol = detectProtocol(parsedData);
    console.log('🔍 Protocolo detectado:', detectedProtocol);

    // Buscar coordenadas GPS
    const gpsCoords = findGPSCoordinates(parsedData);
    console.log('📍 Coordenadas encontradas:', gpsCoords);

    // Información básica del dispositivo
    const deviceInfo = {
        imei: parsedData.data?.imei || parsedData.imei || parsedData.deviceId || 'No disponible',
        modelo: parsedData.data?.modelo || parsedData.modelo || parsedData.model || 'No disponible',
        protocolo: detectedProtocol
    };

    // Información del evento (si existe)
    const eventInfo = parsedData.eventId ? {
        eventId: parsedData.eventId ? `${parsedData.eventId.substring(0, 8)}...` : 'No disponible',
        deviceId: parsedData.deviceId || 'No disponible',
        type: parsedData.type || 'unknown',
        timestamp: parsedData.ts ? formatUnixTimestamp(parsedData.ts) : 'No disponible'
    } : null;

    // Información técnica (si existe)
    const technicalInfo = parsedData.data ? {
        etiqueta: parsedData.data?.etiqueta || parsedData.etiqueta || 'No disponible',
        length: parsedData.data?.length || parsedData.length || 'No disponible',
        serial: parsedData.data?.serial || parsedData.serial || 'No disponible',
        timestamp: parsedData.data?.timestamp || 'No disponible'
    } : null;

    // Datos raw (si existen)
    const rawData = (parsedData.data?.rawHex || parsedData.rawHex) ? {
        rawHex: parsedData.data?.rawHex || parsedData.rawHex || 'No disponible',
        payloadHex: parsedData.data?.payloadHex || parsedData.payloadHex || 'No disponible'
    } : null;

    // Otros datos relevantes
    const excludedKeys = [
        'imei', 'deviceId', 'modelo', 'model', 'protocolo', 'protocol', 'type',
        'latitude', 'lat', 'longitude', 'lng', 'lon', 'ts', 'timestamp',
        'eventId', 'data', 'coords', 'location', 'gps', 'position'
    ];

    const otherData = Object.keys(parsedData)
        .filter(key => !excludedKeys.includes(key))
        .reduce((obj, key) => {
            obj[key] = parsedData[key];
            return obj;
        }, {} as any);

    const hasLocation = gpsCoords.latitude !== null && gpsCoords.longitude !== null &&
        isValidCoordinate(gpsCoords.latitude, gpsCoords.longitude);

    return {
        protocol: detectedProtocol,
        device: deviceInfo,
        event: eventInfo,
        technical: technicalInfo,
        raw: rawData,
        location: hasLocation ? {
            latitude: gpsCoords.latitude,
            longitude: gpsCoords.longitude,
            timestamp: gpsCoords.timestamp
        } : null,
        other: Object.keys(otherData).length > 0 ? otherData : null,
        hasLocation
    };
};

// Función para validar coordenadas
const isValidCoordinate = (lat: any, lng: any) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    return !isNaN(latitude) && !isNaN(longitude) &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180;
};

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    gpsData,
    reconnectAttempts
}) => {
    const getConnectionStatus = () => {
        if (isConnecting) {
            return {
                icon: <Loader2 className="h-4 w-4 animate-spin" />,
                text: reconnectAttempts > 0 ? `Reconectando... (${reconnectAttempts}/5)` : 'Conectando...',
                variant: 'secondary' as const,
                color: 'text-yellow-600'
            };
        }

        if (error) {
            return {
                icon: <AlertCircle className="h-4 w-4" />,
                text: 'Error de conexión',
                variant: 'destructive' as const,
                color: 'text-red-600'
            };
        }

        if (isConnected) {
            return {
                icon: <Wifi className="h-4 w-4" />,
                text: 'Conectado',
                variant: 'default' as const,
                color: 'text-green-600'
            };
        }

        return {
            icon: <WifiOff className="h-4 w-4" />,
            text: 'Desconectado',
            variant: 'secondary' as const,
            color: 'text-gray-600'
        };
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-4">
            {/* Estado de Conexión */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Estado de Conexión
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={connectionStatus.color}>
                                {connectionStatus.icon}
                            </span>
                            <span className="text-sm font-medium">{connectionStatus.text}</span>
                        </div>
                        <Badge variant={connectionStatus.variant as "outline" | "soft"} className="text-xs">
                            WebSocket
                        </Badge>
                    </div>

                    {error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Última Actualización */}
            {lastUpdate && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Última Actualización
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-1">
                            <div className="text-sm font-medium">
                                {formatTime(lastUpdate)}
                            </div>
                            <div className="text-xs text-gray-500">
                                {formatDate(lastUpdate)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Datos GPS en Tiempo Real */}
            {gpsData && (() => {
                const formattedData = formatProtocolData(gpsData);

                return (
                    <div className="space-y-4">
                        {/* Protocolo Detectado */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Radar className="h-4 w-4 text-blue-600" />
                                    Protocolo Detectado
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Protocolo</span>
                                    <Badge
                                        variant={(() => {
                                            const protocol = (formattedData as any)?.type === 'status' 
                                                ? (formattedData as any)?.device?.protocolo 
                                                : (formattedData as any)?.protocol;
                                            return protocol === 'unknown' ? 'soft' : 'outline';
                                        })()} 
                                        className={`text-xs ${(() => {
                                            const protocol = (formattedData as any)?.type === 'status' 
                                                ? (formattedData as any)?.device?.protocolo 
                                                : (formattedData as any)?.protocol;
                                            return protocol === 'unknown'
                                                ? 'bg-gray-100 text-gray-700'
                                                : protocol === '0x23'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-green-100 text-green-700';
                                        })()}`}
                                    >
                                        {(() => {
                                            const protocol = (formattedData as any)?.type === 'status' 
                                                ? (formattedData as any)?.device?.protocolo 
                                                : (formattedData as any)?.protocol;
                                            return protocol || 'unknown';
                                        })()}
                                    </Badge>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    {(() => {
                                        const protocol = (formattedData as any)?.type === 'status' 
                                            ? (formattedData as any)?.device?.protocolo 
                                            : (formattedData as any)?.protocol;
                                        return protocol === 'unknown'
                                            ? 'Protocolo no identificado o genérico'
                                            : `Protocolo ${protocol} detectado automáticamente`;
                                    })()}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Información del Evento (si existe) */}
                        {formattedData?.event && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Información del Evento
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Event ID</span>
                                            <span className="text-xs font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                {formattedData.event?.eventId}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Device ID</span>
                                            <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                                {formattedData.event?.deviceId}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Tipo</span>
                                            <Badge variant="outline" className="text-xs">
                                                {formattedData.event?.type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Timestamp</span>
                                            <span className="text-xs font-mono">
                                                {formattedData.event?.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Información del Dispositivo */}
                        {formattedData && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Smartphone className="h-4 w-4" />
                                        Información del Dispositivo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 flex items-center gap-1">
                                                <Hash className="h-3 w-3" />
                                                IMEI
                                            </span>
                                            <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                                {formattedData.device.imei}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Modelo</span>
                                            <span className="text-xs font-medium">{formattedData.device.modelo}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Protocolo</span>
                                            <Badge variant="outline" className="text-xs">
                                                {formattedData.device.protocolo}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Estado del Dispositivo (solo para datos tipo 'status') */}
                        {(formattedData as any)?.type === 'status' && (formattedData as any)?.status && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-green-600" />
                                        Estado del Dispositivo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        {/* Voltaje y Batería */}
                                        {(formattedData as any).status.voltaje && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-600">Voltaje</span>
                                                    <span className="text-xs font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                        {(formattedData as any).status.voltaje}V
                                                    </span>
                                                </div>
                                                {(formattedData as any).status.batteryPercentage !== null && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-600">Carga</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-300 ${
                                                                        (formattedData as any).status.batteryPercentage > 60 ? 'bg-green-500' :
                                                                        (formattedData as any).status.batteryPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${(formattedData as any).status.batteryPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-xs font-medium ${
                                                                (formattedData as any).status.batteryPercentage > 60 ? 'text-green-600' :
                                                                (formattedData as any).status.batteryPercentage > 30 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {(formattedData as any).status.batteryPercentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Señal GSM */}
                                        {(formattedData as any).status.gsm !== null && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Señal GSM</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-end gap-1">
                                                        {[1, 2, 3, 4, 5].map((bar) => (
                                                            <div
                                                                key={bar}
                                                                className={`w-1 rounded-sm ${
                                                                    bar <= (formattedData as any).status.gsm 
                                                                        ? 'bg-green-500' 
                                                                        : 'bg-gray-300'
                                                                }`}
                                                                style={{ height: `${bar * 3 + 2}px` }}
                                                            ></div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium text-green-600">
                                                        {(formattedData as any).status.gsm}/5
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Estado de Alarma */}
                                        {(formattedData as any).status.alarma !== null && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Alarma</span>
                                                <Badge 
                                                    variant={(formattedData as any).status.alarma === 0 ? 'soft' : 'outline'}
                                                    className={`text-xs ${
                                                        (formattedData as any).status.alarma === 0 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {(formattedData as any).status.alarma === 0 ? 'Sin alarma' : `Alarma ${(formattedData as any).status.alarma}`}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Status Code */}
                                        {(formattedData as any).status.status !== null && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Status</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {(formattedData as any).status.status}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Source */}
                                        {(formattedData as any).status.source && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Fuente</span>
                                                <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                                    {(formattedData as any).status.source}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Datos Técnicos (si existen) */}
                        {(formattedData as any)?.technical && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Navigation className="h-4 w-4" />
                                        Datos Técnicos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Etiqueta</span>
                                            <Badge variant="outline" className="text-xs">
                                                {(formattedData as any).technical?.etiqueta}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Length</span>
                                            <span className="text-xs font-medium">{(formattedData as any)?.technical?.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Serial</span>
                                            <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                                {(formattedData as any).technical?.serial}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Timestamp Data</span>
                                            <span className="text-xs font-mono">
                                                {(formattedData as any).technical?.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Datos Raw (si existen) */}
                        {(formattedData as any)?.raw && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Hash className="h-4 w-4" />
                                        Datos Raw
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs text-gray-600 block mb-1">Raw Hex</span>
                                            <div className="text-xs font-mono bg-gray-50 p-2 rounded border break-all">
                                                {formatHexData((formattedData as any).raw?.rawHex)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-600 block mb-1">Payload Hex</span>
                                            <div className="text-xs font-mono bg-blue-50 p-2 rounded border break-all text-blue-700">
                                                {formatHexData((formattedData as any).raw?.payloadHex)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Información de Ubicación */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    {(formattedData as any)?.hasLocation ? (
                                        <MapPin className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <MapPinOff className="h-4 w-4 text-gray-400" />
                                    )}
                                    Ubicación GPS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {(formattedData as any)?.hasLocation && (formattedData as any)?.location ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Latitud</span>
                                            <span className="text-xs font-mono bg-green-50 px-2 py-1 rounded text-green-700">
                                                {(formattedData as any).location?.latitude ? parseFloat(String((formattedData as any).location.latitude)).toFixed(6) : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Longitud</span>
                                            <span className="text-xs font-mono bg-green-50 px-2 py-1 rounded text-green-700">
                                                {(formattedData as any).location?.longitude ? parseFloat(String((formattedData as any).location.longitude)).toFixed(6) : ''}
                                            </span>
                                        </div>
                                        {(formattedData as any).location?.timestamp && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Timestamp GPS</span>
                                                <span className="text-xs font-mono">
                                                    {typeof (formattedData as any).location.timestamp === 'number'
                                                        ? formatUnixTimestamp((formattedData as any).location.timestamp)
                                                        : (formattedData as any).location.timestamp
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <MapPinOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-500 font-medium">
                                            Sin datos de ubicación GPS
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {(() => {
                                                const protocol = (formattedData as any)?.type === 'status' 
                                                    ? (formattedData as any)?.device?.protocolo 
                                                    : (formattedData as any)?.protocol;
                                                return protocol === '0x23'
                                                    ? 'El protocolo 0x23 no incluye coordenadas GPS'
                                                    : protocol === 'unknown'
                                                        ? 'Protocolo desconocido - ubicación no disponible'
                                                        : 'Sin coordenadas GPS válidas en este protocolo';
                                            })()} 
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Datos Adicionales (si existen) */}
                        {(formattedData as any)?.other && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Datos Adicionales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {Object.entries((formattedData as any).other).map(([key, value]) => (
                                            <div key={key} className="flex items-start justify-between gap-2">
                                                <span className="text-xs text-gray-600 capitalize flex-shrink-0">
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                </span>
                                                <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-right break-all">
                                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Indicador de datos en vivo */}
                        <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600 font-medium">Datos en vivo</span>
                        </div>
                    </div>
                );
            })()}

            {/* Información de Conexión */}
            {isConnected && !gpsData && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-sm text-gray-500">
                            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>Esperando datos GPS...</p>
                            <p className="text-xs mt-1">La conexión está activa</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
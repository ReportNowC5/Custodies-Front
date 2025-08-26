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
    MapPinOff
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

// Función para formatear datos del protocolo 0x23
const formatProtocolData = (data: any) => {
    if (!data) return null;

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

    // Detectar si tiene la estructura del protocolo 0x23
    const isProtocol23 = parsedData.eventId && parsedData.deviceId && parsedData.data;
    
    if (isProtocol23) {
        // Estructura específica del protocolo 0x23
        const eventInfo = {
            eventId: parsedData.eventId ? `${parsedData.eventId.substring(0, 8)}...` : 'No disponible',
            deviceId: parsedData.deviceId || 'No disponible',
            type: parsedData.type || 'unknown',
            timestamp: parsedData.ts ? formatUnixTimestamp(parsedData.ts) : 'No disponible'
        };

        const deviceInfo = {
            imei: parsedData.data?.imei || parsedData.deviceId || 'No disponible',
            modelo: parsedData.data?.modelo || 'No disponible',
            protocolo: parsedData.data?.protocolo || '0x23'
        };

        const technicalInfo = {
            etiqueta: parsedData.data?.etiqueta || 'No disponible',
            length: parsedData.data?.length || 'No disponible',
            serial: parsedData.data?.serial || 'No disponible',
            timestamp: parsedData.data?.timestamp || 'No disponible'
        };

        const rawData = {
            rawHex: parsedData.data?.rawHex || 'No disponible',
            payloadHex: parsedData.data?.payloadHex || 'No disponible'
        };

        return {
            isProtocol23: true,
            event: eventInfo,
            device: deviceInfo,
            technical: technicalInfo,
            raw: rawData,
            hasLocation: false // Protocolo 0x23 no incluye coordenadas GPS
        };
    } else {
        // Formato genérico para otros protocolos
        const deviceInfo = {
            imei: parsedData.imei || parsedData.deviceId || 'No disponible',
            modelo: parsedData.modelo || parsedData.model || 'No disponible',
            protocolo: parsedData.protocolo || parsedData.protocol || parsedData.type || 'No disponible'
        };

        const locationInfo = {
            latitude: parsedData.latitude || parsedData.lat || null,
            longitude: parsedData.longitude || parsedData.lng || parsedData.lon || null,
            timestamp: parsedData.ts || parsedData.timestamp || null
        };

        // Otros datos relevantes
        const otherData = Object.keys(parsedData)
            .filter(key => !['imei', 'deviceId', 'modelo', 'model', 'protocolo', 'protocol', 'type', 'latitude', 'lat', 'longitude', 'lng', 'lon', 'ts', 'timestamp'].includes(key))
            .reduce((obj, key) => {
                obj[key] = parsedData[key];
                return obj;
            }, {} as any);

        return {
            isProtocol23: false,
            device: deviceInfo,
            location: locationInfo,
            other: otherData,
            hasLocation: locationInfo.latitude !== null && locationInfo.longitude !== null
        };
    }
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
                        {/* Información del Evento (solo para protocolo 0x23) */}
                        {formattedData?.isProtocol23 && (
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

                        {/* Datos Técnicos (solo para protocolo 0x23) */}
                        {formattedData?.isProtocol23 && (
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
                                                {formattedData.technical?.etiqueta}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Length</span>
                                            <span className="text-xs font-medium">{formattedData?.technical?.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Serial</span>
                                            <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                                                {formattedData.technical?.serial}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Timestamp Data</span>
                                            <span className="text-xs font-mono">
                                                {formattedData.technical?.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Datos Raw (solo para protocolo 0x23) */}
                        {formattedData?.isProtocol23 && (
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
                                                {formatHexData(formattedData.raw?.rawHex)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-600 block mb-1">Payload Hex</span>
                                            <div className="text-xs font-mono bg-blue-50 p-2 rounded border break-all text-blue-700">
                                                {formatHexData(formattedData.raw?.payloadHex)}
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
                                    {formattedData?.hasLocation ? (
                                        <MapPin className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <MapPinOff className="h-4 w-4 text-gray-400" />
                                    )}
                                    Ubicación GPS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {formattedData?.hasLocation && !formattedData?.isProtocol23 && isValidCoordinate(formattedData.location?.latitude, formattedData.location?.longitude) ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Latitud</span>
                                            <span className="text-xs font-mono bg-green-50 px-2 py-1 rounded text-green-700">
                                                {parseFloat(formattedData.location?.latitude).toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Longitud</span>
                                            <span className="text-xs font-mono bg-green-50 px-2 py-1 rounded text-green-700">
                                                {parseFloat(formattedData.location?.longitude).toFixed(6)}
                                            </span>
                                        </div>
                                        {formattedData.location?.timestamp && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">Timestamp GPS</span>
                                                <span className="text-xs font-mono">
                                                    {formattedData.location.timestamp}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <MapPinOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-500 font-medium">
                                            {formattedData?.isProtocol23 ? 'Sin datos de ubicación GPS' : 'Ubicación no disponible'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formattedData?.isProtocol23 
                                                ? 'El protocolo 0x23 no incluye coordenadas GPS' 
                                                : 'Sin datos de GPS válidos'
                                            }
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Datos Adicionales (solo para protocolos genéricos) */}
                        {formattedData && !formattedData.isProtocol23 && formattedData.other && Object.keys(formattedData.other).length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Datos Adicionales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {Object.entries(formattedData.other).map(([key, value]) => (
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
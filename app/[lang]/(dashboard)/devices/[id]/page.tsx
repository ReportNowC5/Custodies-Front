"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DeviceMap } from '@/components/devices/device-map';
import { RealTimeStatus } from '@/components/devices/real-time-status';
import { useDeviceWebSocket } from '@/hooks/use-device-websocket';
import { devicesService } from '@/lib/services/devices.service';
import { DeviceResponse } from '@/lib/types/device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Hash, Calendar, Activity, Users, MapPin, Clock, Battery } from 'lucide-react';
import { toast } from 'sonner';

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
    
    // Verificar si es protocolo 0x23 (no incluye coordenadas GPS)
    const isProtocol23 = parsedData.eventId && parsedData.deviceId && parsedData.data;
    if (isProtocol23) {
        // El protocolo 0x23 no incluye coordenadas GPS, no actualizar el mapa
        return null;
    }
    
    // Buscar coordenadas en diferentes formatos para otros protocolos
    const lat = parsedData.latitude || parsedData.lat || null;
    const lng = parsedData.longitude || parsedData.lng || parsedData.lon || null;
    
    if (isValidCoordinate(lat, lng)) {
        return {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        };
    }
    
    return null;
};

export default function DeviceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [device, setDevice] = useState<DeviceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapCoordinates, setMapCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
    
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
    
    // Actualizar coordenadas del mapa solo cuando lleguen datos GPS válidos
    useEffect(() => {
        const validCoords = getValidCoordinates(gpsData);
        if (validCoords) {
            setMapCoordinates(validCoords);
        } else if (device && !mapCoordinates) {
            // Solo usar coordenadas del dispositivo si no hay coordenadas del mapa ya establecidas
            if (isValidCoordinate(device.location?.latitude, device.location?.longitude)) {
                setMapCoordinates({
                    latitude: device.location!.latitude,
                    longitude: device.location!.longitude
                });
            } else {
                // Coordenadas por defecto (Guadalajara, México)
                setMapCoordinates({
                    latitude: 20.6985408055856,
                    longitude: -103.32520332542438
                });
            }
        }
    }, [gpsData, device, mapCoordinates]);

    useEffect(() => {
        const fetchDevice = async () => {
            try {
                setLoading(true);
                const deviceData = await devicesService.getById(params.id as string);
                setDevice(deviceData);
            } catch (err) {
                console.error('Error fetching device:', err);
                setError('Error al cargar los datos del dispositivo');
                toast.error('Error al cargar los datos del dispositivo');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchDevice();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando datos del dispositivo...</p>
                </div>
            </div>
        );
    }

    if (error || !device) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
                    <p className="text-gray-600 mb-4">{error || 'Dispositivo no encontrado'}</p>
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => router.back()}
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Detalles del dispositivo
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Panel - Device Info */}
                <div className="w-1/3 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                    {/* Device Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Hash className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">#{device.id.toString().padStart(5, '0')}</div>
                                <h2 className="text-lg font-semibold text-gray-900">{device.brand}</h2>
                                <div className="text-sm text-gray-600">{device.model}</div>
                            </div>
                        </div>
                        <Badge
                            variant={device.status === 'ACTIVE' ? 'soft' : 'outline'}
                            className={device.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        >
                            {getStatusLabel(device.status)}
                        </Badge>
                    </div>

                    {/* Device Details List */}
                    <div className="space-y-4">
                        {/* Phone Number */}
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">No. telefónico</div>
                                <div className="text-sm font-medium text-gray-900">{device.client?.user?.phone || 'N/A'}</div>
                            </div>
                        </div>

                        {/* IMEI */}
                        <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">IMEI</div>
                                <div className="text-sm font-medium text-gray-900 font-mono">{device.imei}</div>
                            </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Creado</div>
                                <div className="text-sm font-medium text-gray-900">{formatDate(device.createdAt)}</div>
                            </div>
                        </div>

                        {/* Related Asset */}
                        <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Activo relacionado</div>
                                <div className="text-sm font-medium text-gray-900">trailer 2</div>
                            </div>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Cliente</div>
                                <div className="text-sm font-medium text-gray-900">{device.client?.user?.name || 'Report Now'}</div>
                            </div>
                        </div>

                        {/* Last Location */}
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Última ubicación</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {device.location?.latitude && device.location?.longitude
                                        ? `${device.location.latitude.toFixed(6)}, ${device.location.longitude.toFixed(6)}`
                                        : '20.6985408055856, -103.32520332542438'
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Last Connection */}
                        <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Última conexión</div>
                                <div className="text-sm font-medium text-gray-900">{formatDate(device.updatedAt)}</div>
                            </div>
                        </div>

                        {/* Battery Level */}
                        <div className="flex items-center gap-3">
                            <Battery className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="text-sm text-gray-600">Carga del dispositivo</div>
                                <div className="text-sm font-medium text-gray-900">42%</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Real-time Status Section */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Estado en Tiempo Real</h3>
                        <RealTimeStatus
                            isConnected={isConnected}
                            isConnecting={isConnecting}
                            error={wsError}
                            lastUpdate={lastUpdate}
                            gpsData={gpsData}
                            reconnectAttempts={reconnectAttempts}
                        />
                    </div>
                </div>

                {/* Right Panel - Map */}
                <div className="flex-1 relative">
                    {mapCoordinates ? (
                        <DeviceMap
                            latitude={mapCoordinates.latitude}
                            longitude={mapCoordinates.longitude}
                            deviceName={`${device.brand} ${device.model}`}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p className="text-gray-500 font-medium">Cargando mapa...</p>
                                <p className="text-sm text-gray-400 mt-1">Esperando coordenadas válidas</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
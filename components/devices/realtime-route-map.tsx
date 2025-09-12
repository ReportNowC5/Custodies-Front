"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DeviceHistoryLocation } from '@/lib/types/device';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
// Nota: useMap se usará vía require dentro de un subcomponente para evitar SSR issues

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

export interface RealtimeRouteMapProps {
    imei: string;
    theme?: 'light' | 'dark' | string;
    initialHistory: DeviceHistoryLocation[]; // 0-5 from DB or historical data
    livePoint: DeviceHistoryLocation | null; // last realtime point
    isConnected: boolean; // websocket status
    className?: string;
    showingHistoricalData?: boolean; // indica si se están mostrando datos históricos
    limitPoints?: boolean; // si debe limitar a 10 puntos o mostrar todos
}

export const RealtimeRouteMap: React.FC<RealtimeRouteMapProps> = ({
    imei,
    theme = 'dark',
    initialHistory,
    livePoint,
    isConnected,
    className = '',
    showingHistoricalData = false,
    limitPoints = true
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const userInteractedRef = useRef<boolean>(false);

    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    // Función para obtener color según la velocidad
    const getSpeedColor = (speed: number) => {
        if (speed === 0) return '#374151'; // Gris para velocidad 0
        if (speed <= 40) return '#10B981'; // Verde para velocidad 1-40
        if (speed <= 79) return '#F59E0B'; // Amarillo para velocidad 41-79
        return '#EF4444'; // Rojo para velocidad 80+
    };

    // Crear icono para puntos de coordenadas individuales
    const createCoordinatePointIcon = (speed: number) => {
        const color = getSpeedColor(speed);
        return L.divIcon({
            html: `
                <div style="
                    width: 12px;
                    height: 12px;
                    background: ${color};
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    cursor: pointer;
                "></div>
            `,
            className: 'coordinate-point-marker',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    };

    const points = useMemo<DeviceHistoryLocation[]>(() => {
        const isValid = (p: DeviceHistoryLocation | null | undefined) => !!p &&
            typeof p.latitude === 'number' && typeof p.longitude === 'number' &&
            !isNaN(p.latitude) && !isNaN(p.longitude) &&
            p.latitude >= -90 && p.latitude <= 90 &&
            p.longitude >= -180 && p.longitude <= 180;

        const base = (initialHistory || []).filter(isValid);
        if (livePoint && isValid(livePoint)) {
            const exists = base.find(p => p.timestamp === livePoint.timestamp);
            if (!exists) base.unshift(livePoint as DeviceHistoryLocation);
        }
        const sorted = base.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Si estamos mostrando datos históricos, no limitar; si no, limitar a 10
        return limitPoints ? sorted.slice(0, 10) : sorted;
    }, [initialHistory, livePoint]);

    const hasAnyCoords = points.length > 0;
    const currentLat = hasAnyCoords ? points[0].latitude : 0;
    const currentLng = hasAnyCoords ? points[0].longitude : 0;

    // Custom event binder to detect manual interaction and preserve user zoom/position
    const EventBinder: React.FC = () => {
        const map = (require('react-leaflet') as any).useMap();
        useEffect(() => {
            if (!map) return;
            mapRef.current = map;

            const handler = () => (userInteractedRef.current = true);
            map.on('dragstart', handler);
            map.on('zoomstart', handler);
            return () => {
                map.off('dragstart', handler);
                map.off('zoomstart', handler);
            };
        }, [map]);
        return null;
    };

    // Initialize marker when map ready and we have coords
    useEffect(() => {
        if (!mapRef.current || markerRef.current || !hasAnyCoords) return;
        if (
            typeof currentLat !== 'number' || typeof currentLng !== 'number' ||
            isNaN(currentLat) || isNaN(currentLng)
        ) return;
        const marker = L.marker([currentLat, currentLng]).addTo(mapRef.current);
        markerRef.current = marker;
    }, [hasAnyCoords, currentLat, currentLng]);

    // Update marker and center map based on mode
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        
        if (hasAnyCoords && typeof currentLat === 'number' && typeof currentLng === 'number' &&
            !isNaN(currentLat) && !isNaN(currentLng)) {
            
            markerRef.current.setLatLng([currentLat, currentLng]);
            
            // Centrado inteligente del mapa
            if (!userInteractedRef.current) {
                if (showingHistoricalData && points.length > 1) {
                    // Modo histórico: ajustar vista para mostrar todas las ubicaciones
                    const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
                    mapRef.current.fitBounds(bounds, { padding: [20, 20] });
                } else if (isConnected) {
                    // Modo tiempo real: centrar en la ubicación actual
                    mapRef.current.panTo([currentLat, currentLng], { animate: true, duration: 0.4 });
                }
                // Si no hay conexión y no es histórico, no cambiar el centro
            }
        }
    }, [isConnected, hasAnyCoords, currentLat, currentLng, showingHistoricalData, points.length]);

    if (!isClient) {
        return (
            <div className={`bg-muted/30 rounded-lg w-full h-full flex items-center justify-center ${className}`}>
                <div className="text-muted-foreground text-sm">Cargando mapa...</div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full ${className}`}>
            <MapContainer
                center={[hasAnyCoords ? currentLat : 19.4326, hasAnyCoords ? currentLng : -99.1332]}
                zoom={16}
                zoomControl
                style={{ height: '100%', width: '100%' }}
            >
                <EventBinder />
                <TileLayer
                    url={theme === 'dark'
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
                    attribution='&copy; OpenStreetMap & CARTO'
                />

                {/* Route polyline */}
                {points.length > 1 && typeof currentLat === 'number' && typeof currentLng === 'number' && !isNaN(currentLat) && !isNaN(currentLng) && (
                    <Polyline
                        positions={points
                            .slice()
                            .reverse() // draw from oldest to newest
                            .map(p => [p.latitude, p.longitude] as [number, number])}
                        pathOptions={{ 
                            color: showingHistoricalData ? '#3B82F6' : '#10B981', // Azul para histórico, verde para tiempo real
                            weight: 5, 
                            opacity: 0.95 
                        }}
                    />
                )}

                {/* Marcadores individuales para cada punto con colores por velocidad */}
                {points.length > 0 && points.map((point, index) => (
                    <Marker
                        key={`point-${point.id || index}-${point.timestamp}`}
                        position={[point.latitude, point.longitude]}
                        icon={createCoordinatePointIcon(point.speed || 0)}
                    >
                        <Popup>
                            <div style={{
                                background: 'rgba(17, 24, 39, 0.95)',
                                color: 'white',
                                padding: '16px',
                                borderRadius: '8px',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                minWidth: '250px',
                                border: 'none'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '12px', textAlign: 'center', color: '#10B981' }}>
                                    📍 Punto {index + 1}
                                </div>

                                <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: 500 }}>Fecha y Hora:</span>
                                    </div>
                                    <div style={{ fontSize: '13px', marginBottom: '8px', textAlign: 'center', background: 'rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                        {new Date(point.timestamp).toLocaleString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 500 }}>Latitud:</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{point.latitude.toFixed(6)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 500 }}>Longitud:</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{point.longitude.toFixed(6)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 500 }}>Velocidad:</span>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                            color: getSpeedColor(point.speed || 0),
                                            fontWeight: 600
                                        }}>
                                            {(point.speed || 0).toFixed(1)} km/h
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => {
                                            const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point.latitude},${point.longitude}`;
                                            window.open(url, '_blank');
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                                        }}
                                    >
                                        🌍 Ver en Street View
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Live marker - only when connected and we have coordinates */}
                {isConnected && hasAnyCoords && typeof currentLat === 'number' && typeof currentLng === 'number' && !isNaN(currentLat) && !isNaN(currentLng) && (
                    <Marker position={[currentLat, currentLng]} />
                )}
            </MapContainer>

            {/* Overlay when no coords at all */}
            {!hasAnyCoords && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-card/90 border border-border rounded-lg px-4 py-3 text-center shadow-lg">
                        <div className="text-sm text-foreground font-medium">Esperando recibir coordenadas</div>
                        <div className="text-xs text-muted-foreground mt-1">IMEI: {imei || 'N/A'}</div>
                    </div>
                </div>
            )}

            {/* Indicador de datos históricos */}
            {showingHistoricalData && hasAnyCoords && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <div className="bg-blue-500/90 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        Datos históricos ({points.length} puntos)
                    </div>
                </div>
            )}

            {/* Indicador de tiempo real */}
            {!showingHistoricalData && isConnected && hasAnyCoords && (
                <div className="absolute top-4 left-4 z-[1000]">
                    <div className="bg-green-500/90 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        Tiempo real
                    </div>
                </div>
            )}
        </div>
    );
};



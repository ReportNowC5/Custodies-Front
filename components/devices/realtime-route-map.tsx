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
    initialHistory: DeviceHistoryLocation[]; // 0-5 from DB
    livePoint: DeviceHistoryLocation | null; // last realtime point
    isConnected: boolean; // websocket status
    className?: string;
}

export const RealtimeRouteMap: React.FC<RealtimeRouteMapProps> = ({
    imei,
    theme = 'dark',
    initialHistory,
    livePoint,
    isConnected,
    className = ''
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const userInteractedRef = useRef<boolean>(false);

    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

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
        return base
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
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

    // Update marker only if connected and we have live coords
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        if (isConnected && hasAnyCoords &&
            typeof currentLat === 'number' && typeof currentLng === 'number' &&
            !isNaN(currentLat) && !isNaN(currentLng)) {
            markerRef.current.setLatLng([currentLat, currentLng]);
            // Do not change zoom automatically; keep user zoom
            if (!userInteractedRef.current) {
                mapRef.current.panTo([currentLat, currentLng], { animate: true, duration: 0.4 });
            }
        }
    }, [isConnected, hasAnyCoords, currentLat, currentLng]);

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
                        pathOptions={{ color: '#10B981', weight: 5, opacity: 0.95 }}
                    />
                )}

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
        </div>
    );
};



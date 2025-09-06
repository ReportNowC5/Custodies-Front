"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Importar utilidades de animación suave
import { 
    MarkerAnimator, 
    GPSThrottler, 
    PositionPredictor,
    GeoCoordinates,
    easeInOutCubic 
} from '@/lib/utils/map-animations';

// Configurar iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Importar componentes de Leaflet dinámicamente para evitar problemas de SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

// Importar useMap hook directamente (no se puede usar con dynamic)
import { useMap } from 'react-leaflet';
import { DeviceHistoryLocation } from '@/lib/types/device';

// Componente del mapa de Leaflet
const LeafletMapComponent: React.FC<{
    latitude: number;
    longitude: number;
    deviceName: string;
    shouldFlyTo: boolean;
    shouldShakeMarker: boolean;
    onAnimationComplete?: () => void;
    historyLocations?: DeviceHistoryLocation[];
    showRoute?: boolean;
    routeColor?: string;
    routeWeight?: number;
    isPlaying?: boolean;
    currentLocationIndex?: number;
    showProgressiveRoute?: boolean;
    hasValidCoordinates?: boolean;
    isConnected?: boolean;
    lastLocationUpdate?: string | null;
    theme?: string;
    isHistoryView?: boolean;
    currentBearing?: number;
}> = ({
    latitude,
    longitude,
    deviceName,
    shouldFlyTo,
    shouldShakeMarker,
    onAnimationComplete,
    historyLocations = [],
    showRoute = false,
    routeColor = '#10B981',
    routeWeight = 3,
    isPlaying = false,
    currentLocationIndex = 0,
    showProgressiveRoute = false,
    hasValidCoordinates = false,
    isConnected = false,
    lastLocationUpdate = null,
    theme = 'dark',
    isHistoryView = false,
    currentBearing
}) => {
        // Todos los hooks deben estar en el top level - SIEMPRE
        const mapRef = useRef<L.Map | null>(null);
        const markerRef = useRef<L.Marker | null>(null);
        const userInteractedRef = useRef<boolean>(false);
        const lastAutoMoveRef = useRef<number>(0);
        const [isClient, setIsClient] = useState(false);
        
        // Referencias para animación suave
        const animatorRef = useRef<MarkerAnimator>(new MarkerAnimator());
        const throttlerRef = useRef<GPSThrottler>(new GPSThrottler(isHistoryView ? 500 : 200)); // Más frecuente para tiempo real
        const predictorRef = useRef<PositionPredictor>(new PositionPredictor());
        const lastPositionRef = useRef<GeoCoordinates | null>(null);
        const isAnimatingRef = useRef<boolean>(false);
        const lastUpdateTimeRef = useRef<number>(0);
        const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        // useEffect para inicializar cliente - SIEMPRE se ejecuta
        useEffect(() => {
            setIsClient(true);
        }, []);

        // Función para predicción inteligente durante pérdidas de señal
        const startPredictiveUpdates = useCallback(() => {
            if (predictionTimeoutRef.current || isHistoryView || !lastPositionRef.current) return;

            const updatePrediction = () => {
                const predictedPosition = predictorRef.current.predictNext(1000); // Predecir 1 segundo adelante
                
                if (predictedPosition && !isAnimatingRef.current && markerRef.current) {
                    const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
                    
                    // Solo usar predicción si han pasado más de 2 segundos sin datos reales
                    if (timeSinceLastUpdate > 2000) {
                        console.log('🔮 Usando predicción de posición durante pérdida de señal');
                        
                        // Actualizar posición con predicción (animación más sutil)
                        const currentPos = markerRef.current.getLatLng();
                        const distance = Math.sqrt(
                            Math.pow(predictedPosition.lat - currentPos.lat, 2) + 
                            Math.pow(predictedPosition.lng - currentPos.lng, 2)
                        );
                        
                        // Solo aplicar predicción si el movimiento es razonable (< 0.001 grados ≈ 100m)
                        if (distance < 0.001) {
                            markerRef.current.setLatLng([predictedPosition.lat, predictedPosition.lng]);
                        }
                    }
                }
                
                // Continuar predicción cada segundo
                predictionTimeoutRef.current = setTimeout(updatePrediction, 1000);
            };
            
            predictionTimeoutRef.current = setTimeout(updatePrediction, 1000);
        }, [isHistoryView]);

        // Función para detener predicción
        const stopPredictiveUpdates = useCallback(() => {
            if (predictionTimeoutRef.current) {
                clearTimeout(predictionTimeoutRef.current);
                predictionTimeoutRef.current = null;
            }
        }, []);

        // useEffect para limpieza de animaciones al desmontar
        useEffect(() => {
            return () => {
                // Cancelar animaciones pendientes al desmontar el componente
                animatorRef.current.cancelAnimation();
                predictorRef.current.clear();
                stopPredictiveUpdates();
            };
        }, [stopPredictiveUpdates]);

        // Procesar ubicaciones del historial para crear la ruta (optimizado)
        const processRouteCoordinates = useCallback(() => {
            if (!historyLocations || historyLocations.length === 0) return [];

            // Para tiempo real, mantener orden descendente (más reciente primero)
            // Para historial, ordenar por timestamp ascendente
            const sortedLocations = isHistoryView 
                ? historyLocations.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                : historyLocations; // Ya viene ordenado descendente para tiempo real

            return sortedLocations.map(location => [location.latitude, location.longitude] as [number, number]);
        }, [historyLocations, isHistoryView]);

        // Obtener coordenadas de la ruta
        const routeCoordinates = processRouteCoordinates();

        // Función para ajustar el mapa a toda la ruta (optimizada)
        const fitMapToRoute = useCallback(() => {
            if (!mapRef.current || routeCoordinates.length === 0) return;

            // Crear bounds que incluyan todas las coordenadas de la ruta
            const bounds = L.latLngBounds(routeCoordinates);

            // Ajustar el mapa con padding y animación suave
            mapRef.current.fitBounds(bounds, {
                padding: [30, 30], // Más padding para mejor visualización
                maxZoom: 16, // Zoom máximo más conservador
                animate: true,
                duration: 1.5, // Animación suave
                easeLinearity: 0.25
            });
        }, [routeCoordinates]);

        // Función para obtener color según la velocidad
        const getSpeedColor = useCallback((speed: number) => {
            if (speed === 0) return '#374151'; // Gris oscuro para detenido
            if (speed <= 40) return '#10B981'; // Verde para velocidad baja (1-40)
            if (speed <= 79) return '#F59E0B'; // Naranja para velocidad media (41-79)
            return '#EF4444'; // Rojo para velocidad alta (80+)
        }, []);

        // Crear segmentos de ruta con colores según velocidad
        const createRouteSegments = useCallback(() => {
            if (!historyLocations || historyLocations.length < 2) return [];

            const sortedLocations = historyLocations
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const segments = [];

            for (let i = 0; i < sortedLocations.length - 1; i++) {
                const current = sortedLocations[i];
                const next = sortedLocations[i + 1];

                const speed = current.speed || 0;
                const color = getSpeedColor(speed);

                segments.push({
                    positions: [
                        [current.latitude, current.longitude] as [number, number],
                        [next.latitude, next.longitude] as [number, number]
                    ],
                    color,
                    speed,
                    weight: speed > 0 ? Math.max(2, Math.min(6, speed / 10)) : 2,
                    opacity: 0.8
                });
            }

            return segments;
        }, [historyLocations, getSpeedColor]);

        // Obtener segmentos de la ruta
        const routeSegments = createRouteSegments();

        // Crear segmentos progresivos para animación de reproducción
        const createProgressiveRouteSegments = useCallback(() => {
            if (!showProgressiveRoute || !isPlaying || !historyLocations || historyLocations.length < 2) {
                return routeSegments;
            }

            const sortedLocations = historyLocations
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Solo mostrar segmentos hasta el índice actual de reproducción
            const progressiveSegments = [];
            const maxIndex = Math.min(currentLocationIndex + 1, sortedLocations.length - 1);

            for (let i = 0; i < maxIndex; i++) {
                const current = sortedLocations[i];
                const next = sortedLocations[i + 1];

                const speed = current.speed || 0;
                const color = getSpeedColor(speed);

                // Hacer el último segmento más prominente
                const isCurrentSegment = i === maxIndex - 1;

                progressiveSegments.push({
                    positions: [
                        [current.latitude, current.longitude] as [number, number],
                        [next.latitude, next.longitude] as [number, number]
                    ],
                    color: isCurrentSegment ? '#10B981' : color,
                    speed,
                    weight: isCurrentSegment ? Math.max(4, routeWeight + 1) : Math.max(2, Math.min(6, speed / 10)),
                    opacity: isCurrentSegment ? 1 : 0.7
                });
            }

            return progressiveSegments;
        }, [showProgressiveRoute, isPlaying, historyLocations, currentLocationIndex, routeSegments, getSpeedColor, routeWeight]);

        // Obtener segmentos finales (progresivos o completos)
        const finalRouteSegments = showProgressiveRoute && isPlaying ? createProgressiveRouteSegments() : routeSegments;

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

        // Crear iconos para inicio y fin de ruta
        const createStartIcon = () => {
            return L.divIcon({
                html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #10B981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: #ffffff;
            border-radius: 50%;
          "></div>
        </div>
      `,
                className: 'route-start-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        };

        const createEndIcon = () => {
            return L.divIcon({
                html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #EF4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: #ffffff;
            border-radius: 50%;
          "></div>
        </div>
      `,
                className: 'route-end-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        };

        // Función para calcular el ángulo entre dos puntos
        const calculateBearing = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const lat1Rad = lat1 * Math.PI / 180;
            const lat2Rad = lat2 * Math.PI / 180;

            const y = Math.sin(dLng) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

            let bearing = Math.atan2(y, x) * 180 / Math.PI;
            return (bearing + 360) % 360;
        }, []);

        // Crear icono personalizado con orientación
        const createCustomIcon = (rotation = 0) => {
            const iconColor = isConnected ? '#10B981' : '#EF4444'; // Verde si conectado, rojo si no
            const pulseColor = isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            
            return L.divIcon({
                html: `
        <div style="
          width: 50px;
          height: 50px;
          transform: rotate(${rotation}deg);
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        ">
          <!-- Marcador principal con forma de flecha -->
          <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, ${iconColor} 0%, ${iconColor}dd 100%);
            border: 3px solid #ffffff;
            clip-path: polygon(50% 0%, 0% 100%, 50% 85%, 100% 100%);
            box-shadow: 0 4px 12px ${pulseColor}, 0 0 0 4px ${pulseColor.replace('0.4', '0.1')};
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: devicePulse 2s infinite;
          ">
            <!-- Punto central -->
            <div style="
              width: 8px;
              height: 8px;
              background: #ffffff;
              border-radius: 50%;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            "></div>
          </div>
          
          <!-- Indicador de dirección adicional -->
          <div style="
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 12px solid ${iconColor};
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          "></div>
          
          <style>
            @keyframes devicePulse {
              0%, 100% { box-shadow: 0 4px 12px ${pulseColor}, 0 0 0 4px ${pulseColor.replace('0.4', '0.1')}; }
              50% { box-shadow: 0 6px 16px ${pulseColor.replace('0.4', '0.6')}, 0 0 0 8px ${pulseColor.replace('0.4', '0.2')}; }
            }
          </style>
        </div>
      `,
                className: 'custom-device-marker',
                iconSize: [50, 50],
                iconAnchor: [25, 25],
                popupAnchor: [0, -25]
            });
        };

        // Componente interno para manejar eventos del mapa usando useMap hook
        const MapEventHandler: React.FC = () => {
            const map = useMap();

            useEffect(() => {
                if (!map) return;

                mapRef.current = map;

                // Detectar interacción manual del usuario (optimizado)
                const handleUserInteraction = (eventType: string) => {
                    const now = Date.now();
                    // Solo marcar como interacción manual si no fue un movimiento automático reciente
                    // Tiempo de gracia más corto para tiempo real, más largo para historial
                    const graceTime = isHistoryView ? 2000 : 1000;
                    
                    if (now - lastAutoMoveRef.current > graceTime) {
                        userInteractedRef.current = true;
                        console.log(`👆 Interacción manual detectada: ${eventType}`);
                    }
                };

                // Event handlers específicos
                const handleDragStart = () => handleUserInteraction('dragstart');
                const handleDragEnd = () => handleUserInteraction('dragend');
                const handleZoomStart = () => handleUserInteraction('zoomstart');
                const handleZoomEnd = () => handleUserInteraction('zoomend');
                const handleMoveStart = (e: any) => {
                    // Solo si el movimiento no es programático
                    if (!e.hard) {
                        handleUserInteraction('movestart');
                    }
                };

                // Agregar listeners para detectar interacción manual
                map.on('dragstart', handleDragStart);
                map.on('dragend', handleDragEnd);
                map.on('zoomstart', handleZoomStart);
                map.on('zoomend', handleZoomEnd);
                map.on('movestart', handleMoveStart);

                // Solo establecer vista inicial si no hay interacción del usuario
                if (!userInteractedRef.current) {
                    const initialZoom = isHistoryView ? 13 : (hasValidCoordinates ? 17 : 15);
                    map.setView([latitude, longitude], initialZoom);
                }


                // Cleanup function
                return () => {
                    map.off('dragstart', handleDragStart);
                    map.off('dragend', handleDragEnd);
                    map.off('zoomstart', handleZoomStart);
                    map.off('zoomend', handleZoomEnd);
                    map.off('movestart', handleMoveStart);
                };
            }, [map]);

            return null;
        };

        // Calcular orientación del marker usando datos reales de course o calculando bearing
        const getMarkerRotation = useCallback(() => {
            // Prioridad 1: Usar orientación en tiempo real si está disponible (para vista en tiempo real)
            if (!isHistoryView && currentBearing !== undefined && currentBearing !== null && currentBearing >= 0) {
                return currentBearing;
            }

            // Para vista de historial o cuando no hay orientación en tiempo real
            if (!isPlaying || !historyLocations || historyLocations.length < 1) {
                // Si no estamos en reproducción pero tenemos orientación en tiempo real, usarla
                if (!isHistoryView && currentBearing !== undefined && currentBearing !== null && currentBearing >= 0) {
                    return currentBearing;
                }
                return 0;
            }

            const sortedLocations = historyLocations
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            const currentLoc = sortedLocations[currentLocationIndex];
            if (!currentLoc) return 0;

            // Prioridad 2: Usar datos reales de course/heading si están disponibles
            if (currentLoc.course !== undefined && currentLoc.course !== null && currentLoc.course >= 0) {
                return currentLoc.course;
            }

            // Prioridad 3: Calcular bearing entre puntos consecutivos
            if (currentLocationIndex > 0) {
                const prevLoc = sortedLocations[currentLocationIndex - 1];
                if (prevLoc) {
                    return calculateBearing(
                        prevLoc.latitude,
                        prevLoc.longitude,
                        currentLoc.latitude,
                        currentLoc.longitude
                    );
                }
            }

            // Prioridad 4: Si es el primer punto, intentar calcular con el siguiente
            if (currentLocationIndex < sortedLocations.length - 1) {
                const nextLoc = sortedLocations[currentLocationIndex + 1];
                if (nextLoc) {
                    return calculateBearing(
                        currentLoc.latitude,
                        currentLoc.longitude,
                        nextLoc.latitude,
                        nextLoc.longitude
                    );
                }
            }

            return 0;
        }, [isPlaying, historyLocations, currentLocationIndex, calculateBearing, currentBearing, isHistoryView]);

        // useCallback para crear marcador - SIEMPRE se ejecuta
        const createMarker = useCallback(() => {
            if (!mapRef.current) return null;

            const rotation = getMarkerRotation();
            const marker = L.marker([latitude, longitude], {
                icon: createCustomIcon(rotation)
            }).addTo(mapRef.current);

            // Crear popup personalizado con estado de conexión dinámico
            const connectionStatus = isConnected ? 'En línea' : 'Desconectado';
            const connectionColor = isConnected ? '#10B981' : '#EF4444';
            
            // Importar función para convertir bearing a dirección
            const bearingToDirection = (bearing: number): string => {
                const normalizedBearing = ((bearing % 360) + 360) % 360;
                
                if (normalizedBearing >= 337.5 || normalizedBearing < 22.5) return 'Norte';
                if (normalizedBearing >= 22.5 && normalizedBearing < 67.5) return 'Noreste';
                if (normalizedBearing >= 67.5 && normalizedBearing < 112.5) return 'Este';
                if (normalizedBearing >= 112.5 && normalizedBearing < 157.5) return 'Sureste';
                if (normalizedBearing >= 157.5 && normalizedBearing < 202.5) return 'Sur';
                if (normalizedBearing >= 202.5 && normalizedBearing < 247.5) return 'Suroeste';
                if (normalizedBearing >= 247.5 && normalizedBearing < 292.5) return 'Oeste';
                if (normalizedBearing >= 292.5 && normalizedBearing < 337.5) return 'Noroeste';
                
                return 'Desconocido';
            };
            
            const currentRotation = getMarkerRotation();
            const directionText = currentRotation > 0 ? bearingToDirection(currentRotation) : 'Sin datos';
            
            const popupContent = `
      <div style="
        background: rgba(17, 24, 39, 0.95);
        color: white;
        padding: 16px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        min-width: 220px;
        border: none;
      ">
        <div style="font-weight: 600; margin-bottom: 8px; text-align: center;">${deviceName}</div>
        <div style="font-size: 14px; color: #D1D5DB; margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 500;">Latitud:</span>
            <span style="font-family: monospace;">${latitude.toFixed(6)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 500;">Longitud:</span>
            <span style="font-family: monospace;">${longitude.toFixed(6)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 500;">Orientación:</span>
            <span style="font-family: monospace;">${currentRotation > 0 ? `${currentRotation.toFixed(1)}° (${directionText})` : 'Sin datos'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 500;">Última actualización:</span>
            <span style="font-size: 12px;">${new Date().toLocaleTimeString('es-ES')}</span>
          </div>
        </div>
        <div style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <div style="width: 8px; height: 8px; background: ${connectionColor}; border-radius: 50%; animation: pulse 2s infinite;"></div>
          <span style="font-size: 12px; color: ${connectionColor}; font-weight: 500;">${connectionStatus}</span>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
        }
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95) !important;
        }
      </style>
    `;

            marker.bindPopup(popupContent);
            markerRef.current = marker;

            return marker;
        }, [latitude, longitude, deviceName, getMarkerRotation, isConnected, createCustomIcon]);

        // useEffect para inicializar marcador - SIEMPRE se ejecuta
        useEffect(() => {
            if (mapRef.current && !markerRef.current) {
                createMarker();
            }
        }, [createMarker]);

        // useEffect para recrear marcador cuando cambie el estado de conexión
        useEffect(() => {
            if (mapRef.current && markerRef.current) {
                // Remover marcador anterior
                mapRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
                
                // Crear nuevo marcador con estado actualizado
                createMarker();
            }
        }, [isConnected, createMarker]);

        // useEffect para ajustar el mapa a la ruta cuando se carga el historial (SOLO UNA VEZ)
        useEffect(() => {
            if (showRoute && routeCoordinates.length > 1 && isHistoryView && !isPlaying && !userInteractedRef.current) {
                // Solo ajustar al cargar inicialmente si el usuario no ha interactuado
                setTimeout(() => {
                    fitMapToRoute();
                }, 500);
            }
        }, [showRoute, routeCoordinates.length, fitMapToRoute, isHistoryView]); // Removido isPlaying de dependencias
        // Función para interpolar orientación suavemente
        const interpolateBearing = useCallback((startBearing: number, endBearing: number, progress: number): number => {
            // Normalizar ángulos a 0-360
            const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
            
            const start = normalizeAngle(startBearing);
            const end = normalizeAngle(endBearing);
            
            // Calcular la diferencia más corta entre ángulos
            let diff = end - start;
            if (Math.abs(diff) > 180) {
                diff = diff > 0 ? diff - 360 : diff + 360;
            }
            
            return normalizeAngle(start + diff * progress);
        }, []);

        // Función para actualizar posición con interpolación suave
        const updateMarkerPositionSmooth = useCallback(async (newLat: number, newLng: number) => {
            if (!mapRef.current || !markerRef.current || isAnimatingRef.current) return;

            const newPosition: GeoCoordinates = { lat: newLat, lng: newLng };
            const currentPosition = markerRef.current.getLatLng();
            const startPosition: GeoCoordinates = { 
                lat: currentPosition.lat, 
                lng: currentPosition.lng 
            };

            // Verificar si la posición cambió significativamente
            if (Math.abs(startPosition.lat - newPosition.lat) < 0.00001 &&
                Math.abs(startPosition.lng - newPosition.lng) < 0.00001) {
                return;
            }

            // Añadir posición al predictor para futuras predicciones
            predictorRef.current.addPosition({
                ...newPosition,
                timestamp: Date.now()
            });

            // Calcular orientación inicial y final para interpolación suave
            const startBearing = getMarkerRotation();
            let endBearing = startBearing;
            
            // Calcular nueva orientación basada en el movimiento
            if (lastPositionRef.current) {
                const { calculateBearing } = await import('@/lib/utils/geo-utils');
                
                // Convertir GeoCoordinates a GeoPoint para calculateBearing
                const startPoint = {
                    latitude: lastPositionRef.current.lat,
                    longitude: lastPositionRef.current.lng
                };
                const endPoint = {
                    latitude: newPosition.lat,
                    longitude: newPosition.lng
                };
                
                endBearing = calculateBearing(startPoint, endPoint);
            }
            
            // Si tenemos datos de rumbo GPS, usar esos en su lugar
            const gpsRotation = getMarkerRotation();
            if (gpsRotation > 0) {
                endBearing = gpsRotation;
            }

            // Configurar duración de animación según el contexto
            const duration = isPlaying && isHistoryView ? 800 : 600;
            const easing = isHistoryView ? easeInOutCubic : easeInOutCubic;

            isAnimatingRef.current = true;

            try {
                // Animar movimiento suave del marcador con rotación interpolada
                await animatorRef.current.smoothMove(startPosition, newPosition, {
                    duration,
                    easing,
                    onUpdate: (position, progress) => {
                        if (markerRef.current) {
                            // Actualizar posición del marcador durante la animación
                            markerRef.current.setLatLng([position.lat, position.lng]);
                            
                            // Interpolar orientación suavemente
                            const currentBearing = interpolateBearing(startBearing, endBearing, progress);
                            const newIcon = createCustomIcon(currentBearing);
                            markerRef.current.setIcon(newIcon);
                        }
                    },
                    onComplete: () => {
                        isAnimatingRef.current = false;
                        
                        // Actualizar orientación final
                        if (markerRef.current) {
                            const finalRotation = getMarkerRotation() || endBearing;
                            const newIcon = createCustomIcon(finalRotation);
                            markerRef.current.setIcon(newIcon);
                        }
                    }
                });
            } catch (error) {
                console.warn('Error en animación del marcador:', error);
                isAnimatingRef.current = false;
                
                // Fallback: actualización directa
                if (markerRef.current) {
                    markerRef.current.setLatLng([newPosition.lat, newPosition.lng]);
                    const rotation = getMarkerRotation() || endBearing;
                    const newIcon = createCustomIcon(rotation);
                    markerRef.current.setIcon(newIcon);
                }
            }

            // Actualizar referencia de última posición
            lastPositionRef.current = newPosition;

        }, [isPlaying, isHistoryView, getMarkerRotation, createCustomIcon, interpolateBearing]);

        // useEffect para actualizar posición y orientación con throttling optimizado - SIEMPRE se ejecuta
        useEffect(() => {
            if (mapRef.current && markerRef.current && hasValidCoordinates) {
                // Actualizar timestamp de última actualización real
                lastUpdateTimeRef.current = Date.now();
                
                // Detener predicción cuando llegan datos reales
                stopPredictiveUpdates();
                
                // Aplicar throttling inteligente
                const shouldUpdate = isHistoryView ? throttlerRef.current.shouldUpdate() : true; // Siempre actualizar en tiempo real
                
                if (shouldUpdate) {
                    // Usar interpolación suave para tiempo real
                    if (!isHistoryView) {
                        updateMarkerPositionSmooth(latitude, longitude);
                        
                        // Iniciar predicción para futuras pérdidas de señal
                        setTimeout(() => {
                            startPredictiveUpdates();
                        }, 1000);
                    } else {
                        // Para vista de historial, usar animación CSS más simple
                        const newPosition: [number, number] = [latitude, longitude];
                        const markerElement = markerRef.current.getElement();
                        
                        if (markerElement) {
                            markerElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                        }
                        
                        markerRef.current.setLatLng(newPosition);
                        
                        // Actualizar orientación
                        const rotation = getMarkerRotation();
                        const newIcon = createCustomIcon(rotation);
                        markerRef.current.setIcon(newIcon);
                    }

                    // Centrado automático suave SOLO para vista en tiempo real (no historial)
                    if (!shouldFlyTo && !isHistoryView && !userInteractedRef.current && !isAnimatingRef.current) {
                        lastAutoMoveRef.current = Date.now();

                        // Usar panTo para movimiento suave sin cambiar zoom
                        mapRef.current.panTo([latitude, longitude], {
                            animate: true,
                            duration: 0.5,
                            easeLinearity: 0.25
                        });

                        // Reset flag de interacción después de un tiempo más corto
                        setTimeout(() => {
                            userInteractedRef.current = false;
                        }, 1500);
                    }
                }
            }
        }, [latitude, longitude, shouldFlyTo, hasValidCoordinates, isPlaying, isHistoryView, updateMarkerPositionSmooth, stopPredictiveUpdates, startPredictiveUpdates]);

        // useEffect para flyTo - OPTIMIZADO para respetar interacción del usuario
        useEffect(() => {
            if (shouldFlyTo && mapRef.current && hasValidCoordinates && !isHistoryView && !userInteractedRef.current) {
                const newPosition: [number, number] = [latitude, longitude];
                lastAutoMoveRef.current = Date.now();

                // Usar flyTo solo si el usuario no ha interactuado
                const currentZoom = mapRef.current.getZoom();
                mapRef.current.flyTo(newPosition, Math.max(currentZoom, 17), {
                    duration: 1.2, // Animación más rápida
                    easeLinearity: 0.15,
                    animate: true
                });

                // Actualizar posición del marcador sin animación excesiva
                if (markerRef.current) {
                    markerRef.current.setLatLng(newPosition);
                }

                // Notificar que la animación se completó
                setTimeout(() => {
                    onAnimationComplete?.();
                }, 1300);
            }
        }, [shouldFlyTo, latitude, longitude, onAnimationComplete, hasValidCoordinates, isHistoryView]);

        // useEffect para shake del marcador - SIEMPRE se ejecuta
        useEffect(() => {
            if (shouldShakeMarker && markerRef.current) {
                // Usar animación CSS para el shake
                const markerElement = markerRef.current.getElement();
                if (markerElement) {
                    markerElement.style.animation = 'none';
                    setTimeout(() => {
                        markerElement.style.animation = 'markerShake 0.7s ease-in-out';
                    }, 10);
                }

                setTimeout(() => {
                    onAnimationComplete?.();
                }, 700);
            }
        }, [shouldShakeMarker, onAnimationComplete]);

        // Renderizar el mapa de Leaflet - SIEMPRE retorna JSX
        if (!isClient) {
            return (
                <div className="bg-gray-900 rounded-lg flex items-center justify-center w-full h-full">
                    <div className="text-gray-400 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        Cargando mapa...
                    </div>
                </div>
            );
        }

        return (
            <MapContainer
                center={[latitude, longitude]}
                zoom={isHistoryView ? 13 : 17}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                attributionControl={false}
                whenReady={() => {
                    // El mapa se configurará en useEffect
                }}
                ref={mapRef}
            >
                {/* Componente para manejar eventos del mapa */}
                <MapEventHandler />

                {/* Mensaje de estado cuando no hay coordenadas válidas */}
                {!hasValidCoordinates && !isHistoryView && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        background: 'rgba(17, 24, 39, 0.9)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Esperando recibir coordenadas</div>
                        <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '8px' }}>
                            {isConnected ? 'Conectado - Recibiendo datos GPS' : 'Conectando al dispositivo...'}
                        </div>
                        {isConnected && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                                <span style={{ fontSize: '12px', color: '#10B981' }}>En línea</span>
                            </div>
                        )}
                    </div>
                )}

                {/* TileLayer con tema dinámico */}
                <TileLayer
                    url={theme === 'dark'
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    subdomains="abcd"
                    maxZoom={20}
                />

                {/* Línea principal de tracking - conecta TODAS las coordenadas */}
                {showRoute && routeCoordinates.length > 1 && (
                    <Polyline
                        key={`main-tracking-line-${isHistoryView ? 'history' : 'realtime'}-${routeCoordinates.length}`}
                        positions={showProgressiveRoute && isPlaying
                            ? routeCoordinates.slice(0, currentLocationIndex + 1)
                            : routeCoordinates
                        }
                        pathOptions={{
                            color: isHistoryView ? '#3B82F6' : '#10B981', // Verde para tiempo real, azul para historial
                            weight: isHistoryView ? 4 : 5, // Más grueso para tiempo real
                            opacity: isHistoryView ? 0.9 : 1,
                            dashArray: '0',
                            lineCap: 'round',
                            lineJoin: 'round'
                        }}
                    />
                )}

                {/* Segmentos de ruta con colores según velocidad */}
                {showRoute && finalRouteSegments.length > 0 && (
                    <>
                        {finalRouteSegments.map((segment, index) => (
                            <Polyline
                                key={`route-segment-${index}-${isPlaying ? currentLocationIndex : 'static'}`}
                                positions={segment.positions}
                                pathOptions={{
                                    color: segment.color,
                                    weight: segment.weight,
                                    opacity: segment.opacity || 0.6
                                }}
                            />
                        ))}
                    </>
                )}

                {/* Puntos individuales de coordenadas con tooltips informativos */}
                {showRoute && historyLocations && historyLocations.length > 0 && isHistoryView && (
                    <>
                        {historyLocations
                            .filter((_, index) => {
                                // Optimización: mostrar máximo 50 puntos para evitar problemas de rendimiento
                                if (historyLocations.length <= 50) return true;
                                const step = Math.ceil(historyLocations.length / 50);
                                return index % step === 0 || index === historyLocations.length - 1;
                            })
                            .map((location, filteredIndex) => {
                                // Usar numeración secuencial basada en el índice filtrado
                                const displayNumber = filteredIndex + 1;
                                const originalIndex = historyLocations.indexOf(location);
                                const timestamp = new Date(location.timestamp);
                                const timeString = timestamp.toLocaleTimeString('es-ES', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                });
                                
                                return (
                                    <Marker
                                        key={`coordinate-point-${originalIndex}`}
                                        position={[location.latitude, location.longitude]}
                                        icon={createCoordinatePointIcon(location.speed || 0)}
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
                                                    🚩 Registro {displayNumber} - {timeString}
                                                </div>

                                                <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <span style={{ fontWeight: 500 }}>Fecha y Hora:</span>
                                                    </div>
                                                    <div style={{ fontSize: '13px', marginBottom: '8px', textAlign: 'center', background: 'rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                                                        {new Date(location.timestamp).toLocaleString('es-ES', {
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
                                                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{location.latitude.toFixed(6)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 500 }}>Longitud:</span>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{location.longitude.toFixed(6)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 500 }}>Velocidad:</span>
                                                        <span style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '12px',
                                                            color: getSpeedColor(location.speed || 0),
                                                            fontWeight: 600
                                                        }}>
                                                            {(location.speed || 0).toFixed(1)} km/h
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => {
                                                            const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${location.latitude},${location.longitude}`;
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
                                );
                            })}
                    </>
                )}

                {/* Marcadores de inicio y fin de ruta */}
                {showRoute && historyLocations && historyLocations.length > 1 && (
                    <>
                        {/* Marcador de inicio */}
                        <Marker
                            position={[historyLocations[0].latitude, historyLocations[0].longitude]}
                            icon={createStartIcon()}
                        >
                            <Popup>
                                <div style={{
                                    background: 'rgba(17, 24, 39, 0.95)',
                                    color: 'white',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    minWidth: '180px'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '6px', color: '#10B981' }}>🚀 Inicio de Ruta</div>
                                    <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                                        {new Date(historyLocations[0].timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Marcador de fin */}
                        <Marker
                            position={[historyLocations[historyLocations.length - 1].latitude, historyLocations[historyLocations.length - 1].longitude]}
                            icon={createEndIcon()}
                        >
                            <Popup>
                                <div style={{
                                    background: 'rgba(17, 24, 39, 0.95)',
                                    color: 'white',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    minWidth: '180px'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '6px', color: '#EF4444' }}>🏁 Fin de Ruta</div>
                                    <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                                        {new Date(historyLocations[historyLocations.length - 1].timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}

                {/* Marcador personalizado */}
                {/*<Marker
                    position={[latitude, longitude]}
                    icon={createCustomIcon(getMarkerRotation())}
                >
                    <Popup>
                        <div style={{
                            background: 'rgba(17, 24, 39, 0.95)',
                            color: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            minWidth: '220px',
                            border: 'none'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>{deviceName}</div>
                            <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 500 }}>Latitud:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{latitude.toFixed(6)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 500 }}>Longitud:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{longitude.toFixed(6)}</span>
                                </div>
                                {lastLocationUpdate && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 500 }}>Última actualización:</span>
                                        <span style={{ fontSize: '12px' }}>{new Date(lastLocationUpdate).toLocaleString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    background: isConnected ? '#10B981' : '#6B7280',
                                    borderRadius: '50%',
                                    animation: isConnected ? 'pulse 2s infinite' : 'none'
                                }}></div>
                                <span style={{
                                    fontSize: '12px',
                                    color: isConnected ? '#10B981' : '#6B7280',
                                    fontWeight: 500
                                }}>
                                    {isHistoryView
                                        ? 'Vista de historial'
                                        : (hasValidCoordinates
                                            ? (isConnected ? 'En línea' : 'Datos GPS disponibles')
                                            : 'Esperando coordenadas'
                                        )
                                    }
                                </span>
                            </div>
                        </div>
                    </Popup>
                </Marker>*/}
            </MapContainer>
        );
    };

// Componente de carga
const MapLoadingComponent: React.FC = () => (
    <div className="bg-gray-900 rounded-lg flex items-center justify-center w-full h-full">
        <div className="text-gray-400 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            Cargando mapa...
        </div>
    </div>
);

// Componente de error
const MapErrorComponent: React.FC<{ error?: string }> = ({ error }) => (
    <div className="bg-red-50 rounded-lg flex items-center justify-center w-full h-full">
        <div className="text-red-600 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-medium">Error al cargar el mapa</div>
            <div className="text-sm mt-1">{error || 'Error desconocido'}</div>
        </div>
    </div>
);

interface DeviceMapProps {
    latitude?: number;
    longitude?: number;
    deviceName?: string;
    className?: string;
    shouldFlyTo?: boolean;
    shouldShakeMarker?: boolean;
    onAnimationComplete?: () => void;
    historyLocations?: DeviceHistoryLocation[];
    showRoute?: boolean;
    routeColor?: string;
    routeWeight?: number;
    fitToRoute?: boolean;
    isPlaying?: boolean;
    currentLocationIndex?: number;
    showProgressiveRoute?: boolean;
    hasValidCoordinates?: boolean;
    isConnected?: boolean;
    lastLocationUpdate?: string | null;
    theme?: string;
    isHistoryView?: boolean; // Nueva prop para indicar si es vista de historial
    currentBearing?: number; // Nueva prop para orientación en tiempo real (rumbo GPS)
}

export const DeviceMap: React.FC<DeviceMapProps> = ({
    latitude = 19.4326,
    longitude = -99.1332,
    deviceName = 'Dispositivo',
    className = '',
    shouldFlyTo = false,
    shouldShakeMarker = false,
    onAnimationComplete,
    historyLocations = [],
    showRoute = false,
    routeColor = '#10B981',
    routeWeight = 3,
    fitToRoute = false,
    isPlaying = false,
    currentLocationIndex = 0,
    showProgressiveRoute = false,
    hasValidCoordinates = false,
    isConnected = false,
    lastLocationUpdate = null,
    theme = 'dark',
    isHistoryView = false,
    currentBearing
}) => {
    const [isClient, setIsClient] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <MapLoadingComponent />;
    }

    if (error) {
        return <MapErrorComponent error={error} />;
    }

    return (
        <div className={`rounded-lg overflow-hidden shadow-2xl ${className}`}>
            <style jsx global>{`
        @keyframes markerDrop {
          0% {
            transform: translateY(-100px) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateY(10px) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes markerShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .leaflet-container {
          background: #1f2937 !important;
        }
        
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 8px !important;
        }
        
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95) !important;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        
        .leaflet-control-zoom a {
          background: rgba(17, 24, 39, 0.9) !important;
          color: white !important;
          border: 1px solid rgba(75, 85, 99, 0.3) !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: rgba(31, 41, 55, 0.9) !important;
        }
      `}</style>

            <LeafletMapComponent
                latitude={latitude}
                longitude={longitude}
                deviceName={deviceName}
                shouldFlyTo={shouldFlyTo}
                shouldShakeMarker={shouldShakeMarker}
                onAnimationComplete={onAnimationComplete}
                historyLocations={historyLocations}
                showRoute={showRoute}
                routeColor={routeColor}
                routeWeight={routeWeight}
                isPlaying={isPlaying}
                currentLocationIndex={currentLocationIndex}
                showProgressiveRoute={showProgressiveRoute}
                hasValidCoordinates={hasValidCoordinates}
                isConnected={isConnected}
                lastLocationUpdate={lastLocationUpdate}
                theme={theme}
                isHistoryView={isHistoryView}
                currentBearing={currentBearing}
            />
        </div>
    );
};
"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  showProgressiveRoute = false
}) => {
  // Todos los hooks deben estar en el top level - SIEMPRE
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userInteractedRef = useRef<boolean>(false);
  const lastAutoMoveRef = useRef<number>(0);
  const [isClient, setIsClient] = useState(false);

  // useEffect para inicializar cliente - SIEMPRE se ejecuta
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Procesar ubicaciones del historial para crear la ruta
  const processRouteCoordinates = useCallback(() => {
    if (!historyLocations || historyLocations.length === 0) return [];
    
    // Ordenar por timestamp y convertir a coordenadas de Leaflet
    return historyLocations
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(location => [location.latitude, location.longitude] as [number, number]);
  }, [historyLocations]);

  // Obtener coordenadas de la ruta
  const routeCoordinates = processRouteCoordinates();

  // Función para ajustar el mapa a toda la ruta
  const fitMapToRoute = useCallback(() => {
    if (!mapRef.current || routeCoordinates.length === 0) return;
    
    // Crear bounds que incluyan todas las coordenadas de la ruta
    const bounds = L.latLngBounds(routeCoordinates);
    
    // Ajustar el mapa con padding
    mapRef.current.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 18
    });
  }, [routeCoordinates]);

  // Función para obtener color según la velocidad
  const getSpeedColor = useCallback((speed: number) => {
    if (speed <= 0) return '#6B7280'; // Gris para parado
    if (speed <= 20) return '#10B981'; // Verde para velocidad baja
    if (speed <= 50) return '#F59E0B'; // Amarillo para velocidad media
    if (speed <= 80) return '#EF4444'; // Rojo para velocidad alta
    return '#DC2626'; // Rojo oscuro para velocidad muy alta
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

  // Crear icono personalizado más atractivo
  const createCustomIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 0 0 4px rgba(16, 185, 129, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: devicePulse 2s infinite;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          "></div>
          <style>
            @keyframes devicePulse {
              0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 0 0 4px rgba(16, 185, 129, 0.1); }
              50% { transform: scale(1.05); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.6), 0 0 0 8px rgba(16, 185, 129, 0.2); }
            }
          </style>
        </div>
      `,
      className: 'custom-device-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  // Componente interno para manejar eventos del mapa usando useMap hook
  const MapEventHandler: React.FC = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map) return;
      
      mapRef.current = map;
      
      // Detectar interacción manual del usuario
      const handleUserInteraction = (eventType: string) => {
        const now = Date.now();
        // Solo marcar como interacción manual si no fue un movimiento automático reciente
        if (now - lastAutoMoveRef.current > 1500) { // Aumentar el tiempo de gracia
          userInteractedRef.current = true;
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

      map.setView([latitude, longitude], 18);


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
  
  // useCallback para crear marcador - SIEMPRE se ejecuta
  const createMarker = useCallback(() => {
    if (!mapRef.current) return null;
    
    const marker = L.marker([latitude, longitude], {
      icon: createCustomIcon()
    }).addTo(mapRef.current);
    
    // Crear popup personalizado
    const popupContent = `
      <div style="
        background: rgba(17, 24, 39, 0.95);
        color: white;
        padding: 16px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        min-width: 200px;
        border: none;
      ">
        <div style="font-weight: 600; margin-bottom: 8px; text-align: center;">${deviceName}</div>
        <div style="font-size: 14px; color: #D1D5DB; margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 500;">Latitud:</span>
            <span style="font-family: monospace;">${latitude.toFixed(6)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 500;">Longitud:</span>
            <span style="font-family: monospace;">${longitude.toFixed(6)}</span>
          </div>
        </div>
        <div style="margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <div style="width: 8px; height: 8px; background: #10B981; border-radius: 50%; animation: pulse 2s infinite;"></div>
          <span style="font-size: 12px; color: #10B981; font-weight: 500;">En línea</span>
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
  }, [latitude, longitude, deviceName]);
  
  // useEffect para inicializar marcador - SIEMPRE se ejecuta
  useEffect(() => {
    if (mapRef.current && !markerRef.current) {
      createMarker();
    }
  }, [createMarker]);

  // useEffect para ajustar el mapa a la ruta cuando se carga el historial
  useEffect(() => {
    if (showRoute && routeCoordinates.length > 1) {
      // Pequeño delay para asegurar que el mapa esté completamente inicializado
      setTimeout(() => {
        fitMapToRoute();
      }, 500);
    }
  }, [showRoute, routeCoordinates.length, fitMapToRoute]);
  // useEffect para actualizar posición - SIEMPRE se ejecuta
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const newPosition: [number, number] = [latitude, longitude];
      
      // Solo actualizar si las coordenadas son diferentes
      const currentPosition = markerRef.current.getLatLng();
      if (!currentPosition || 
          Math.abs(currentPosition.lat - latitude) > 0.0001 || 
          Math.abs(currentPosition.lng - longitude) > 0.0001) {
        
        // Actualizar posición del marcador
        markerRef.current.setLatLng(newPosition);
        
        // Re-centrado automático: si el usuario movió el mapa y llegan nuevas coordenadas
        if (!shouldFlyTo && userInteractedRef.current) {
            
          lastAutoMoveRef.current = Date.now();
          mapRef.current.setView(newPosition, Math.max(16, mapRef.current.getZoom()), {
            animate: true,
            duration: 1.0
          });
          userInteractedRef.current = false; // Reset flag después del re-centrado
        }
      }
    }
  }, [latitude, longitude, shouldFlyTo]);

  // useEffect para flyToBounds - SIEMPRE se ejecuta
  useEffect(() => {
    if (shouldFlyTo && mapRef.current) {
      const newPosition: [number, number] = [latitude, longitude];
      lastAutoMoveRef.current = Date.now();
      
      // Si el usuario interactuó manualmente, forzar re-centrado
      userInteractedRef.current = false;
      
      // Usar flyToBounds de Leaflet para una animación suave y visible
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.max(18, currentZoom);
      
      // Crear bounds más amplios alrededor del punto para flyToBounds más visible
      const bounds = L.latLngBounds([newPosition, newPosition]).pad(0.005);
      
      // Usar flyToBounds con opciones de animación más visibles
      mapRef.current.flyToBounds(bounds, {
        duration: 1.5, // Duración más larga para ser más visible
        easeLinearity: 0.5, // Animación más suave
        maxZoom: targetZoom,
        animate: true
      });

      mapRef.current.setView(newPosition, Math.max(16, mapRef.current.getZoom()), {
            animate: true,
            duration: 1.0
          });
      
      // Actualizar posición del marcador con animación
      if (markerRef.current) {
        markerRef.current.setLatLng(newPosition);
        
        // Simular animación de "drop" con CSS
        const markerElement = markerRef.current.getElement();
        if (markerElement) {
          markerElement.style.animation = 'none';
          setTimeout(() => {
            markerElement.style.animation = 'markerDrop 1.2s ease-out';
          }, 500); // Delay para que se vea después del flyTo
        }
      }
      
      // Notificar que la animación se completó
      setTimeout(() => {
        onAnimationComplete?.();
      }, 2000); // Tiempo ajustado a la duración de la animación
    }
  }, [shouldFlyTo, latitude, longitude, onAnimationComplete]);

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
      zoom={18}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      attributionControl={false}
    >
      {/* Componente para manejar eventos del mapa */}
      <MapEventHandler />
      
      {/* TileLayer con tema oscuro */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      
      {/* Línea principal de tracking - conecta TODAS las coordenadas */}
      {showRoute && routeCoordinates.length > 1 && (
        <Polyline
          key={`main-tracking-line-${isPlaying ? currentLocationIndex : 'static'}`}
          positions={showProgressiveRoute && isPlaying 
            ? routeCoordinates.slice(0, currentLocationIndex + 1)
            : routeCoordinates
          }
          pathOptions={{
            color: '#3B82F6',
            weight: 4,
            opacity: 0.9,
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
      <Marker 
        position={[latitude, longitude]} 
        icon={createCustomIcon()}
      >
        <Popup>
          <div style={{
            background: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            minWidth: '200px',
            border: 'none'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>{deviceName}</div>
            <div style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500 }}>Latitud:</span>
                <span style={{ fontFamily: 'monospace' }}>{latitude.toFixed(6)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500 }}>Longitud:</span>
                <span style={{ fontFamily: 'monospace' }}>{longitude.toFixed(6)}</span>
              </div>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>En línea</span>
            </div>
          </div>
        </Popup>
      </Marker>
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
  showProgressiveRoute = false
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
      />
    </div>
  );
};
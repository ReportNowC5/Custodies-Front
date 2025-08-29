"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Icono personalizado para el dispositivo con animación
const deviceIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'device-marker'
});

// Componente para manejar animaciones del mapa
const MapController: React.FC<{
  latitude: number;
  longitude: number;
  shouldFlyTo: boolean;
  onFlyToComplete: () => void;
}> = ({ latitude, longitude, shouldFlyTo, onFlyToComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (shouldFlyTo) {
      map.flyTo([latitude, longitude], 15, {
        duration: 2,
        easeLinearity: 0.25
      });
      
      // Llamar callback después de la animación
      setTimeout(() => {
        onFlyToComplete();
      }, 2000);
    }
  }, [map, latitude, longitude, shouldFlyTo, onFlyToComplete]);

  return null;
};

// Componente para el marker con animación shake
const AnimatedMarker: React.FC<{
  position: [number, number];
  deviceName: string;
  shouldShake: boolean;
  onShakeComplete: () => void;
}> = ({ position, deviceName, shouldShake, onShakeComplete }) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (shouldShake && markerRef.current) {
      const marker = markerRef.current;
      const element = marker.getElement();
      
      if (element) {
        element.classList.add('marker-shake');
        setTimeout(() => {
          element.classList.remove('marker-shake');
          onShakeComplete();
        }, 600);
      }
    }
  }, [shouldShake, onShakeComplete]);

  return (
    <Marker 
      ref={markerRef}
      position={position} 
      icon={deviceIcon}
    >
      <Popup className="device-popup">
        <div className="text-center p-2">
          <div className="font-semibold text-gray-900 mb-2">{deviceName}</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Latitud:</span>
              <span className="font-mono">{position[0].toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Longitud:</span>
              <span className="font-mono">{position[1].toFixed(6)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">En línea</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

interface DeviceMapProps {
  latitude?: number;
  longitude?: number;
  deviceName?: string;
  className?: string;
  shouldFlyTo?: boolean;
  shouldShakeMarker?: boolean;
  onAnimationComplete?: () => void;
}

export const DeviceMap: React.FC<DeviceMapProps> = ({
  latitude = 19.4326,
  longitude = -99.1332,
  deviceName = 'Dispositivo',
  className = '',
  shouldFlyTo = false,
  shouldShakeMarker = false,
  onAnimationComplete
}) => {
  const [isClient, setIsClient] = useState(false);
  const [flyToActive, setFlyToActive] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (shouldFlyTo) {
      setFlyToActive(true);
    }
  }, [shouldFlyTo]);

  useEffect(() => {
    if (shouldShakeMarker) {
      setShakeActive(true);
    }
  }, [shouldShakeMarker]);

  const handleFlyToComplete = useCallback(() => {
    setFlyToActive(false);
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const handleShakeComplete = useCallback(() => {
    setShakeActive(false);
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  if (!isClient) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-400 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          Cargando mapa...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos CSS para animaciones */}
      <style jsx global>{`
        .device-marker {
          filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
          transition: all 0.3s ease;
        }
        
        .marker-shake {
          animation: markerShake 0.6s ease-in-out;
        }
        
        @keyframes markerShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        .device-popup .leaflet-popup-content-wrapper {
          background: rgba(17, 24, 39, 0.95);
          color: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        
        .device-popup .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95);
        }
        
        .leaflet-container {
          background: #1f2937 !important;
        }
      `}</style>
      
      <div className={`rounded-lg overflow-hidden shadow-2xl ${className}`}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={false}
          attributionControl={false}
        >
          {/* Tema oscuro - CartoDB Dark Matter */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          
          {/* Controlador de animaciones */}
          <MapController
            latitude={latitude}
            longitude={longitude}
            shouldFlyTo={flyToActive}
            onFlyToComplete={handleFlyToComplete}
          />
          
          {/* Marker animado */}
          <AnimatedMarker
            position={[latitude, longitude]}
            deviceName={deviceName}
            shouldShake={shakeActive}
            onShakeComplete={handleShakeComplete}
          />
        </MapContainer>
      </div>
    </>
  );
};
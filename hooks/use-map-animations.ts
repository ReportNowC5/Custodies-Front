"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface UseMapAnimationsProps {
  coordinates: MapCoordinates | null;
  isConnected: boolean;
  gpsData: any;
  autoFollow?: boolean;
  flyToDuration?: number;
  shakeOnUpdate?: boolean;
}

interface UseMapAnimationsReturn {
  shouldFlyTo: boolean;
  shouldShakeMarker: boolean;
  shouldFollowDevice: boolean;
  isFirstLocation: boolean;
  animationState: 'idle' | 'flying' | 'shaking' | 'following';
  triggerFlyTo: () => void;
  triggerShake: () => void;
  enableFollowMode: () => void;
  disableFollowMode: () => void;
  resetAnimations: () => void;
  onAnimationComplete: () => void;
}

export const useMapAnimations = ({
  coordinates,
  isConnected,
  gpsData,
  autoFollow = true,
  flyToDuration = 2000,
  shakeOnUpdate = true
}: UseMapAnimationsProps): UseMapAnimationsReturn => {
  // Estados de animación
  const [shouldFlyTo, setShouldFlyTo] = useState(false);
  const [shouldShakeMarker, setShouldShakeMarker] = useState(false);
  const [shouldFollowDevice, setShouldFollowDevice] = useState(autoFollow);
  const [isFirstLocation, setIsFirstLocation] = useState(true);
  const [animationState, setAnimationState] = useState<'idle' | 'flying' | 'shaking' | 'following'>('idle');
  
  // Referencias para control de timeouts
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCoordinatesRef = useRef<MapCoordinates | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Función para verificar si las coordenadas han cambiado significativamente
  const hasCoordinatesChanged = useCallback((newCoords: MapCoordinates, oldCoords: MapCoordinates | null) => {
    if (!oldCoords) return true;
    
    const latDiff = Math.abs(newCoords.latitude - oldCoords.latitude);
    const lngDiff = Math.abs(newCoords.longitude - oldCoords.longitude);
    
    // Considerar cambio significativo si la diferencia es mayor a ~10 metros (aproximadamente 0.0001 grados)
    return latDiff > 0.0001 || lngDiff > 0.0001;
  }, []);
  
  // Función para activar flyTo
  const triggerFlyTo = useCallback(() => {
    if (animationState === 'flying') return;
    
    setShouldFlyTo(true);
    setAnimationState('flying');
    
    // Limpiar timeout anterior si existe
    if (flyToTimeoutRef.current) {
      clearTimeout(flyToTimeoutRef.current);
    }
    
    // Auto-reset después de la duración de la animación
    flyToTimeoutRef.current = setTimeout(() => {
      setShouldFlyTo(false);
      setAnimationState('idle');
    }, flyToDuration);
  }, [animationState, flyToDuration]);
  
  // Función para activar shake
  const triggerShake = useCallback(() => {
    if (animationState === 'shaking') return;
    
    setShouldShakeMarker(true);
    setAnimationState('shaking');
    
    // Limpiar timeout anterior si existe
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    
    // Auto-reset después de 600ms (duración de la animación shake)
    shakeTimeoutRef.current = setTimeout(() => {
      setShouldShakeMarker(false);
      setAnimationState('idle');
    }, 600);
  }, [animationState]);
  
  // Función para habilitar modo seguimiento
  const enableFollowMode = useCallback(() => {
    setShouldFollowDevice(true);
  }, []);
  
  // Función para deshabilitar modo seguimiento
  const disableFollowMode = useCallback(() => {
    setShouldFollowDevice(false);
  }, []);
  
  // Función para resetear todas las animaciones
  const resetAnimations = useCallback(() => {
    setShouldFlyTo(false);
    setShouldShakeMarker(false);
    setAnimationState('idle');
    
    if (flyToTimeoutRef.current) {
      clearTimeout(flyToTimeoutRef.current);
      flyToTimeoutRef.current = null;
    }
    
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = null;
    }
  }, []);
  
  // Callback para cuando se completa una animación
  const onAnimationComplete = useCallback(() => {
    setShouldFlyTo(false);
    setShouldShakeMarker(false);
    setAnimationState('idle');
  }, []);
  
  // Efecto principal para manejar cambios en las coordenadas
  useEffect(() => {
    if (!coordinates) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Evitar animaciones muy frecuentes (mínimo 500ms entre animaciones)
    if (timeSinceLastUpdate < 500 && !isFirstLocation) return;
    
    const hasChanged = hasCoordinatesChanged(coordinates, lastCoordinatesRef.current);
    
    if (hasChanged || isFirstLocation) {
      console.log('🎯 Coordenadas cambiaron, activando animaciones:', {
        isFirst: isFirstLocation,
        coordinates,
        previous: lastCoordinatesRef.current,
        isConnected
      });
      
      if (isFirstLocation) {
        // Primera ubicación: activar flyTo inmediatamente
        console.log('🚀 Primera ubicación detectada, activando flyTo');
        triggerFlyTo();
        setIsFirstLocation(false);
      } else {
        // Actualizaciones posteriores
        if (shakeOnUpdate) {
          triggerShake();
        }
        
        // Si el modo seguimiento está activo, activar flyTo para seguir el dispositivo
        if (shouldFollowDevice) {
          setTimeout(() => {
            triggerFlyTo();
          }, shakeOnUpdate ? 300 : 0); // Delay solo si hay shake
        }
      }
      
      // Actualizar referencias
      lastCoordinatesRef.current = coordinates;
      lastUpdateTimeRef.current = now;
    }
  }, [coordinates, isConnected, isFirstLocation, hasCoordinatesChanged, triggerFlyTo, triggerShake, shouldFollowDevice, shakeOnUpdate]);
  
  // Efecto para manejar cambios en los datos GPS (para debugging)
  useEffect(() => {
    if (gpsData) {
      console.log('🗺️ useMapAnimations - Datos GPS recibidos:', {
        type: gpsData.type,
        hasCoordinates: !!coordinates,
        animationState,
        isFirstLocation,
        shouldFollowDevice
      });
    }
  }, [gpsData, coordinates, animationState, isFirstLocation, shouldFollowDevice]);
  
  // Efecto para resetear el estado cuando se pierde la conexión
  useEffect(() => {
    if (!isConnected) {
      resetAnimations();
      setIsFirstLocation(true); // Resetear para que la próxima conexión active flyTo
    }
  }, [isConnected, resetAnimations]);
  
  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (flyToTimeoutRef.current) {
        clearTimeout(flyToTimeoutRef.current);
      }
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    shouldFlyTo,
    shouldShakeMarker,
    shouldFollowDevice,
    isFirstLocation,
    animationState,
    triggerFlyTo,
    triggerShake,
    enableFollowMode,
    disableFollowMode,
    resetAnimations,
    onAnimationComplete
  };
};

export default useMapAnimations;
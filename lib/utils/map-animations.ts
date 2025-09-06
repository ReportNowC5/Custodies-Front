"use client";

// Interfaz para coordenadas geográficas
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// Interfaz para opciones de animación
export interface AnimationOptions {
  duration?: number; // Duración en ms (default: 900)
  easing?: (t: number) => number; // Función de easing (default: linear)
  onUpdate?: (position: GeoCoordinates, progress: number) => void;
  onComplete?: () => void;
}

// Función de easing lineal por defecto
const linearEasing = (t: number): number => t;

// Función de easing suave (ease-out)
export const easeOutQuad = (t: number): number => t * (2 - t);

// Función de easing más suave (ease-in-out)
export const easeInOutCubic = (t: number): number => 
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// Clase para manejar animaciones de marcadores
export class MarkerAnimator {
  private animationId: number | null = null;
  private startTime: number | null = null;
  private isAnimating = false;

  /**
   * Anima suavemente el movimiento de un marcador entre dos posiciones
   */
  public smoothMove(
    startPosition: GeoCoordinates,
    endPosition: GeoCoordinates,
    options: AnimationOptions = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      // Cancelar animación previa si existe
      this.cancelAnimation();

      const {
        duration = 900,
        easing = linearEasing,
        onUpdate,
        onComplete
      } = options;

      // Si las posiciones son iguales, no animar
      if (this.arePositionsEqual(startPosition, endPosition)) {
        onComplete?.();
        resolve();
        return;
      }

      this.isAnimating = true;
      this.startTime = null;

      const animate = (currentTime: number) => {
        if (!this.startTime) {
          this.startTime = currentTime;
        }

        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        // Calcular posición interpolada
        const currentPosition = this.interpolatePosition(
          startPosition,
          endPosition,
          easedProgress
        );

        // Llamar callback de actualización
        onUpdate?.(currentPosition, progress);

        // Continuar animación o finalizar
        if (progress < 1 && this.isAnimating) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.animationId = null;
          onComplete?.();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Cancela la animación actual
   */
  public cancelAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
    this.startTime = null;
  }

  /**
   * Verifica si hay una animación en curso
   */
  public get isRunning(): boolean {
    return this.isAnimating;
  }

  /**
   * Interpola entre dos posiciones geográficas
   */
  private interpolatePosition(
    start: GeoCoordinates,
    end: GeoCoordinates,
    progress: number
  ): GeoCoordinates {
    return {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress
    };
  }

  /**
   * Verifica si dos posiciones son iguales (con tolerancia)
   */
  private arePositionsEqual(
    pos1: GeoCoordinates,
    pos2: GeoCoordinates,
    tolerance = 0.000001
  ): boolean {
    return (
      Math.abs(pos1.lat - pos2.lat) < tolerance &&
      Math.abs(pos1.lng - pos2.lng) < tolerance
    );
  }
}

// Clase para throttling de actualizaciones GPS
export class GPSThrottler {
  private lastUpdateTime = 0;
  private minInterval: number;

  constructor(minIntervalMs = 500) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Verifica si se debe procesar una nueva actualización GPS
   */
  public shouldUpdate(): boolean {
    const now = Date.now();
    if (now - this.lastUpdateTime >= this.minInterval) {
      this.lastUpdateTime = now;
      return true;
    }
    return false;
  }

  /**
   * Fuerza la próxima actualización
   */
  public forceNext(): void {
    this.lastUpdateTime = 0;
  }
}

// Utilidad para calcular velocidad entre dos puntos
export function calculateSpeed(
  pos1: GeoCoordinates & { timestamp: number },
  pos2: GeoCoordinates & { timestamp: number }
): number {
  const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000; // segundos
  if (timeDiff <= 0) return 0;

  const distance = calculateDistance(pos1, pos2);
  return distance / timeDiff; // metros por segundo
}

// Utilidad para calcular distancia entre dos puntos (fórmula de Haversine)
export function calculateDistance(
  pos1: GeoCoordinates,
  pos2: GeoCoordinates
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = toRadians(pos2.lat - pos1.lat);
  const dLng = toRadians(pos2.lng - pos1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(pos1.lat)) * Math.cos(toRadians(pos2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Utilidad para convertir grados a radianes
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Predictor de posición basado en velocidad y dirección
export class PositionPredictor {
  private lastPositions: Array<GeoCoordinates & { timestamp: number }> = [];
  private maxHistory = 3;

  /**
   * Añade una nueva posición al historial
   */
  public addPosition(position: GeoCoordinates & { timestamp: number }): void {
    this.lastPositions.push(position);
    if (this.lastPositions.length > this.maxHistory) {
      this.lastPositions.shift();
    }
  }

  /**
   * Predice la próxima posición basada en el historial
   */
  public predictNext(deltaTimeMs = 1000): GeoCoordinates | null {
    if (this.lastPositions.length < 2) return null;

    const recent = this.lastPositions[this.lastPositions.length - 1];
    const previous = this.lastPositions[this.lastPositions.length - 2];

    const speed = calculateSpeed(previous, recent);
    if (speed === 0) return recent;

    const timeDelta = deltaTimeMs / 1000; // convertir a segundos
    const distance = speed * timeDelta;

    // Calcular dirección
    const bearing = this.calculateBearing(previous, recent);
    
    // Predecir nueva posición
    return this.movePosition(recent, distance, bearing);
  }

  /**
   * Calcula el bearing entre dos puntos
   */
  private calculateBearing(start: GeoCoordinates, end: GeoCoordinates): number {
    const dLng = toRadians(end.lng - start.lng);
    const lat1 = toRadians(start.lat);
    const lat2 = toRadians(end.lat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return Math.atan2(y, x);
  }

  /**
   * Mueve una posición una distancia específica en una dirección
   */
  private movePosition(
    position: GeoCoordinates,
    distanceMeters: number,
    bearingRadians: number
  ): GeoCoordinates {
    const R = 6371000; // Radio de la Tierra en metros
    const lat1 = toRadians(position.lat);
    const lng1 = toRadians(position.lng);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearingRadians)
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(bearingRadians) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lat: lat2 * 180 / Math.PI,
      lng: lng2 * 180 / Math.PI
    };
  }

  /**
   * Limpia el historial de posiciones
   */
  public clear(): void {
    this.lastPositions = [];
  }
}
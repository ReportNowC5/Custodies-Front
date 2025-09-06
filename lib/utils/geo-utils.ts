// Define una interfaz para un punto geográfico con latitud y longitud.
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Convierte grados a radianes.
 * @param degrees El valor en grados.
 * @returns El valor en radianes.
 */
export function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convierte radianes a grados.
 * @param radians El valor en radianes.
 * @returns El valor en grados.
 */
export function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Calcula el rumbo (bearing) en grados entre dos puntos geográficos.
 * @param startPoint El punto de inicio.
 * @param endPoint El punto de destino.
 * @returns El rumbo en grados (0-360), donde 0 es Norte.
 */
export function calculateBearing(startPoint: GeoPoint, endPoint: GeoPoint): number {
  const lat1 = toRadians(startPoint.latitude);
  const lon1 = toRadians(startPoint.longitude);
  const lat2 = toRadians(endPoint.latitude);
  const lon2 = toRadians(endPoint.longitude);
  
  const dLon = lon2 - lon1;
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = toDegrees(Math.atan2(y, x));
  
  // Normaliza el rumbo para que siempre esté entre 0 y 360 grados.
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

/**
 * Normaliza un ángulo para que esté entre 0 y 360 grados.
 * @param angle El ángulo en grados.
 * @returns El ángulo normalizado.
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Convierte un rumbo en grados a una descripción textual de dirección.
 * @param bearing El rumbo en grados (0-360).
 * @returns La descripción textual de la dirección.
 */
export function bearingToDirection(bearing: number): string {
  const normalizedBearing = normalizeAngle(bearing);
  
  if (normalizedBearing >= 337.5 || normalizedBearing < 22.5) return 'Norte';
  if (normalizedBearing >= 22.5 && normalizedBearing < 67.5) return 'Noreste';
  if (normalizedBearing >= 67.5 && normalizedBearing < 112.5) return 'Este';
  if (normalizedBearing >= 112.5 && normalizedBearing < 157.5) return 'Sureste';
  if (normalizedBearing >= 157.5 && normalizedBearing < 202.5) return 'Sur';
  if (normalizedBearing >= 202.5 && normalizedBearing < 247.5) return 'Suroeste';
  if (normalizedBearing >= 247.5 && normalizedBearing < 292.5) return 'Oeste';
  if (normalizedBearing >= 292.5 && normalizedBearing < 337.5) return 'Noroeste';
  
  return 'Desconocido';
}
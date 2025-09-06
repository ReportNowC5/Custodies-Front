import { apiClient } from '@/lib/api-client';
import { DeviceHistoryLocation } from '@/lib/types/device';

// Tipos específicos para puntos GPS recientes
export interface RecentGPSPoint {
    id: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    course?: number;
    timestamp: string;
    receivedAt: string;
}

export interface RecentGPSResponse {
    success: boolean;
    data: RecentGPSPoint[];
    meta: {
        deviceId: string;
        totalPoints: number;
        dateRange: {
            from: string;
            to: string;
        };
    };
}

class GPSService {
    /**
     * Obtener los últimos 20 puntos GPS del día para un dispositivo
     * @param imei IMEI del dispositivo
     * @returns Promise con los puntos GPS recientes
     */
    async getRecentPoints(imei: string): Promise<RecentGPSPoint[]> {
        try {
            // Por ahora, usar el servicio de historial existente
            // En el futuro, esto podría ser un endpoint específico para puntos recientes
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

            const response = await apiClient.get<any>(
                `/api/devices/${imei}/history?from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}&limit=20`
            );

            const data = response?.result;

            // Transformar la respuesta al formato esperado
            const historyData = data;
            return historyData.map((point: any, index: number) => ({
                id: `${imei}-${point.ts || point.timestamp}-${index}`,
                deviceId: imei,
                latitude: point.lat || point.latitude,
                longitude: point.lng || point.longitude,
                speed: point.speed_kmh || point.speed,
                course: point.course,
                timestamp: point.ts || point.timestamp,
                receivedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error fetching recent GPS points:', error);
            return [];
        }
    }

    /**
     * Almacenar un nuevo punto GPS (para uso futuro con WebSocket)
     * @param point Punto GPS a almacenar
     * @returns Promise con el resultado
     */
    async storeGPSPoint(point: Omit<RecentGPSPoint, 'id' | 'receivedAt'>): Promise<boolean> {
        try {
            // Endpoint futuro para almacenar puntos GPS en tiempo real
            const response = await apiClient.post('/api/gps/store-point', {
                ...point,
                receivedAt: new Date().toISOString()
            });

            return response.success || false;
        } catch (error) {
            console.error('Error storing GPS point:', error);
            return false;
        }
    }
}

export const gpsService = new GPSService();
export default gpsService;
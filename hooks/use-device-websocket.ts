"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketState {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    lastUpdate: Date | null;
    gpsData: any | null;
}

interface UseDeviceWebSocketProps {
    imei?: string;
    enabled?: boolean;
}

const SOCKET_URL = 'ws://localhost:8081/gps';
// const SOCKET_URL = 'wss://suplentes7.incidentq.com/gps';
const MAX_RECONNECT_ATTEMPTS = 5;

export const useDeviceWebSocket = ({ imei, enabled = true }: UseDeviceWebSocketProps) => {
    const [state, setState] = useState<WebSocketState>({
        isConnected: false,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        gpsData: null,
    });

    const socketRef = useRef<Socket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateState = useCallback((updates: Partial<WebSocketState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const connect = useCallback(() => {
        if (!imei || !enabled || socketRef.current?.connected) {
            return;
        }

        updateState({ isConnecting: true, error: null });

        try {
            const socket = io(SOCKET_URL, {
                query: { deviceId: imei },
                transports: ['websocket', 'polling'],
                auth: undefined, // token ? { token } : undefined,
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
                reconnectionDelay: 1000,
            });

            socketRef.current = socket;

            // Evento de conexión exitosa
            socket.on('connect', () => {
                console.log('✅ Conectado al WebSocket GPS');
                console.log('🔗 Socket ID:', socket.id);
                reconnectAttemptsRef.current = 0;
                updateState({
                    isConnected: true,
                    isConnecting: false,
                    error: null
                });

                // Suscribirse al dispositivo específico
                socket.emit('join', { deviceId: imei });
                console.log(`📡 Emitiendo evento 'join' con deviceId: ${imei}`);

                // También intentar con diferentes formatos de join
                socket.emit('join', imei);
                console.log(`📡 Emitiendo evento 'join' solo con IMEI: ${imei}`);

                // Confirmar que el join fue enviado
                console.log(`✅ Join completado para el IMEI ${imei}`);
            });

            // Escuchar TODOS los eventos para debug
            socket.onAny((eventName, ...args) => {
                console.log('🎧 Evento recibido:', eventName, args);
            });

            // Evento de datos GPS recibidos (patrón original)
            socket.on('gps:packet', (data) => {
                console.log('📬 Datos GPS recibidos (gps:packet):', data);
                console.log('🎯 IMEI del dispositivo:', imei);
                console.log('📦 Tipo de paquete:', data.type || 'unknown');
                console.log('⏰ Timestamp:', new Date().toLocaleString());

                // Log detallado según el tipo de datos
                if (data.type === 'location' && data.data) {
                    console.log('📍 Coordenadas GPS:', {
                        lat: data.data.lat,
                        lng: data.data.lng,
                        velocidad: data.data.velocidad,
                        rumbo: data.data.rumbo,
                        satellites: data.data.satellites
                    });
                } else if (data.type === 'lbs' && data.data) {
                    console.log('📡 Datos LBS:', {
                        mcc: data.data.mcc,
                        mnc: data.data.mnc,
                        lac: data.data.lac,
                        cellId: data.data.cellId
                    });
                } else if (data.type === 'status' && data.data) {
                    console.log('🔋 Estado del dispositivo:', {
                        voltaje: data.data.voltaje,
                        gsm: data.data.gsm,
                        alarma: data.data.alarma
                    });
                }

                console.log('📄 Datos completos:', JSON.stringify(data, null, 2));
                console.log('─'.repeat(50));

                updateState({
                    gpsData: data,
                    lastUpdate: new Date()
                });
            });

            // Escuchar evento específico del dispositivo (como en tu HTML)
            socket.on(`gps:packet:${imei}`, (data) => {
                console.log(`📬 Datos GPS específicos para ${imei}:`, data);
                updateState({
                    gpsData: data,
                    lastUpdate: new Date()
                });
            });

            // Evento de desconexión
            socket.on('disconnect', (reason) => {
                console.log('❌ Desconectado del WebSocket:', reason);
                updateState({
                    isConnected: false,
                    isConnecting: false
                });
            });

            // Evento de error de conexión
            socket.on('connect_error', (err) => {
                console.error('🚫 Error de conexión WebSocket:', err.message);
                updateState({
                    isConnected: false,
                    isConnecting: false,
                    error: `Error de conexión: ${err.message}`
                });
            });

            // Manejo de intentos de reconexión
            socket.io.on('reconnect_attempt', (attemptNumber) => {
                reconnectAttemptsRef.current = attemptNumber;
                console.log(`🔁 Intentando reconectar... intento #${attemptNumber}`);
                updateState({ isConnecting: true });

                if (attemptNumber > MAX_RECONNECT_ATTEMPTS) {
                    console.error('❌ Demasiados intentos de reconexión. Abortando.');
                    socket.disconnect();
                    updateState({
                        isConnecting: false,
                        error: 'No se pudo establecer conexión después de varios intentos'
                    });
                }
            });

            // Reconexión exitosa
            socket.io.on('reconnect', (attemptNumber) => {
                console.log(`✅ Reconectado exitosamente después de ${attemptNumber} intentos`);
                reconnectAttemptsRef.current = 0;
            });

        } catch (error) {
            console.error('Error al crear conexión WebSocket:', error);
            updateState({
                isConnecting: false,
                error: 'Error al inicializar conexión WebSocket'
            });
        }
    }, [imei, enabled, updateState]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('🔌 Desconectando WebSocket...');
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        updateState({
            isConnected: false,
            isConnecting: false,
            error: null
        });
    }, [updateState]);

    // Efecto para manejar conexión/desconexión
    useEffect(() => {
        if (imei && enabled) {
            // Pequeño delay para evitar conexiones múltiples rápidas
            timeoutRef.current = setTimeout(() => {
                connect();
            }, 100);
        } else {
            disconnect();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [imei, enabled, connect, disconnect]);

    // Cleanup al desmontar el componente
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        reconnectAttempts: reconnectAttemptsRef.current,
    };
};
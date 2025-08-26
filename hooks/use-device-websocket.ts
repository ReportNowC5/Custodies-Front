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

const SOCKET_URL = 'https://suplentes7.incidentq.com/gps';
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
        transports: ['websocket'],
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
        reconnectAttemptsRef.current = 0;
        updateState({ 
          isConnected: true, 
          isConnecting: false, 
          error: null 
        });
        
        // Suscribirse al dispositivo específico
        socket.emit('join', { deviceId: imei });
        console.log(`📡 Subscrito a notificaciones para el IMEI ${imei}`);
      });

      // Evento de datos GPS recibidos
      socket.on('gps:packet', (data) => {
        console.log('📬 Datos GPS recibidos:', data);
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
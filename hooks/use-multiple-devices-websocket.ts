"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface DeviceConnectionState {
    imei: string;
    isConnected: boolean;
    connectionStatus: 'connected' | 'disconnected' | 'unknown';
    lastConnection: Date | null;
    lastActivity: Date | null;
    gpsData: any | null;
    connectionAttempts: number;
    maxAttemptsReached: boolean;
}

interface MultipleDevicesWebSocketState {
    isSocketConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    lastUpdate: Date | null;
    devices: Map<string, DeviceConnectionState>;
}

interface UseMultipleDevicesWebSocketProps {
    imeis: string[];
    enabled?: boolean;
}

// URLs de WebSocket con fallback
const PRIMARY_SOCKET_URL = 'wss://gps.dxplus.org/gps';
const FALLBACK_SOCKET_URL = 'ws://localhost:8081/gps'; // Fallback local
const MAX_RECONNECT_ATTEMPTS = 10; // Límite de 10 intentos como solicita el usuario
const CONNECTION_TIMEOUT = 5000; // Aumentado a 5s para conexiones más estables
const RECONNECT_DELAY = 1000; // Aumentado a 1s para evitar spam de reconexión

export const useMultipleDevicesWebSocket = ({ imeis, enabled = true }: UseMultipleDevicesWebSocketProps) => {
    const [state, setState] = useState<MultipleDevicesWebSocketState>({
        isSocketConnected: false,
        isConnecting: false,
        error: null,
        lastUpdate: null,
        devices: new Map(),
    });

    const socketRef = useRef<Socket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const stateRef = useRef(state);

    // Actualizar ref cuando cambie el estado
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const updateState = useCallback((updates: Partial<MultipleDevicesWebSocketState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const updateDeviceState = useCallback((imei: string, deviceUpdates: Partial<DeviceConnectionState>) => {
        setState(prev => {
            const newDevices = new Map(prev.devices);
            const currentDevice = newDevices.get(imei) || {
                imei,
                isConnected: false,
                connectionStatus: 'unknown',
                lastConnection: null,
                lastActivity: null,
                gpsData: null,
                connectionAttempts: 0,
                maxAttemptsReached: false,
            };
            
            newDevices.set(imei, { ...currentDevice, ...deviceUpdates });
            
            return {
                ...prev,
                devices: newDevices,
                lastUpdate: new Date(),
            };
        });
    }, []);

    // Función para obtener el estado de un dispositivo específico
    const getDeviceState = useCallback((imei: string): DeviceConnectionState | null => {
        return state.devices.get(imei) || null;
    }, [state.devices]);

    // Función para verificar si un dispositivo está conectado
    const isDeviceConnected = useCallback((imei: string): boolean => {
        const device = state.devices.get(imei);
        return device?.connectionStatus === 'connected' || false;
    }, [state.devices]);

    // Función para obtener todos los estados de dispositivos
    const getAllDevicesStates = useCallback((): DeviceConnectionState[] => {
        return Array.from(state.devices.values());
    }, [state.devices]);

    // Función para verificar si un dispositivo ha alcanzado el máximo de intentos
    const hasReachedMaxAttempts = useCallback((imei: string): boolean => {
        const device = state.devices.get(imei);
        return device?.maxAttemptsReached || false;
    }, [state.devices]);

    const connect = useCallback((useFallback = false) => {
        if (!enabled || imeis.length === 0 || socketRef.current?.connected) {
            return;
        }

        // Verificar si todos los dispositivos han alcanzado el máximo de intentos
        const activeImeis = imeis.filter(imei => {
            const device = stateRef.current.devices.get(imei);
            return !device?.maxAttemptsReached;
        });

        if (activeImeis.length === 0) {
            console.log('❌ Todos los dispositivos han alcanzado el máximo de intentos. No se intentará reconectar.');
            return;
        }

        updateState({ isConnecting: true, error: null });

        const socketUrl = useFallback ? FALLBACK_SOCKET_URL : PRIMARY_SOCKET_URL;

        try {
            const socket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                timeout: CONNECTION_TIMEOUT,
                reconnection: true,
                reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
                reconnectionDelay: RECONNECT_DELAY,
                reconnectionDelayMax: 5000, // Máximo 5s entre intentos
                randomizationFactor: 0.3, // Más aleatoriedad para evitar colisiones
                forceNew: false, // Reutilizar conexiones existentes
            });

            socketRef.current = socket;

            // Evento de conexión exitosa
            socket.on('connect', () => {
                reconnectAttemptsRef.current = 0;
                updateState({
                    isSocketConnected: true,
                    isConnecting: false,
                    error: null
                });

                // Suscribirse a todos los dispositivos
                imeis.forEach(imei => {
                    if (imei) {
                        socket.emit('join', { deviceId: imei });
                        socket.emit('join', imei);
                    }
                });

                // Solicitar estado inicial de todos los dispositivos
                socket.emit('get_devices_status', { deviceIds: imeis });
            });

            // Escuchar eventos de estado de múltiples dispositivos
            socket.on('devices_status', (data) => {
                console.log('📊 Estado de múltiples dispositivos recibido:', data);
                if (data && Array.isArray(data.devices)) {
                    data.devices.forEach((deviceInfo: any) => {
                        if (deviceInfo.imei) {
                            updateDeviceState(deviceInfo.imei, {
                                connectionStatus: deviceInfo.status === 'connected' ? 'connected' : 'disconnected',
                                isConnected: deviceInfo.status === 'connected',
                                lastConnection: deviceInfo.lastConnection ? new Date(deviceInfo.lastConnection) : null,
                                lastActivity: deviceInfo.lastActivity ? new Date(deviceInfo.lastActivity) : null,
                            });
                        }
                    });
                }
            });

            // Escuchar eventos generales de GPS
            socket.on('gps:packet', (data) => {
                if (data && data.deviceId && imeis.includes(data.deviceId)) {
                    console.log(`📬 Datos GPS para dispositivo ${data.deviceId}:`, data);
                    
                    // Procesar campo 'rumbo' y mapear a 'course' para compatibilidad
                    let processedData = data;
                    if (data.data && data.data.rumbo !== undefined) {
                        processedData = {
                            ...data,
                            data: {
                                ...data.data,
                                course: data.data.rumbo
                            }
                        };
                    }

                    const updates: Partial<DeviceConnectionState> = {
                        gpsData: processedData,
                        lastActivity: new Date()
                    };

                    // Procesar eventos de conexión/desconexión
                    if (processedData.type === 'connection' || processedData.type === 'login' || processedData.type === 'reconnection') {
                        updates.connectionStatus = 'connected';
                        updates.isConnected = true;
                        updates.lastConnection = new Date();
                    } else if (processedData.type === 'disconnection') {
                        updates.connectionStatus = 'disconnected';
                        updates.isConnected = false;
                    } else if (processedData.status === 'connected') {
                        updates.connectionStatus = 'connected';
                        updates.isConnected = true;
                    } else if (processedData.status === 'disconnected') {
                        updates.connectionStatus = 'disconnected';
                        updates.isConnected = false;
                    } else if (processedData.type === 'location' || processedData.type === 'status' || data.latitude || data.lat) {
                        // Si recibimos datos GPS válidos, asumimos que está conectado
                        const currentDevice = stateRef.current.devices.get(data.deviceId);
                        if (!currentDevice || currentDevice.connectionStatus === 'unknown') {
                            updates.connectionStatus = 'connected';
                            updates.isConnected = true;
                        }
                    }

                    updateDeviceState(data.deviceId, updates);
                }
            });

            // Escuchar eventos específicos por dispositivo
            imeis.forEach(imei => {
                if (imei) {
                    socket.on(`gps:packet:${imei}`, (data) => {
                        console.log(`📬 Datos GPS específicos para ${imei}:`, data);
                        
                        // Procesar campo 'rumbo' y mapear a 'course'
                        let processedData = data;
                        if (data && data.data && data.data.rumbo !== undefined) {
                            processedData = {
                                ...data,
                                data: {
                                    ...data.data,
                                    course: data.data.rumbo
                                }
                            };
                        }

                        const updates: Partial<DeviceConnectionState> = {
                            gpsData: processedData,
                            lastActivity: new Date()
                        };

                        // Procesar eventos de conexión/desconexión
                        if (processedData.type === 'connection' || processedData.type === 'login' || processedData.type === 'reconnection') {
                            updates.connectionStatus = 'connected';
                            updates.isConnected = true;
                            updates.lastConnection = new Date();
                        } else if (processedData.type === 'disconnection') {
                            updates.connectionStatus = 'disconnected';
                            updates.isConnected = false;
                        } else if (processedData.status === 'connected') {
                            updates.connectionStatus = 'connected';
                            updates.isConnected = true;
                        } else if (processedData.status === 'disconnected') {
                            updates.connectionStatus = 'disconnected';
                            updates.isConnected = false;
                        } else if (processedData.type === 'location' || processedData.type === 'status' || data.latitude || data.lat) {
                            // Si recibimos datos GPS válidos, asumimos que está conectado
                            const currentDevice = stateRef.current.devices.get(imei);
                            if (!currentDevice || currentDevice.connectionStatus === 'unknown') {
                                updates.connectionStatus = 'connected';
                                updates.isConnected = true;
                            }
                        }

                        updateDeviceState(imei, updates);
                    });

                    // Escuchar eventos de desconexión específicos
                    socket.on(`disconnected:${imei}`, (data) => {
                        console.log(`🔌 Dispositivo ${imei} desconectado:`, data);
                        updateDeviceState(imei, {
                            connectionStatus: 'disconnected',
                            isConnected: false,
                            lastActivity: new Date()
                        });
                    });
                }
            });

            // Evento de desconexión del socket
            socket.on('disconnect', (reason) => {
                console.log('❌ Desconectado del WebSocket:', reason);
                updateState({
                    isSocketConnected: false,
                    isConnecting: false
                });
            });

            // Evento de error de conexión con fallback
            socket.on('connect_error', (err) => {
                console.error('🚫 Error de conexión WebSocket:', err.message);
                
                // Si estamos usando la URL principal y falla, intentar con fallback
                if (!useFallback && reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS - 2) {
                    console.log('🔄 Intentando con URL de fallback...');
                    socket.disconnect();
                    setTimeout(() => connect(true), 2000);
                    return;
                }
                
                updateState({
                    isSocketConnected: false,
                    isConnecting: false,
                    error: `Error de conexión: ${err.message}${useFallback ? ' (fallback)' : ''}`
                });
            });

            // Manejo de intentos de reconexión
            socket.io.on('reconnect_attempt', (attemptNumber) => {
                reconnectAttemptsRef.current = attemptNumber;
                console.log(`🔁 Intentando reconectar... intento #${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
                updateState({
                    isConnecting: true,
                    error: `Reconectando... intento ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`
                });

                if (attemptNumber >= MAX_RECONNECT_ATTEMPTS) {
                    console.error('❌ Máximo de 10 intentos alcanzado. Deteniendo reconexión.');
                    socket.disconnect();
                    
                    // Marcar todos los dispositivos como que alcanzaron el máximo de intentos
                    imeis.forEach(imei => {
                        if (imei) {
                            updateDeviceState(imei, {
                                connectionAttempts: MAX_RECONNECT_ATTEMPTS,
                                maxAttemptsReached: true,
                                connectionStatus: 'disconnected',
                                isConnected: false
                            });
                        }
                    });
                    
                    updateState({
                        isConnecting: false,
                        error: 'No se pudo establecer conexión después de 10 intentos. Dispositivos deshabilitados.'
                    });
                }
            });

            // Reconexión exitosa
            socket.io.on('reconnect', (attemptNumber) => {
                console.log(`✅ Reconectado exitosamente después de ${attemptNumber} intentos`);
                reconnectAttemptsRef.current = 0;
                
                // Re-suscribirse a todos los dispositivos después de reconectar
                imeis.forEach(imei => {
                    if (imei) {
                        socket.emit('join', { deviceId: imei });
                        socket.emit('join', imei);
                    }
                });
                
                // Solicitar estado actualizado
                socket.emit('get_devices_status', { deviceIds: imeis });
            });

        } catch (error) {
            console.error('Error al crear conexión WebSocket:', error);
            updateState({
                isConnecting: false,
                error: 'Error al inicializar conexión WebSocket'
            });
        }
    }, [imeis, enabled, updateState, updateDeviceState]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.log('🔌 Desconectando WebSocket múltiple...');
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        updateState({
            isSocketConnected: false,
            isConnecting: false,
            error: null,
            devices: new Map(),
        });
    }, [updateState]);

    // Efecto para manejar conexión/desconexión
    useEffect(() => {
        if (imeis.length > 0 && enabled) {
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
    }, [imeis, enabled, connect, disconnect]);

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
        getDeviceState,
        isDeviceConnected,
        getAllDevicesStates,
        hasReachedMaxAttempts,
        reconnectAttempts: reconnectAttemptsRef.current,
    };
};
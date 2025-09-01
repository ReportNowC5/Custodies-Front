import { useEffect, useState } from 'react';

export interface DeviceConnection {
    imei: string;
    modelo: string;
    status: 'connected' | 'disconnected';
    connectedAt?: string;
    lastActivity?: string;
    disconnectedAt?: string;
    disconnectionReason?: string;
    addr?: string;
}

export interface DevicesConnectionsData {
    total: number;
    connected: number;
    disconnected: number;
    devices: DeviceConnection[];
}

export function useDevicesConnections(apiUrl = 'http://localhost:8081/tcp/api/connections', refreshMs?: number, refreshKey?: number) {
    const [data, setData] = useState<DevicesConnectionsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error('Error al obtener conexiones');
                const json = await res.json();
                if (isMounted) {
                    setData(json);
                    setError(null);
                }
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [apiUrl, refreshKey]);

    return { data, loading, error };
}


import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Props {
  imei: string;
}

const SOCKET_URL = 'wss://suplentes7.incidentq.com'; // socket raíz, igual que dashboard

export default function DevicesConnectionsStatus(props: Props) {
  const imei = props.imei;
  const [deviceStatus, setDeviceStatus] = useState<{ status: 'connected' | 'disconnected'; reason?: string } | null>(null);
  const [initialStatus, setInitialStatus] = useState<{ status: 'connected' | 'disconnected'; reason?: string } | null>(null);
  const [lastPacket, setLastPacket] = useState<any>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Fetch inicial al montar para obtener el estado actual
  useEffect(() => {
    fetch('http://localhost:8081/tcp/api/connections')
      .then(res => res.json())
      .then(data => {
        const device = data.devices?.find((d: any) => d.imei === imei);
        if (device) {
          setDeviceStatus({ status: device.status, reason: device.disconnectionReason });
          setInitialStatus({ status: device.status, reason: device.disconnectionReason });
        }
      })
      .catch(() => {});
  }, [imei]);

  useEffect(() => {
    let socket: Socket | null = null;
    let isUnmounted = false;
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    // Escuchar evento global 'packet'
    socket.on('packet', (packet: any) => {
      if (isUnmounted) return;
      const pkt = Array.isArray(packet) ? packet[0] : packet;
      if (pkt.imei !== imei && pkt.deviceId !== imei) return;
      setLastPacket(pkt);
      let updated = false;
      if (pkt.type === 'connection' || pkt.type === 'reconnection' || pkt.type === 'login') {
        setDeviceStatus({ status: 'connected' });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.type === 'disconnection') {
        setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.status === 'connected') {
        setDeviceStatus({ status: 'connected' });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.status === 'disconnected') {
        setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      // Si no se actualizó por evento, mantener el estado inicial
      if (!updated && initialStatus) {
        setDeviceStatus(initialStatus);
      }
    });

    socket.on(`gps:packet:${imei}`, (packet: any) => {
      if (isUnmounted) return;
      const pkt = Array.isArray(packet) ? packet[0] : packet;
      setLastPacket(pkt);
      let updated = false;
      if (pkt.type === 'connection' || pkt.type === 'reconnection' || pkt.type === 'login') {
        setDeviceStatus({ status: 'connected' });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.type === 'disconnection') {
        setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.status === 'connected') {
        setDeviceStatus({ status: 'connected' });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      if (pkt.status === 'disconnected') {
        setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
        setUpdateCount(c => c + 1);
        updated = true;
      }
      // Si no se actualizó por evento, mantener el estado inicial
      if (!updated && initialStatus) {
        setDeviceStatus(initialStatus);
      }
    });

    return () => {
      isUnmounted = true;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [imei, initialStatus]);

  if (!deviceStatus) return <span className="ml-4 text-xs text-muted-foreground">Sin estado de conexión</span>;

  return (
    <div>
      <span className={`ml-4 px-2 py-1 rounded text-xs font-semibold ${deviceStatus.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
        key={updateCount}
      >
        {deviceStatus.status === 'connected' ? '🟢 Conectado' : '🔴 Desconectado'}
        {deviceStatus.status === 'disconnected' && deviceStatus.reason ? ` (${deviceStatus.reason})` : ''}
        {/* Log visual del último paquete recibido */}
        {lastPacket && (
          <span className="ml-2 text-[10px] text-muted-foreground" style={{ maxWidth: 300, overflow: 'auto' }}>
            Último evento: <code>{JSON.stringify(lastPacket)}</code>
          </span>
        )}
      </span>
      {/* Log visual grande para depuración */}
      <div style={{marginTop: 8, fontSize: 14, color: '#333', background: '#f8f8f8', padding: 8, borderRadius: 6}}>
        <strong>Estado actual:</strong> {JSON.stringify(deviceStatus)}<br/>
        <strong>UpdateCount:</strong> {updateCount}<br/>
        <strong>IMEI:</strong> {imei}
      </div>
    </div>
  );
}

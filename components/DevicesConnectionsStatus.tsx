
import React, { useEffect, useState } from 'react';
import { useDeviceWebSocket } from '@/hooks/use-device-websocket';

interface Props {
  imei: string;
}

export default function DevicesConnectionsStatus(props: Props) {
  const imei = props.imei;
  const [deviceStatus, setDeviceStatus] = useState<{ status: 'connected' | 'disconnected'; reason?: string } | null>(null);
  const [initialStatus, setInitialStatus] = useState<{ status: 'connected' | 'disconnected'; reason?: string } | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Usar el hook de WebSocket existente con los nuevos campos de conexión real
  const { 
    gpsData, 
    deviceConnectionStatus, 
    deviceLastConnection, 
    deviceLastActivity 
  } = useDeviceWebSocket({
    imei,
    enabled: true
  });

  // Fetch inicial al montar para obtener el estado actual
  useEffect(() => {
    fetch('https://suplentes7.incidentq.com/tcp/api/connections')
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

  // Actualizar estado basado en la conexión real del dispositivo GPS
  useEffect(() => {
    if (deviceConnectionStatus !== 'unknown') {
      const newStatus = deviceConnectionStatus === 'connected' ? 'connected' : 'disconnected';
      console.log(`🎯 DevicesConnectionsStatus actualizando desde hook: ${newStatus}`);
      setDeviceStatus({ status: newStatus });
      setUpdateCount(c => c + 1);
    }
  }, [deviceConnectionStatus]);

  // Procesar datos del WebSocket como respaldo (solo si no tenemos estado del dispositivo)
  useEffect(() => {
    if (!gpsData || deviceConnectionStatus !== 'unknown') return;
    
    const pkt = Array.isArray(gpsData) ? gpsData[0] : gpsData;
    console.log(`🎯 DevicesConnectionsStatus procesando gpsData como respaldo:`, pkt);
    
    let updated = false;
    if (pkt.type === 'connection' || pkt.type === 'reconnection' || pkt.type === 'login') {
      console.log(`✅ Actualizando a conectado por type: ${pkt.type}`);
      setDeviceStatus({ status: 'connected' });
      setUpdateCount(c => c + 1);
      updated = true;
    }
    if (pkt.type === 'disconnection') {
      console.log(`❌ Actualizando a desconectado por type: ${pkt.type}`);
      setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
      setUpdateCount(c => c + 1);
      updated = true;
    }
    if (pkt.status === 'connected') {
      console.log(`✅ Actualizando a conectado por status: ${pkt.status}`);
      setDeviceStatus({ status: 'connected' });
      setUpdateCount(c => c + 1);
      updated = true;
    }
    if (pkt.status === 'disconnected') {
      console.log(`❌ Actualizando a desconectado por status: ${pkt.status}`);
      setDeviceStatus({ status: 'disconnected', reason: pkt.reason });
      setUpdateCount(c => c + 1);
      updated = true;
    }
    if (!updated) {
      console.log(`⚠️ Evento no procesado:`, pkt);
    }
  }, [gpsData, deviceConnectionStatus]);

  if (!deviceStatus) return <span className="ml-4 text-xs text-muted-foreground">Sin estado de conexión</span>;

  return (
    <div className="ml-4 text-left" key={updateCount}>
      <span className={`px-2 py-1 rounded text-xs font-semibold ${deviceStatus.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
        {deviceStatus.status === 'connected' ? 'Conectado' : 'Desconectado'}
      </span>
      {/* {deviceStatus.status === 'disconnected' && deviceStatus.reason && (
        <div className="text-xs text-muted-foreground mt-1">{deviceStatus.reason}</div>
      )} */}
    </div>
  );
}

"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeviceResponse } from '@/lib/types/device';
import { 
  Smartphone, 
  Hash, 
  Calendar, 
  Activity, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Building,
  CreditCard
} from 'lucide-react';

interface DeviceInfoProps {
  device: DeviceResponse;
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Inactivo';
    default:
      return status;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'INACTIVE':
      return 'secondary';
    default:
      return 'outline';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const DeviceInfo: React.FC<DeviceInfoProps> = ({ device }) => {
  return (
    <div className="space-y-6">
      {/* Información básica del dispositivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Información del Dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="h-4 w-4" />
                <span>ID:</span>
              </div>
              <div className="font-medium">#{device.id}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Estado:</span>
              </div>
              <Badge variant={getStatusBadgeVariant(device.status) as "outline" | "soft"}>
                {getStatusLabel(device.status)}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4" />
                <span>Marca:</span>
              </div>
              <div className="font-medium">{device.brand}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4" />
                <span>Modelo:</span>
              </div>
              <div className="font-medium">{device.model}</div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="h-4 w-4" />
                <span>IMEI:</span>
              </div>
              <div className="font-mono text-sm bg-gray-50 p-2 rounded">{device.imei}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Nombre:</span>
              </div>
              <div className="font-medium">{device.client.user.name}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>Email:</span>
              </div>
              <div className="font-medium">{device.client.user.email}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>Teléfono:</span>
              </div>
              <div className="font-medium">{device.client.user.phone}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CreditCard className="h-4 w-4" />
                <span>RFC:</span>
              </div>
              <div className="font-medium">{device.client.rfc}</div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Dirección:</span>
              </div>
              <div className="font-medium">
                {device.client.address}, {device.client.interiorNumber && `Int. ${device.client.interiorNumber}, `}
                {device.client.colony}, {device.client.city}, {device.client.state} - {device.client.postalCode}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Fecha de creación:</span>
              </div>
              <div className="font-medium">{formatDate(device.createdAt)}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Última actualización:</span>
              </div>
              <div className="font-medium">{formatDate(device.updatedAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
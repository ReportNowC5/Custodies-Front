"use client";
import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CrudTable } from '@/components/crud/crud-table';
import { CrudFormDialog, FormField } from '@/components/crud/crud-form-dialog';
import { DeleteConfirmationDialog } from '@/components/crud/delete-confirmation-dialog';
import { useCrudActions } from '@/hooks/use-crud-actions';
import { devicesService } from '@/lib/services/devices.service';
import { customersService } from '@/lib/services/customers.service';
import { DeviceResponse, CreateDeviceRequest, UpdateDeviceRequest, DeviceClient } from '@/lib/types/device';
import { Customer } from '@/lib/types/customer';
import { MoreHorizontal, Edit, Trash2, Smartphone, Tag, Hash, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

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

export const DevicesPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    
    // Usar los tipos específicos para dispositivos
    const crudActions = useCrudActions<DeviceResponse, CreateDeviceRequest, UpdateDeviceRequest>(devicesService);

    // Cargar clientes al montar el componente
    useEffect(() => {
        const loadCustomers = async () => {
            try {
                setLoadingCustomers(true);
                const response = await customersService.getCustomers();
                setCustomers(response.customers || []);
            } catch (error) {
                console.error('Error cargando clientes:', error);
            } finally {
                setLoadingCustomers(false);
            }
        };
        
        loadCustomers();
        crudActions.loadData();
    }, []);

    const getClientInfo = (client: DeviceClient | null | undefined) => {
        if (!client || !client.user) {
            return 'Sin cliente asignado';
        }
        return `${client.user.name} (${client.user.email})`;
    };
    
    // Configuración de campos del formulario
    const formFields: FormField[] = [
        {
            name: 'brand',
            label: 'Marca',
            type: 'text',
            placeholder: 'Ej: Teltonika, CalAmp, etc.',
            required: true,
            icon: <Tag />,
        },
        {
            name: 'model',
            label: 'Modelo',
            type: 'text',
            placeholder: 'Ej: FMB920, LMU-2630, etc.',
            required: true,
            icon: <Smartphone />,
        },
        {
            name: 'celular',
            label: 'Celular',
            type: 'text',
            placeholder: 'Ej: +52 55 1234 5678',
            required: true,
            icon: <Smartphone />,
            validation: z.string()
                .min(1, 'Celular es requerido')
                .max(20, 'El celular no puede exceder 20 caracteres'),
        },
        {
            name: 'status',
            label: 'Estado',
            type: 'select',
            options: [
                { value: 'ACTIVE', label: 'Activo' },
                { value: 'INACTIVE', label: 'Inactivo' },
            ],
            placeholder: 'Seleccionar estado...',
            required: true,
            icon: <Activity />,
        },
        {
            name: 'clientId',
            label: 'Cliente',
            type: 'select',
            options: customers.map(customer => ({
                value: customer.id,
                label: `${customer.name} (${customer.email})`
            })),
            placeholder: loadingCustomers ? 'Cargando clientes...' : 'Seleccionar cliente...',
            required: !crudActions.selectedItem,
            icon: <Users />,
            disabled: loadingCustomers,
            getValue: (item: DeviceResponse) => item.client?.id?.toString() || '',
        },
        // Solo incluir IMEI al crear dispositivo
        ...(!crudActions.selectedItem ? [
            {
                name: 'imei',
                label: 'IMEI',
                type: 'text' as const,
                placeholder: 'Ej: 358741258963214',
                required: true,
                icon: <Hash />,
                validation: z.string()
                    .min(1, 'IMEI es requerido')
                    .max(20, 'El IMEI no puede exceder 20 caracteres')
                    .regex(/^[0-9]+$/, 'El IMEI solo puede contener números'),
            },
        ] : []),
    ];

    const handleFormSubmit = async (data: any) => {
        if (crudActions.selectedItem) {
            const updateData: UpdateDeviceRequest = {
                ...data,
                clientId: parseInt(data.clientId),
            };
            await crudActions.handleUpdate(updateData);
        } else {
            const createData: CreateDeviceRequest = {
                ...data,
                clientId: parseInt(data.clientId)
            };
            await crudActions.handleCreate(createData);
        }
    };

    // En la definición de columnas, agregar una columna de acciones:
    const columns: ColumnDef<DeviceResponse>[] = [
        {
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue('id')}</div>
            ),
        },
        {
            accessorKey: 'brand',
            header: 'Marca',
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue('brand')}</div>
            ),
        },
        {
            accessorKey: 'model',
            header: 'Modelo',
            cell: ({ row }) => (
                <div>{row.getValue('model')}</div>
            ),
        },
        {
            accessorKey: 'imei',
            header: 'IMEI',
            cell: ({ row }) => (
                <div className="font-mono text-sm">{row.getValue('imei')}</div>
            ),
        },
        {
            accessorKey: 'celular',
            header: 'Celular',
            cell: ({ row }) => (
                <div className="font-mono text-sm">{row.getValue('celular')}</div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return (
                    <Badge variant={getStatusBadgeVariant(status) as "outline" | "soft"}>
                        {getStatusLabel(status)}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'client',
            header: 'Cliente',
            cell: ({ row }) => {
                const client = row.getValue('client') as DeviceClient;
                return (
                    <div className="font-medium">
                        {getClientInfo(client)}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const device = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4 mr-1" />
                                Acciones
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <Link href={`/devices/${device.id}`}>
                                    <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-1" />
                                        Ver detalle
                                    </Button>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Eliminar
                                </Button>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 font-sans">
            <CrudTable
                data={crudActions.data || []}
                columns={columns}
                title="Gestión de Dispositivos"
                searchPlaceholder="Buscar dispositivos..."
                //searchKey="brand"
                onAdd={crudActions.openCreateForm}
                addButtonText="Agregar Dispositivo"
                isLoading={crudActions.isLoading}
            />

            <CrudFormDialog
                open={crudActions.isFormOpen}
                onClose={crudActions.closeForm}
                title={crudActions.selectedItem ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                fields={formFields}
                onSubmit={handleFormSubmit}
                initialData={crudActions.selectedItem}
                isLoading={crudActions.isLoading}
                submitButtonText={crudActions.selectedItem ? 'Actualizar Dispositivo' : 'Crear Dispositivo'}
            />

            <DeleteConfirmationDialog
                open={crudActions.isDeleteDialogOpen}
                onClose={crudActions.closeDeleteDialog}
                onConfirm={crudActions.handleDelete}
                title="Eliminar Dispositivo"
                description={`¿Estás seguro de que deseas eliminar el dispositivo ${crudActions.selectedItem?.brand} ${crudActions.selectedItem?.model}? Esta acción no se puede deshacer.`}
                isLoading={crudActions.isLoading}
            />
        </div>
    );
};

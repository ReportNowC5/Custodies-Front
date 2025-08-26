"use client";
import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { assetsService } from '@/lib/services/assets.service';
import { AssetResponse, CreateAssetRequest, UpdateAssetRequest, AssetType } from '@/lib/types/asset';
import { MoreHorizontal, Edit, Trash2, Tag } from 'lucide-react';

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return 'Active';
        case 'INACTIVE':
            return 'Inactive';
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

export const AssetsPage: React.FC = () => {
    const crudActions = useCrudActions<AssetResponse, CreateAssetRequest, UpdateAssetRequest>(assetsService);

    useEffect(() => {
        crudActions.loadData();
    }, []);

    const [deviceOptions, setDeviceOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        // Cargar lista de dispositivos desde la API para el select
        const loadDevices = async () => {
            try {
                const res = await fetch('/api/admin/devices');
                if (!res.ok) return;
                const data = await res.json();
                const opts = (data || []).map((d: any) => ({
                    value: String(d.id),
                    label: d.identifier || d.name || `Device ${d.id}`,
                }));
                setDeviceOptions(opts);
            } catch (e) {
                // No bloquear la UI si falla la carga
                console.error('Error cargando dispositivos:', e);
            }
        };

        loadDevices();
    }, []);

    const formFields: FormField[] = [
        {
            name: 'name',
            label: 'Name',
            type: 'text',
            placeholder: 'Eg: Truck #12',
            required: true,
            icon: <Tag />,
        },
        {
            name: 'assetType',
            label: 'Asset Type',
            type: 'select',
            options: [
                { value: 'HEAVY_LOAD', label: 'Heavy Load' },
                { value: 'LIGHT_LOAD', label: 'Light Load' },
                { value: 'MEDIUM_LOAD', label: 'Medium Load' },
                { value: 'PASSENGER', label: 'Passenger' },
                { value: 'CARGO', label: 'Cargo' },
                { value: 'OTHER', label: 'Other' },
            ],
            placeholder: 'Select asset type...',
            required: true,
            icon: <Tag />,
        },
        {
            name: 'identifier',
            label: 'Identifier',
            type: 'text',
            placeholder: 'Eg: ABC-1234',
            required: true,
            icon: <Tag />,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
            ],
            placeholder: 'Select status...',
            required: true,
            icon: <Tag />,
        },
        {
            name: 'deviceId',
            label: 'Dispositivo',
            type: 'select',
            options: deviceOptions,
            placeholder: 'Seleccione un dispositivo (opcional)',
            required: false,
            icon: <Tag />,
        },
    ];

    const handleFormSubmit = async (data: any) => {
        if (crudActions.selectedItem) {
            const updateData: UpdateAssetRequest = {
                ...data,
                deviceId: data.deviceId ? parseInt(data.deviceId) : undefined,
            };
            await crudActions.handleUpdate(updateData);
        } else {
            const createData: CreateAssetRequest = {
                ...data,
                deviceId: data.deviceId ? parseInt(data.deviceId) : undefined,
            };
            await crudActions.handleCreate(createData);
        }
    };

    const columns: ColumnDef<AssetResponse>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Nombre' },
        { accessorKey: 'assetType', header: 'Tipo' },
        { accessorKey: 'identifier', header: 'Identificador' },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return (
                    <Badge variant={getStatusBadgeVariant(status) as any}>
                        {getStatusLabel(status)}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const asset = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => crudActions.openEditForm(asset)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => crudActions.openDeleteDialog(asset)}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
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
                title="Gestión de Activos"
                searchPlaceholder="Buscar activos..."
                searchKey="name"
                onAdd={crudActions.openCreateForm}
                addButtonText="Agregar Activo"
                isLoading={crudActions.isLoading}
            />

            <CrudFormDialog
                open={crudActions.isFormOpen}
                onClose={crudActions.closeForm}
                title={crudActions.selectedItem ? 'Editar Activo' : 'Nuevo Activo'}
                fields={formFields}
                onSubmit={handleFormSubmit}
                initialData={crudActions.selectedItem}
                isLoading={crudActions.isLoading}
                submitButtonText={crudActions.selectedItem ? 'Actualizar Activo' : 'Crear Activo'}
            />

            <DeleteConfirmationDialog
                open={crudActions.isDeleteDialogOpen}
                onClose={crudActions.closeDeleteDialog}
                onConfirm={crudActions.handleDelete}
                title="Eliminar Activo"
                description={`¿Seguro que desea eliminar el activo ${crudActions.selectedItem?.name}? Esta acción no se puede deshacer.`}
                isLoading={crudActions.isLoading}
            />
        </div>
    );
};

"use client";
import React from 'react';
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
import { usersService } from '@/lib/services/users.service';
import { UserResponse, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user';
import { MoreHorizontal, Edit, Trash2, User, Phone, Mail, Lock } from 'lucide-react';

const getUserTypeLabel = (type: string) => {
    switch (type) {
        case 'SUPERADMIN':
            return 'Super Admin';
        case 'ADMIN':
            return 'Administrador';
        case 'OPERATOR':
            return 'Operador';
        default:
            return type;
    }
};

const getUserTypeBadgeVariant = (type: string) => {
    switch (type) {
        case 'SUPERADMIN':
            return 'destructive';
        case 'ADMIN':
            return 'default';
        case 'OPERATOR':
            return 'secondary';
        default:
            return 'outline';
    }
};

export const UsersPage: React.FC = () => {
    const crudActions = useCrudActions<UserResponse>({
        getAll: async () => {
            const response = await usersService.getUsers();
            return response.result; // Extraer el array de usuarios del wrapper
        },
        create: async (data) => {
            const response = await usersService.createUser(data as CreateUserRequest);
            return response.result; // Extraer el usuario del wrapper
        },
        update: async (id, data) => {
            const response = await usersService.updateUser(id as number, data);
            return response.result; // Extraer el usuario del wrapper
        },
        delete: async (id) => {
            await usersService.deleteUser(id as number);
        },
    });
    
    // Cargar datos al montar el componente
    React.useEffect(() => {
        crudActions.loadData();
    }, []);
    
    // Configuración de campos del formulario
    const formFields: FormField[] = [
        {
            name: 'name',
            label: 'Nombre',
            type: 'text',
            placeholder: 'Nombre completo',
            required: true,
            icon: <User />,
        },
        {
            name: 'phone',
            label: 'Teléfono',
            type: 'phone',
            placeholder: '333 333 3333',
            icon: <Phone />,
        },
        {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'usuario@ejemplo.com',
            required: true,
            icon: <Mail />,
        },
        {
            name: 'type',
            label: 'Tipo de Usuario',
            type: 'select',
            options: [
                { value: 'SUPERADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Administrador' },
                { value: 'OPERATOR', label: 'Operador' },
            ],
            placeholder: 'Seleccionar tipo...',
            required: true,
            icon: <User />,
        },
        {
            name: 'password',
            label: 'Contraseña',
            type: 'password',
            placeholder: '••••••••••••••••',
            required: !crudActions.selectedItem, // Solo requerida al crear
            icon: <Lock />,
        },
        // Solo incluir campo de confirmación de contraseña al crear usuario
        ...(!crudActions.selectedItem ? [
            {
                name: 'confirmPassword',
                label: 'Confirmar Contraseña',
                type: 'password' as const,
                placeholder: '••••••••••••••••',
                required: !crudActions.selectedItem,
                icon: <Lock />,
            },
        ] : []),
    ];

    const handleFormSubmit = async (data: any) => {
        if (crudActions.selectedItem) {
            // Si no se proporciona contraseña en edición, la eliminamos del objeto
            if (!data.password) {
                delete data.password;
            }
            await crudActions.handleUpdate(data as UpdateUserRequest);
        } else {
            await crudActions.handleCreate(data as CreateUserRequest);
        }
    };

    const columns: ColumnDef<UserResponse>[] = [
        {
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue('id')}</div>
            ),
        },
        {
            accessorKey: 'name',
            header: 'Nombre',
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue('name')}</div>
            ),
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => (
                <div className="text-muted-foreground">{row.getValue('email')}</div>
            ),
        },
        {
            accessorKey: 'phone',
            header: 'Teléfono',
            cell: ({ row }) => (
                <div>{row.getValue('phone')}</div>
            ),
        },
        {
            accessorKey: 'type',
            header: 'Tipo',
            cell: ({ row }) => {
                const type = row.getValue('type') as string;
                return (
                    <Badge variant={getUserTypeBadgeVariant(type) as any}>
                        {getUserTypeLabel(type)}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'isEmailVerified',
            header: 'Email Verificado',
            cell: ({ row }) => {
                const isVerified = row.getValue('isEmailVerified') as boolean;
                return (
                    <Badge variant={isVerified ? 'soft' : 'outline'}>
                        {isVerified ? 'Verificado' : 'Pendiente'}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => crudActions.openEditForm(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => crudActions.openDeleteDialog(user)}
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
                title="Gestión de Usuarios"
                searchPlaceholder="Buscar usuarios..."
                searchKey="name"
                onAdd={crudActions.openCreateForm}
                addButtonText="Agregar Usuario"
                isLoading={crudActions.isLoading}
            />

            <CrudFormDialog
                open={crudActions.isFormOpen}
                onClose={crudActions.closeForm}
                title={crudActions.selectedItem ? 'Editar Usuario' : 'Nuevo Usuario'}
                fields={formFields}
                onSubmit={handleFormSubmit}
                initialData={crudActions.selectedItem}
                isLoading={crudActions.isLoading}
                submitButtonText={crudActions.selectedItem ? 'Actualizar Usuario' : 'Crear Usuario'}
            />

            <DeleteConfirmationDialog
                open={crudActions.isDeleteDialogOpen}
                onClose={crudActions.closeDeleteDialog}
                onConfirm={crudActions.handleDelete}
                title="Eliminar Usuario"
                description={`¿Estás seguro de que deseas eliminar el usuario ${crudActions.selectedItem?.name}? Esta acción no se puede deshacer.`}
                isLoading={crudActions.isLoading}
            />
        </div>
    );
};
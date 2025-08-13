"use client";
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/crud/crud-table';
import { CrudFormDialog, FormField } from '@/components/crud/crud-form-dialog';
import { DeleteConfirmationDialog } from '@/components/crud/delete-confirmation-dialog';
import { useCrudActions } from '@/hooks/use-crud-actions';
import { customersService } from '@/lib/services/customers.service';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '@/lib/types/customer';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, UserIcon, PhoneIcon, MailIcon, IdCard, MapPinIcon, Hash, LockKeyholeIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const CustomersPage = () => {
    const crudActions = useCrudActions<Customer>({
        getAll: async () => {
            try {
                const response = await customersService.getCustomers();
                // Ahora response.customers contiene los datos transformados correctamente
                return response?.customers || [];
            } catch (error) {
                console.error('Error fetching customers:', error);
                return [];
            }
        },
        create: async (data: Omit<Customer, "id" | "createdAt" | "updatedAt">) => {
            // Convertir a CreateCustomerRequest que es compatible
            const createData: CreateCustomerRequest = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: data.password || '',
                rfc: data.rfc,
                address: data.address,
                postalCode: data.postalCode,
                state: data.state,
                city: data.city,
                colony: data.colony,
                interiorNumber: data.interiorNumber,
            };
            const response = await customersService.createCustomer(createData);
            return response;
        },
        update: async (id: string | number, data: Partial<Customer>) => {
            const updateData: UpdateCustomerRequest = {
                ...data,
                id: id as string
            };
            const response = await customersService.updateCustomer(updateData);
            return response;
        },
        delete: async (id: string | number) => {
            await customersService.deleteCustomer(id as string);
        },
    });

    // Configuración de columnas
    const columns: ColumnDef<Customer>[] = [
        {
            accessorKey: 'name',
            header: 'Nombre',
        },
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            accessorKey: 'phone',
            header: 'Teléfono',
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'active' ? 'soft' : 'outline'}>
                    {row.original.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => crudActions.openEditForm(row.original)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => crudActions.openDeleteDialog(row.original)}
                            className="text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    // Configuración de campos del formulario
    const formFields: FormField[] = [
        {
            name: 'name',
            label: 'Nombre',
            type: 'text',
            placeholder: 'Nombre',
            required: true,
            icon: <UserIcon />,
        },
        {
            name: 'rfc',
            label: 'RFC',
            type: 'text',
            placeholder: 'RFC',
            required: true,
            icon: <IdCard />,
        },
        {
            name: 'type',
            label: 'Tipo de cliente',
            type: 'select',
            options: [
                { value: 'physical', label: 'Física' },
                { value: 'legal', label: 'Moral' },
            ],
            placeholder: 'Seleccionar...',
            required: true,
            icon: <UserIcon />,
        },
        {
            name: 'phone',
            label: 'Teléfono',
            type: 'phone',
            placeholder: '333 333 3333',
            icon: <PhoneIcon />,
        },
        {
            name: 'email',
            label: 'Correo electrónico',
            type: 'email',
            placeholder: 'correo@ejemplo.com',
            required: true,
            icon: <MailIcon />,
        },
        {
            name: 'address',
            label: 'Calle',
            type: 'text',
            placeholder: 'Ejem. Monte Lisboa',
            icon: <MapPinIcon />,
            required: true,
        },
        {
            name: 'interiorNumber',
            label: 'Número interior',
            type: 'text',
            placeholder: 'Ejem. 12',
            required: true,
            icon: <Hash />,
        },
        {
            name: 'postalCode',
            label: 'Código Postal',
            type: 'text',
            placeholder: 'Ejem. 44325',
            required: true,
        },
        {
            name: 'state',
            label: 'Estado',
            type: 'select',
            options: [
                { value: 'Aguascalientes', label: 'Aguascalientes' },
                { value: 'Baja California', label: 'Baja California' },
                { value: 'Baja California Sur', label: 'Baja California Sur' },
                { value: 'Campeche', label: 'Campeche' },
                { value: 'Coahuila', label: 'Coahuila' },
                { value: 'Colima', label: 'Colima' },
                { value: 'Chiapas', label: 'Chiapas' },
                { value: 'Chihuahua', label: 'Chihuahua' },
                { value: 'Distrito Federal', label: 'Distrito Federal' },
                { value: 'Durango', label: 'Durango' },
                { value: 'Guanajuato', label: 'Guanajuato' },
                { value: 'Guerrero', label: 'Guerrero' },
                { value: 'Hidalgo', label: 'Hidalgo' },
                { value: 'Jalisco', label: 'Jalisco' },
                { value: 'Michoacán', label: 'Michoacán' },
                { value: 'Morelos', label: 'Morelos' },
                { value: 'Nayarit', label: 'Nayarit' },
                { value: 'Nuevo León', label: 'Nuevo León' },
                { value: 'Oaxaca', label: 'Oaxaca' },
                { value: 'Puebla', label: 'Puebla' },
                { value: 'Querétaro', label: 'Querétaro' },
                { value: 'Quintana Roo', label: 'Quintana Roo' },
                { value: 'San Luis Potosí', label: 'San Luis Potosí' },
                { value: 'Sinaloa', label: 'Sinaloa' },
                { value: 'Sonora', label: 'Sonora' },
                { value: 'Tabasco', label: 'Tabasco' },
                { value: 'Tamaulipas', label: 'Tamaulipas' },
                { value: 'Tlaxcala', label: 'Tlaxcala' },
                { value: 'Veracruz', label: 'Veracruz' },
                { value: 'Yucatán', label: 'Yucatán' },
                { value: 'Zacatecas', label: 'Zacatecas' },
            ],
            placeholder: 'Seleccionar...',
            required: true,
        },
        {
            name: 'city',
            label: 'Ciudad',
            type: 'select',
            options: [
                { value: 'Guadalajara', label: 'Guadalajara', city: 'Jalisco' },
                { value: 'Tlaquepaque', label: 'Tlaquepaque', city: 'Jalisco' },
                { value: 'Tlajomulco', label: 'Tlajomulco', city: 'Jalisco' },
                { value: 'Tonala', label: 'Tonalá', city: 'Jalisco' },
            ],
            placeholder: 'Seleccionar...',
            required: true,
        },
        {
            name: 'colony',
            label: 'Colonia',
            type: 'select',
            options: [
                { value: 'Colonia 1', label: 'Colonia 1', city: 'Jalisco' },
                { value: 'Colonia 2', label: 'Colonia 2', city: 'Jalisco' },
                { value: 'Colonia 3', label: 'Colonia 3', city: 'Jalisco' },
            ],
            placeholder: 'Seleccionar...',
            required: true,
        },
        {
            name: 'password',
            label: 'Contraseña',
            type: 'password',
            placeholder: '••••••••••••••••',
            required: true,
            icon: <LockKeyholeIcon />,
        },
        {
            name: 'confirmPassword',
            label: 'Confirmar Contraseña',
            type: 'password',
            placeholder: '••••••••••••••••',
            required: true,
            icon: <LockKeyholeIcon />,
        },
    ];

    React.useEffect(() => {
        crudActions.loadData();
    }, []);

    const handleFormSubmit = async (data: any) => {
        if (crudActions.selectedItem) {
            await crudActions.handleUpdate(data);
        } else {
            await crudActions.handleCreate(data);
        }
    };

    return (
        <div className="space-y-6">
            <CrudTable
                data={crudActions.data || []}
                columns={columns}
                title="Clientes"
                searchPlaceholder="Buscar clientes..."
                searchKey="name"
                onAdd={crudActions.openCreateForm}
                addButtonText="Agregar Cliente"
                isLoading={crudActions.isLoading}
            />

            <CrudFormDialog
                open={crudActions.isFormOpen}
                onClose={crudActions.closeForm}
                title={crudActions.selectedItem ? 'Editar Cliente' : 'Nuevo Cliente'}
                fields={formFields}
                onSubmit={handleFormSubmit}
                initialData={crudActions.selectedItem}
                isLoading={crudActions.isLoading}
            />

            <DeleteConfirmationDialog
                open={crudActions.isDeleteDialogOpen}
                onClose={crudActions.closeDeleteDialog}
                onConfirm={crudActions.handleDelete}
                title="Eliminar Cliente"
                description="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
                isLoading={crudActions.isLoading}
            />
        </div>
    );
};

export default CustomersPage;
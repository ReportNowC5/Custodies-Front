"use client";

import { Customer } from '@/lib/types/customer';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomersTableProps {
    customers: Customer[];
    loading: boolean;
    onEdit: (customer: Customer) => void;
    onDelete: (id: string) => void;
}

export default function CustomersTable({
    customers,
    loading,
    onEdit,
    onDelete
}: CustomersTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icon icon="heroicons:arrow-path" className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                                <div className="flex flex-col items-center gap-2">
                                    <Icon icon="heroicons:users" className="w-12 h-12 text-gray-400" />
                                    <p className="text-muted-foreground">No hay clientes registrados</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {getInitials(customer.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{customer.name}</div>
                                            {customer.city && (
                                                <div className="text-sm text-muted-foreground">
                                                    {customer.city}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>{customer.phone || '-'}</TableCell>
                                <TableCell>{customer.rfc || '-'}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={customer.status === 'active' ? 'soft' : 'outline'}
                                        className={customer.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                                    >
                                        {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(customer.createdAt), 'dd/MM/yyyy', { locale: es })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <Icon icon="heroicons:ellipsis-vertical" className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                                                <Icon icon="heroicons:pencil" className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDelete(customer.id)}
                                                className="text-red-600"
                                            >
                                                <Icon icon="heroicons:trash" className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
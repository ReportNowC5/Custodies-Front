"use client";

import { useState } from 'react';
import { Customer } from '@/lib/types/customer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import CustomersTable from './customers-table';
import CustomerDialog from './customer-dialog';
import { Badge } from '@/components/ui/badge';

interface CustomersViewProps {
    customers: Customer[];
    loading: boolean;
    total: number;
    page: number;
    onPageChange: (page: number) => void;
    search: string;
    onSearchChange: (search: string) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

export default function CustomersView({
    customers,
    loading,
    total,
    page,
    onPageChange,
    search,
    onSearchChange,
    onDelete,
    onRefresh
}: CustomersViewProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setSelectedCustomer(null);
        onRefresh();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus clientes y su información
                    </p>
                </div>
                <Button onClick={handleAdd} className="flex items-center gap-2">
                    <Icon icon="heroicons:plus" className="w-4 h-4" />
                    Agregar Cliente
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                        <Icon icon="heroicons:users" className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Activos</CardTitle>
                        <Icon icon="heroicons:check-circle" className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {customers.filter(c => c.status === 'active').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
                        <Icon icon="heroicons:x-circle" className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {customers.filter(c => c.status === 'inactive').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <Icon
                            icon="heroicons:magnifying-glass"
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                        />
                        <Input
                            placeholder="Buscar clientes..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 w-80"
                        />
                    </div>
                </div>
                <Button variant="outline" onClick={onRefresh} className="flex items-center gap-2">
                    <Icon icon="heroicons:arrow-path" className="w-4 h-4" />
                    Actualizar
                </Button>
            </div>

            {/* Table */}
            <CustomersTable
                customers={customers}
                loading={loading}
                onEdit={handleEdit}
                onDelete={onDelete}
            />

            {/* Dialog */}
            <CustomerDialog
                open={isDialogOpen}
                onClose={handleDialogClose}
                customer={selectedCustomer}
            />
        </div>
    );
}
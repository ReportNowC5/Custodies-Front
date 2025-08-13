"use client";

import { useState, useEffect } from 'react';
import { Customer, CreateCustomerRequest } from '@/lib/types/customer';
import { customersService } from '@/lib/services/customers.service';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import { Eye, EyeOff, X } from 'lucide-react';

interface CustomerDialogProps {
    open: boolean;
    onClose: () => void;
    customer?: Customer | null;
}

export default function CustomerDialog({
    open,
    onClose,
    customer
}: CustomerDialogProps) {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState<CreateCustomerRequest>({
        name: '',
        email: '',
        phone: '',
        password: '',
        rfc: '',
        address: '',
        postalCode: '',
        city: '',
        state: '',
        colony: '',
        interiorNumber: '',
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                email: customer.email,
                phone: customer.phone || '',
                password: customer.password || '',
                rfc: customer.rfc || '',
                address: customer.address || '',
                postalCode: customer.postalCode || '',
                city: customer.city || '',
                state: customer.state || '',
                colony: customer.colony || '',
                interiorNumber: customer.interiorNumber || '',
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                rfc: '',
                address: '',
                postalCode: '',
                city: '',
                state: '',
                colony: '',
                interiorNumber: '',
            });
        }
    }, [customer, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (customer) {
                await customersService.updateCustomer({
                    ...formData,
                    id: customer.id
                });
                toast.success('Cliente actualizado exitosamente');
            } else {
                await customersService.createCustomer(formData);
                toast.success('Cliente creado exitosamente');
            }
            onClose();
        } catch (error) {
            toast.error(customer ? 'Error al actualizar el cliente' : 'Error al crear el cliente');
            console.error('Error saving customer:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof CreateCustomerRequest, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const estados = [
        'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
        'Coahuila', 'Colima', 'Chiapas', 'Chihuahua', 'Distrito Federal',
        'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
        'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
        'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
        'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
        'Veracruz', 'Yucatán', 'Zacatecas'
    ];

    const ciudades = [
        'Guadalajara', 'Tlaquepaque', 'Tlajomulco', 'Tonalá', 'Zapopan'
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh]">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <DialogTitle className="text-lg font-semibold">
                        {customer ? 'Editar Cliente' : 'Nuevo cliente'}
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-6 w-6 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[calc(95vh-120px)] pr-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Información Básica */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        Nombre <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="Nombre"
                                        className="h-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rfc" className="text-sm font-medium">
                                        RFC <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="rfc"
                                        value={formData.rfc}
                                        onChange={(e) => handleChange('rfc', e.target.value)}
                                        placeholder="RFC"
                                        className="h-10"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-sm font-medium">
                                        Tipo de cliente <span className="text-red-500">*</span>
                                    </Label>
                                    <Select>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="physical">Física</SelectItem>
                                            <SelectItem value="legal">Moral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">
                                    Teléfono
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                        📞
                                    </span>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="333 333 3333"
                                        className="pl-10 h-10"
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-blue-600 cursor-pointer">
                                + Agregar otro
                            </div>
                        </div>

                        {/* Contacto */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Correo electrónico <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="h-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Domicilio */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-900">
                                    Domicilio
                                </Label>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-sm font-medium">
                                    Calle
                                </Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Ejem. Monte Lisboa"
                                    className="h-10"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="interiorNumber" className="text-sm font-medium">
                                        Número interior <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="interiorNumber"
                                        value={formData.interiorNumber}
                                        onChange={(e) => handleChange('interiorNumber', e.target.value)}
                                        placeholder="Ejem. 12"
                                        className="h-10"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode" className="text-sm font-medium">
                                        Código Postal <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="postalCode"
                                        value={formData.postalCode}
                                        onChange={(e) => handleChange('postalCode', e.target.value)}
                                        placeholder="Ejem. 44325"
                                        className="h-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="state" className="text-sm font-medium">
                                        Estado <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleChange('state', value)}
                                        value={formData.state}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {estados.map((estado) => (
                                                <SelectItem key={estado} value={estado}>
                                                    {estado}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-sm font-medium">
                                        Ciudad <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleChange('city', value)}
                                        value={formData.city}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ciudades.map((ciudad) => (
                                                <SelectItem key={ciudad} value={ciudad}>
                                                    {ciudad}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="colony" className="text-sm font-medium">
                                    Colonia <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    onValueChange={(value) => handleChange('colony', value)}
                                    value={formData.colony}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="colonia1">Colonia 1</SelectItem>
                                        <SelectItem value="colonia2">Colonia 2</SelectItem>
                                        <SelectItem value="colonia3">Colonia 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Seguridad */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-medium text-gray-900">SEGURIDAD</h3>
                                <Separator className="flex-1" />
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        Contraseña <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            placeholder="••••••••••••••••••"
                                            className="pr-10 h-10"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600">
                                    Una contraseña segura, usa al menos 12 caracteres, letras mayúsculas y minúsculas, números y símbolos.
                                </p>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                        Confirmar Contraseña <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••••••••"
                                            className="pr-10 h-10"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botones - Fuera del área de scroll */}
                    </form>
                </div>
                
                {/* Footer fijo */}
                <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={onClose} className="px-6">
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="px-6 bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmit}
                    >
                        {loading && <Icon icon="heroicons:arrow-path" className="mr-2 h-4 w-4 animate-spin" />}
                        {customer ? 'Actualizar' : 'Agregar cliente'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { CreateUserRequest, UpdateUserRequest, UserResponse, UserType } from '@/lib/types/user';

const userSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    type: z.enum(['SUPERADMIN', 'ADMIN', 'OPERATOR'] as const),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
    user?: UserResponse;
    isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    user,
    isLoading = false,
}) => {
    const isEditing = !!user;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: user?.name || '',
            phone: user?.phone || '',
            email: user?.email || '',
            password: '',
            type: user?.type || 'OPERATOR',
        },
    });

    const userType = watch('type');

    React.useEffect(() => {
        if (user) {
            setValue('name', user.name);
            setValue('phone', user.phone);
            setValue('email', user.email);
            setValue('type', user.type);
        } else {
            reset();
        }
    }, [user, setValue, reset]);

    const handleFormSubmit = async (data: UserFormData) => {
        try {
            if (isEditing) {
                // Para edición, no incluir password si está vacío
                const updateData: UpdateUserRequest = {
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    type: data.type,
                };
                if (data.password && data.password.trim() !== '') {
                    updateData.password = data.password;
                }
                await onSubmit(updateData);
            } else {
                // Para creación, password es requerido
                if (!data.password) {
                    throw new Error('La contraseña es requerida');
                }
                const createData: CreateUserRequest = {
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    password: data.password,
                    type: data.type,
                };
                await onSubmit(createData);
            }
            onClose();
            reset();
        } catch (error) {
            console.error('Error en formulario:', error);
        }
    };

    const handleClose = () => {
        onClose();
        reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="Nombre completo"
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            {...register('phone')}
                            placeholder="555-1234"
                        />
                        {errors.phone && (
                            <p className="text-sm text-red-500">{errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            placeholder="usuario@ejemplo.com"
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Contraseña {isEditing && '(dejar vacío para no cambiar)'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            {...register('password')}
                            placeholder={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                        />
                        {errors.password && (
                            <p className="text-sm text-red-500">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Usuario</Label>
                        <Select
                            value={userType}
                            onValueChange={(value: UserType) => setValue('type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OPERATOR">Operador</SelectItem>
                                <SelectItem value="ADMIN">Administrador</SelectItem>
                                <SelectItem value="SUPERADMIN">Super Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && (
                            <p className="text-sm text-red-500">{errors.type.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
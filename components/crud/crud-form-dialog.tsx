"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, X, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'date' | 'phone' | 'password';
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string; city?: string }[];
    validation?: any;
    section?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

interface CrudFormDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    fields: FormField[];
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    isLoading?: boolean;
    submitButtonText?: string;
}

export function CrudFormDialog({
    open,
    onClose,
    title,
    fields,
    onSubmit,
    initialData,
    isLoading = false,
    submitButtonText = "Agregar cliente",
}: CrudFormDialogProps) {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    // Crear schema dinámico basado en los campos
    const createSchema = () => {
        const schemaFields: Record<string, any> = {};

        fields.forEach((field) => {
            let fieldSchema: any;

            if (field.type === 'email') {
                fieldSchema = field.required
                    ? z.string().min(1, `${field.label} es requerido`).email('Email inválido')
                    : z.string().email('Email inválido').optional();
            } else if (field.type === 'number') {
                fieldSchema = field.required
                    ? z.string().min(1, `${field.label} es requerido`).transform((val) => Number(val))
                    : z.string().optional().transform((val) => val ? Number(val) : undefined);
            } else if (field.type === 'password') {
                fieldSchema = field.required
                    ? z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
                    : z.string().optional();
            } else {
                fieldSchema = field.required
                    ? z.string().min(1, `${field.label} es requerido`)
                    : z.string().optional();
            }

            if (field.validation) {
                fieldSchema = field.validation;
            }

            schemaFields[field.name] = fieldSchema;
        });

        // Agregar validación para confirmar contraseña
        if (fields.some(f => f.name === 'confirmPassword')) {
            return z.object(schemaFields).refine((data) => {
                return data.password === data.confirmPassword;
            }, {
                message: "Las contraseñas no coinciden",
                path: ["confirmPassword"],
            });
        }

        return z.object(schemaFields);
    };

    const form = useForm({
        resolver: zodResolver(createSchema()),
        defaultValues: initialData || {},
    });

    React.useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach((key) => {
                form.setValue(key, initialData[key]);
            });
        } else {
            form.reset();
        }
    }, [initialData, form, open]);

    const handleSubmit = async (data: any) => {
        try {
            await onSubmit(data);
            form.reset();
            onClose();
        } catch (error) {
            console.error('Error al enviar formulario:', error);
        }
    };

    const renderField = (field: FormField) => {
        switch (field.type) {
            case 'textarea':
                return (
                    <FormControl>
                        <Textarea
                            placeholder={field.placeholder}
                            className="min-h-[80px]"
                            {...form.register(field.name)}
                        />
                    </FormControl>
                );

            case 'select':
                return (
                    <Select
                        onValueChange={(value) => form.setValue(field.name, value)}
                        value={form.watch(field.name)}
                    >
                        <FormControl>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[9999]">
                            {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'password':
                const isPassword = field.name === 'password';
                const isConfirmPassword = field.name === 'confirmPassword';
                const showCurrentPassword = isPassword ? showPassword : showConfirmPassword;
                const togglePassword = isPassword ? setShowPassword : setShowConfirmPassword;

                return (
                    <FormControl>
                        <div className="relative">
                            {field?.icon && (
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                    {field.icon}
                                </span>
                            )}
                            <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder={field.placeholder}
                                className="pr-10 h-10"
                                {...form.register(field.name)}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => togglePassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </FormControl>
                );

            default:
                return (
                    <FormControl>
                        <div className="relative">
                            {field?.icon && (
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                    {field.icon}
                                </span>
                            )}
                            <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                className="h-10"
                                {...form.register(field.name)}
                            />
                        </div>
                    </FormControl>
                );
        }
    };

    // Organizar campos por secciones
    const basicFields = fields.filter(f => ['name', 'rfc', 'type', 'phone'].includes(f.name));
    const contactFields = fields.filter(f => f.name === 'email');
    const addressFields = fields.filter(f => ['address', 'interiorNumber', 'postalCode', 'state', 'city', 'colony'].includes(f.name));
    const securityFields = fields.filter(f => ['password', 'confirmPassword'].includes(f.name));

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6 flex-shrink-0">
                    <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-6 w-6 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="space-y-6">
                                {/* Información Básica */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        {basicFields.map((field) => (
                                            <FormField
                                                key={field.name}
                                                control={form.control}
                                                name={field.name}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                                        </FormLabel>
                                                        {renderField(field)}
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Contacto */}
                                {contactFields.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            {contactFields.map((field) => (
                                                <FormField
                                                    key={field.name}
                                                    control={form.control}
                                                    name={field.name}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </FormLabel>
                                                            {renderField(field)}
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dirección */}
                                {addressFields.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            {/* Calle */}
                                            {addressFields.filter(f => f.name === 'address').map((field) => (
                                                <FormField
                                                    key={field.name}
                                                    control={form.control}
                                                    name={field.name}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </FormLabel>
                                                            {renderField(field)}
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}

                                            {/* Número interior y Código postal */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {addressFields.filter(f => ['interiorNumber', 'postalCode'].includes(f.name)).map((field) => (
                                                    <FormField
                                                        key={field.name}
                                                        control={form.control}
                                                        name={field.name}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-medium">
                                                                    {field.label}
                                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                                </FormLabel>
                                                                {renderField(field)}
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            {/* Estado y Ciudad */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {addressFields.filter(f => ['state', 'city'].includes(f.name)).map((field) => (
                                                    <FormField
                                                        key={field.name}
                                                        control={form.control}
                                                        name={field.name}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-sm font-medium">
                                                                    {field.label}
                                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                                </FormLabel>
                                                                {renderField(field)}
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            {/* Colonia */}
                                            {addressFields.filter(f => f.name === 'colony').map((field) => (
                                                <FormField
                                                    key={field.name}
                                                    control={form.control}
                                                    name={field.name}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </FormLabel>
                                                            {renderField(field)}
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Seguridad */}
                                {securityFields.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-sm font-medium text-gray-900">SEGURIDAD</h3>
                                            <Separator className="flex-1" />
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            Una contraseña segura, usa al menos 12 caracteres, letras mayúsculas y minúsculas, números y símbolos.
                                        </p>
                                        <div className="space-y-4">
                                            {securityFields.map((field) => (
                                                <FormField
                                                    key={field.name}
                                                    control={form.control}
                                                    name={field.name}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-sm font-medium">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </FormLabel>
                                                            {renderField(field)}
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="flex flex-row justify-end space-x-2 pt-4 px-6 pb-6 flex-shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-6"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 bg-blue-600 hover:bg-blue-700"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitButtonText}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
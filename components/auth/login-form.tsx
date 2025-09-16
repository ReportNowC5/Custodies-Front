"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { AuthError, AuthErrorType } from "@/lib/types/auth";
import Image from 'next/image';
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";

const schema = z.object({
    email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
    password: z.string().min(4, { message: "La contraseña debe tener al menos 4 caracteres." }),
    remember: z.boolean().optional(),
});

// Mapeo de errores para mensajes en español
const ERROR_MESSAGES: Record<AuthErrorType, string> = {
    MISSING_CREDENTIALS: 'Por favor, ingresa tu correo y contraseña',
    INVALID_CREDENTIALS: 'Correo o contraseña incorrectos',
    INVALID_TOKEN: 'Tu sesión ha expirado, por favor inicia sesión nuevamente',
    MISSING_TOKEN: 'No se encontró token de autenticación',
    NETWORK_ERROR: 'Error de conexión, verifica tu internet',
    SERVER_ERROR: 'Error del servidor, intenta más tarde',
    UNKNOWN_ERROR: 'Ha ocurrido un error inesperado'
};

const LoginForm = ({ className }: { className?: string }) => {
    const [isPending, startTransition] = React.useTransition();
    const [passwordType, setPasswordType] = React.useState("password");
    const [error, setError] = React.useState<AuthError | null>(null);

    const router = useRouter();
    const { redirectAfterLogin, getLocaleUrl } = useLocaleNavigation();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "all",
        defaultValues: {
            email: "admin@gps.mail",
            password: "136kAQPvtJ",
            remember: false,
        },
    });

    const togglePasswordType = () => {
        setPasswordType(passwordType === "password" ? "text" : "password");
    };

    // Función para determinar el tipo de error
    const determineErrorType = (error: any): AuthErrorType => {
        if (!error) return 'UNKNOWN_ERROR';

        // Si el error ya tiene un tipo definido
        if (error.type && Object.keys(ERROR_MESSAGES).includes(error.type)) {
            return error.type;
        }

        // Determinar por mensaje o código de estado
        const message = error.message?.toLowerCase() || '';
        const status = error.status || error.response?.status;

        if (status === 401 || message.includes('unauthorized') || message.includes('invalid credentials')) {
            return 'INVALID_CREDENTIALS';
        }

        if (status === 400 || message.includes('missing') || message.includes('required')) {
            return 'MISSING_CREDENTIALS';
        }

        if (message.includes('token') && message.includes('invalid')) {
            return 'INVALID_TOKEN';
        }

        if (message.includes('token') && message.includes('missing')) {
            return 'MISSING_TOKEN';
        }

        if (message.includes('network') || message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }

        if (status >= 500) {
            return 'SERVER_ERROR';
        }

        return 'UNKNOWN_ERROR';
    };

    // Función para crear error tipado
    const createAuthError = (error: any): AuthError => {
        const type = determineErrorType(error);
        return {
            type,
            message: ERROR_MESSAGES[type],
            details: error.message || error.toString()
        };
    };

    const onSubmit = async (data: z.infer<typeof schema>) => {
        // Limpiar errores previos
        setError(null);

        // Validación básica
        if (!data.email || !data.password) {
            const authError = createAuthError({ type: 'MISSING_CREDENTIALS' });
            setError(authError);
            toast.error(authError.message);
            return;
        }

        startTransition(async () => {
            try {
                const result = await authService.login({
                    email: data.email,
                    password: data.password,
                });

                console.log('📥 Login result:', result);

                if (result.success && result.result) {
                    console.log('✅ Login successful, redirecting to dashboard');
                    toast.success('¡Inicio de sesión exitoso!');

                    // Usar el hook para manejar la redirección con locale correcto
                    redirectAfterLogin();
                    reset();
                } else {
                    console.log('❌ Login failed:', result.message || result.error);
                    const authError = createAuthError(result);
                    setError(authError);
                    toast.error(authError.message);
                }
            } catch (error: any) {
                console.error('💥 Login error:', error);
                const authError = createAuthError(error);
                setError(authError);
                toast.error(authError.message);
            }
        });
    };

    // Función para obtener el color del error según el tipo
    const getErrorColor = (errorType: AuthErrorType): string => {
        switch (errorType) {
            case 'INVALID_CREDENTIALS':
            case 'MISSING_CREDENTIALS':
                return 'border-red-200 bg-red-50 text-red-600';
            case 'NETWORK_ERROR':
                return 'border-orange-200 bg-orange-50 text-orange-600';
            case 'SERVER_ERROR':
                return 'border-yellow-200 bg-yellow-50 text-yellow-600';
            default:
                return 'border-red-200 bg-red-50 text-red-600';
        }
    };

    return (
        <div className={cn("w-full max-w-md mx-auto font-satoshi", className)}>
            <div className="flex flex-col items-start justify-center text-left mb-8">
                <div className="w-16 h-16 bg-[#846CF9] rounded-full flex items-center justify-center mb-4">
                    <Image src="/images/logo/logo.png" alt="Logo" width={48} height={48} style={{ width: 'auto', height: 'auto' }} />
                </div>
                <h1 className="text-2xl font-bold text-[#333333] mb-2">Bienvenido de vuelta</h1>
                <p className="text-[#5C5C5C]">Ingresa tus credenciales para iniciar sesión</p>
            </div>

            {error && (
                <div className={`mb-4 p-3 border rounded-lg ${getErrorColor(error.type)}`}>
                    <div className="flex items-center space-x-2">
                        <Icon
                            icon={error.type === 'NETWORK_ERROR' ? 'heroicons:wifi' : 'heroicons:exclamation-triangle'}
                            className="text-lg"
                        />
                        <p className="text-sm font-medium">{error.message}</p>
                    </div>
                    {error.details && process.env.NODE_ENV === 'development' && (
                        <p className="text-xs mt-1 opacity-75">{error.details}</p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-[#07090D]">
                        Correo electrónico
                    </Label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ACB4C3]">
                            <Icon icon="heroicons:envelope" className="text-lg" />
                        </div>
                        <Input
                            disabled={isPending}
                            {...register("email")}
                            type="email"
                            id="email"
                            className={`pl-10 border-[#E7EAEE] placeholder:text-[#ACB4C3] ${errors.email ? '!border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                            placeholder="correo.ejemplo@email.com"
                        />
                    </div>
                    {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-[#07090D]">
                        Contraseña
                    </Label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ACB4C3]">
                            <Icon icon="heroicons:lock-closed" className="text-lg" />
                        </div>
                        <Input
                            disabled={isPending}
                            {...register("password")}
                            type={passwordType}
                            id="password"
                            className={`pl-10 pr-10 border-[#E7EAEE] placeholder:text-[#ACB4C3] ${errors.password ? "!border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-indigo-500 focus:ring-indigo-500"
                                }`}
                            placeholder="•••••••••••"
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={togglePasswordType}
                        >
                            {passwordType === "password" ? (
                                <Icon icon="heroicons:eye" className="text-lg" />
                            ) : (
                                <Icon icon="heroicons:eye-slash" className="text-lg" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            {...register("remember")}
                            id="remember"
                            className="border-gray-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Label
                            htmlFor="remember"
                            className="text-sm text-gray-600 cursor-pointer"
                        >
                            Recuérdame
                        </Label>
                    </div>
                    <Link
                        href={getLocaleUrl('/auth/forgot')}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#846CF9] hover:bg-[#7c63f8] text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={isPending}
                >
                    {isPending ? (
                        <>
                            <Icon icon="heroicons:arrow-path" className="mr-2 h-4 w-4 animate-spin" />
                            Iniciando sesión...
                        </>
                    ) : (
                        "Iniciar sesión"
                    )}
                </Button>
            </form>

            <div className="mt-8 text-center">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                        <Icon icon="heroicons:globe-alt" className="text-lg" />
                        <span>ES</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Icon icon="heroicons:shield-check" className="text-lg" />
                        <span>Seguro</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;

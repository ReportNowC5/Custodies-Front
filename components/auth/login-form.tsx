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
import Image from 'next/image';

const schema = z.object({
    email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
    password: z.string().min(4, { message: "La contraseña debe tener al menos 4 caracteres." }),
    remember: z.boolean().optional(),
});

const LoginForm = ({ className }: { className?: string }) => {
    const [isPending, startTransition] = React.useTransition();
    const [passwordType, setPasswordType] = React.useState("password");
    const router = useRouter();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "all",
        defaultValues: {
            email: "admin@gps.com",
            password: "password123",
            remember: false,
        },
    });

    const togglePasswordType = () => {
        setPasswordType(passwordType === "password" ? "text" : "password");
    };

    const onSubmit = (data: z.infer<typeof schema>) => {
        startTransition(async () => {
            try {
                const response = await authService.login({
                    email: data.email,
                    password: data.password,
                    remember: data.remember,
                });

                toast.success("¡Inicio de sesión exitoso!");
                router.push("/gps/dashboard");
                reset();
            } catch (error: any) {
                const message = error?.response?.data?.message || "Error al iniciar sesión";
                toast.error(message);
            }
        });
    };

    return (
        <div className={cn("w-full max-w-md mx-auto font-satoshi", className)}>
            <div className="flex flex-col items-start justify-center text-left mb-8">
                <div className="w-16 h-16 bg-[#846CF9] rounded-full flex items-center justify-center mb-4">
                    <Image src="/images/logo/logo.png" alt="Logo" width={48} height={48}/>
                </div>
                <h1 className="text-2xl font-bold text-[#333333] mb-2">Bienvenido de vuelta</h1>
                <p className="text-[#5C5C5C">Ingresa tus credenciales para iniciar sesión</p>
            </div>

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
                            className={`border-[#E7EAEE] placeholder:text-[#ACB4C3] ${errors.email ? '!border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-indigo-500 focus:ring-indigo-500'
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
                            className={`border-[#E7EAEE] placeholder:text-[#ACB4C3] ${errors.password ? "!border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-indigo-500 focus:ring-indigo-500"}`}
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
                        href="/auth/forgot"
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 bg-[#846CF9] hover:from-purple-500 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
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

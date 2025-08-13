"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuth } from "@/provider/auth.provider";

const UnauthorizedPage = () => {
    const { theme } = useTheme();
    const { logout } = useAuth();

    return (
        <div className="min-h-screen overflow-y-auto flex justify-center items-center p-10">
            <div className="w-full flex flex-col items-center">
                <div className="text-center">
                    <div className="text-6xl font-bold text-red-500 mb-4">403</div>
                    <div className="text-2xl md:text-4xl lg:text-5xl font-semibold text-default-900 mb-4">
                        Acceso No Autorizado
                    </div>
                    <div className="mt-3 text-default-600 text-sm md:text-base mb-8">
                        No tienes permisos para acceder a esta página. <br />
                        Contacta al administrador si crees que esto es un error.
                    </div>
                    <div className="flex gap-4 justify-center">
                        <Button asChild size="lg">
                            <Link href="/dashboard">Ir al Dashboard</Link>
                        </Button>
                        <Button variant="outline" size="lg" onClick={logout}>
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
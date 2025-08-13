"use client";
import { authService } from "@/lib/services/auth.service";
import { Icon } from "@iconify/react";

import { useEffect, useState } from "react";
import AddBlock from "../common/add-block";
import { User } from "@/lib/types/auth";
const LogoutFooter = () => {
    const [user, setUser] = useState<User | null>(null);
    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        };
        loadUser();
    }, []);
    const handleLogout = async () => {
        console.log('🔍 Antes del logout:', {
            localStorage: localStorage.getItem('auth_token'),
            cookie: document.cookie.includes('auth_token')
        });

        await authService.logout();

        // Verificar después del logout
        setTimeout(() => {
            console.log('🔍 Después del logout:', {
                localStorage: localStorage.getItem('auth_token'),
                cookie: document.cookie.includes('auth_token')
            });
        }, 100);
    };
    return (
        <>
            <AddBlock />

            <div className=" bg-default-50 dark:bg-default-200 items-center flex gap-3  px-4 py-2 mt-5">
                <div className="flex-1">
                    <div className=" text-default-700 font-semibold text-sm capitalize mb-0.5 truncate">
                        {user?.name}
                    </div>
                    <div className=" text-xs text-default-600  truncate">
                        {user?.email}
                    </div>
                </div>
                <div className=" flex-none">
                    <button
                        type="button"
                        onClick={handleLogout} // Usar la nueva función
                        className="text-default-500 inline-flex h-9 w-9 rounded items-center dark:bg-default-300 justify-center dark:text-default-900"
                    >
                        <Icon
                            icon="heroicons:arrow-right-start-on-rectangle-20-solid"
                            className="h-5 w-5"
                        />
                    </button>
                </div>
            </div>
        </>
    );
};

export default LogoutFooter;

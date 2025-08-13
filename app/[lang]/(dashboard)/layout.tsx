"use client";

import DashBoardLayoutProvider from "@/provider/dashboard.layout.provider";
import { getDictionary } from "@/app/dictionaries";
import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
// Línea eliminada: import { useSessionCheck } from '@/hooks/use-session-check';

function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Línea eliminada: useSessionCheck();
    
    const [trans, setTrans] = useState<any>(null);
    const mounted = useMounted();

    useEffect(() => {
        const loadDictionary = async () => {
            const dictionary = await getDictionary('es');
            setTrans(dictionary);
        };

        loadDictionary();
    }, ['es']);

    // Evitar hidratación hasta que el componente esté montado
    if (!mounted || !trans) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <DashBoardLayoutProvider trans={trans}>{children}</DashBoardLayoutProvider>
    );
};

export default DashboardLayout;

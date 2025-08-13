'use client';

import { Button } from '@/components/ui/button';
import { authService } from '@/lib/services/auth.service';
import apiClient from '@/lib/api-client';

export function ForceLogoutButton() {
    const handleForceLogout = () => {
        console.log('🔴 Forzando logout manual...');
        authService.logout();
    };

    return (
        <Button 
            variant="outline"
            onClick={handleForceLogout}
            className="fixed bottom-4 right-4 z-50"
        >
            🚪 Force Logout
        </Button>
    );
}
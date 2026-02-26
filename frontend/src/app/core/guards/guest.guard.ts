import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.authInitialized;

    if (authService.currentUser()) {
        const role = authService.userRole();
        if (role === 'vendor') {
            return router.parseUrl('/vendor');
        } else if (role === 'admin') {
            return router.parseUrl('/admin');
        } else {
            return router.parseUrl('/buyer');
        }
    } else {
        return true;
    }
};

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
    authService = inject(AuthService);
    currentUser = this.authService.currentUser;
    userRole = this.authService.userRole;

    logout() {
        this.authService.logout();
    }

    getDashboardRoute(): string {
        const role = this.userRole();
        if (role === 'vendor') return '/vendor';
        if (role === 'admin') return '/admin';
        return '/buyer';
    }

    getInitials(): string {
        const user = this.currentUser();
        const name = user?.user_metadata?.['full_name'] || user?.email || 'U';
        return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    }

    getUserName(): string {
        return this.currentUser()?.user_metadata?.['full_name'] || this.currentUser()?.email || 'User';
    }

    getUserEmail(): string {
        return this.currentUser()?.email || '';
    }
}

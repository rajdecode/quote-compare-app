import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface ProductCategory {
    id: string;
    title: string;
    icon: string;
    path: string;
    description: string;
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
    authService = inject(AuthService);
    router = inject(Router);
    currentUser = this.authService.currentUser;
    userRole = this.authService.userRole;

    mobileMenuOpen = false;
    productsDropdownOpen = false;
    logoFailed = false;

    categories: ProductCategory[] = [
        { id: 'heat-pumps', title: 'Heat Pumps & Hot Water', icon: 'heat_pump', path: '/products/heat-pumps', description: 'High-efficiency heat pumps & hot water systems' },
        { id: 'aircons', title: 'Air Conditioning', icon: 'ac_unit', path: '/products/aircons', description: 'Reverse cycle split systems & ducted HVAC' },
        { id: 'batteries', title: 'Solar Batteries', icon: 'battery_charging_full', path: '/products/batteries', description: 'Home battery storage & backup power' },
        { id: 'water-filters', title: 'Water Filtration', icon: 'water_drop', path: '/products/water-filters', description: 'Whole-house & under-sink purification systems' }
    ];

    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }

    closeMobileMenu() {
        this.mobileMenuOpen = false;
        this.productsDropdownOpen = false;
    }

    toggleProductsDropdown() {
        this.productsDropdownOpen = !this.productsDropdownOpen;
    }

    isHomePage(): boolean {
        const url = this.router.url;
        return url === '/' || url.startsWith('/#') || url.startsWith('/?');
    }

    logout() {
        this.closeMobileMenu();
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

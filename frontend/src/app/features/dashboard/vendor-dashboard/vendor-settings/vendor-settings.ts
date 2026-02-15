import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-vendor-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './vendor-settings.html',
    styleUrls: ['./vendor-settings.scss']
})
export class VendorSettings implements OnInit {
    authService = inject(AuthService);

    servicePostcodes = '';
    serviceSuburbs = '';

    // Available services
    availableServices = [
        { id: 'heat-pump', label: 'Heat Pumps' },
        { id: 'water-filter', label: 'Water Filters' },
        { id: 'aircon', label: 'Aircons' },
        { id: 'battery', label: 'Batteries' }
    ];

    servicesOffered: Set<string> = new Set();
    loading = signal<boolean>(false);
    successMessage = signal<string>('');

    async ngOnInit() {
        const user: any = this.authService.currentUser();
        if (user) {
            // We need to fetch the full user profile including custom fields
            // AuthService currently gets role, but we might need to fetch the doc directly or rely on AuthService to have it.
            // For now, let's assume we fetch it or it's on the user object (it's not on Firebase User logic usually).
            // Let's rely on fetching the doc in AuthService or here.
            // Best practice: AuthService should probably expose a way to get profile data.
            // But for speed, let's fetch it here using a helper or just assume we add a method to AuthService.

            // Actually, let's add `getUserProfile` to AuthService to act as a single source of truth.
            const profile = await this.authService.getUserProfile(user.uid);

            if (profile) {
                this.servicePostcodes = (profile.servicePostcodes || []).join(', ');
                this.serviceSuburbs = (profile.serviceSuburbs || []).join(', ');

                if (profile.servicesOffered) {
                    this.servicesOffered = new Set(profile.servicesOffered);
                }
            }
        }
    }

    toggleService(serviceId: string) {
        if (this.servicesOffered.has(serviceId)) {
            this.servicesOffered.delete(serviceId);
        } else {
            this.servicesOffered.add(serviceId);
        }
    }

    async saveSettings() {
        this.loading.set(true);
        this.successMessage.set('');

        try {
            const user = this.authService.currentUser();
            if (!user) return;

            // Parse inputs
            const postcodes = this.servicePostcodes.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const suburbs = this.serviceSuburbs.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const services = Array.from(this.servicesOffered);

            await this.authService.updateVendorProfile(user.uid, {
                servicePostcodes: postcodes,
                serviceSuburbs: suburbs,
                servicesOffered: services
            });

            this.successMessage.set('Settings saved successfully!');

            // Hide message after 3 seconds
            setTimeout(() => this.successMessage.set(''), 3000);

        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings.');
        } finally {
            this.loading.set(false);
        }
    }
}

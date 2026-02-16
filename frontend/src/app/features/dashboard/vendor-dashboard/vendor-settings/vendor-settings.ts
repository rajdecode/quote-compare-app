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

    excludedPostcodes = '';
    excludedSuburbs = '';

    // Available services
    availableServices = [
        { id: 'heat-pump', label: 'Heat Pumps' },
        { id: 'water-filter', label: 'Water Filters' },
        { id: 'aircon', label: 'Aircons' },
        { id: 'battery', label: 'Batteries' }
    ];

    // Available States
    availableStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
    serviceStates: Set<string> = new Set();

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

            const profile = await this.authService.getUserProfile(user.id);

            if (profile) {
                this.servicePostcodes = (profile.servicePostcodes || []).join(', ');
                this.serviceSuburbs = (profile.serviceSuburbs || []).join(', ');

                this.excludedPostcodes = (profile.excludedPostcodes || []).join(', ');
                this.excludedSuburbs = (profile.excludedSuburbs || []).join(', ');

                if (profile.servicesOffered) {
                    this.servicesOffered = new Set(profile.servicesOffered);
                }
                if (profile.serviceStates) {
                    this.serviceStates = new Set(profile.serviceStates);
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

    toggleState(state: string) {
        if (this.serviceStates.has(state)) {
            this.serviceStates.delete(state);
        } else {
            this.serviceStates.add(state);
        }
    }

    toggleAllStates(event: any) {
        if (event.target.checked) {
            this.availableStates.forEach(s => this.serviceStates.add(s));
        } else {
            this.serviceStates.clear();
        }
    }

    get isAllStatesSelected(): boolean {
        return this.availableStates.every(s => this.serviceStates.has(s));
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

            const exPostcodes = this.excludedPostcodes.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const exSuburbs = this.excludedSuburbs.split(',').map(s => s.trim()).filter(s => s.length > 0);

            const services = Array.from(this.servicesOffered);
            const states = Array.from(this.serviceStates);

            await this.authService.updateVendorProfile(user.id, {
                servicePostcodes: postcodes,
                serviceSuburbs: suburbs,
                excludedPostcodes: exPostcodes,
                excludedSuburbs: exSuburbs,
                servicesOffered: services,
                serviceStates: states
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

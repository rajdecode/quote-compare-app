import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-buyer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './buyer-dashboard.html',
  styleUrls: ['./buyer-dashboard.scss']
})
export class BuyerDashboard implements OnInit {
  // Rename to bust cache/references
  quotesList = signal<any[]>([]);
  loading = signal<boolean>(true);
  expandedQuotes = signal<Set<string>>(new Set());

  authService = inject(AuthService);

  constructor() {
    console.log('BuyerDashboard: CONSTRUCTOR Called');
    // Defensive check
    if (!this.quotesList) this.quotesList = signal([]);
    if (!this.loading) this.loading = signal(true);
    if (!this.expandedQuotes) this.expandedQuotes = signal(new Set());

    console.log('BuyerDashboard: Signals initialized:', {
      quotesList: !!this.quotesList,
      loading: !!this.loading
    });
  }

  toggleExpand(quoteId: string) {
    if (!this.expandedQuotes) this.expandedQuotes = signal(new Set());
    const current = this.expandedQuotes();
    const newSet = new Set(current);
    if (newSet.has(quoteId)) {
      newSet.delete(quoteId);
    } else {
      newSet.add(quoteId);
    }
    this.expandedQuotes.set(newSet);
  }

  async ngOnInit() {
    console.log('BuyerDashboard: ngOnInit Called');
    console.log('BuyerDashboard: THIS keys:', Object.keys(this));

    const user = this.authService.currentUser();

    if (user) {
      try {
        const token = await this.authService.getToken();
        const role = this.authService.userRole() || 'buyer';
        console.log('Fetching quotes for Buyer:', user.id, 'Role:', role);

        const response = await fetch(`${environment.apiUrl}/quotes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Mock-Role': role
          },
          cache: 'no-store'
        });

        console.log('Buyer Quote Fetch Status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Buyer Quote Data Received:', Array.isArray(data) ? data.length : data);

          if (Array.isArray(data)) {
            data.forEach((quote: any) => {
              if (quote.responses && Array.isArray(quote.responses)) {
                quote.responses.sort((a: any, b: any) => a.price - b.price);
              }
            });

            // Critical safety check before setting signal
            if (this.quotesList) {
              console.log('Setting quotesList signal...');
              this.quotesList.set(data);
            } else {
              console.error('CRITICAL: this.quotesList signal is null! Re-initializing.');
              this.quotesList = signal(data);
            }
          } else {
            console.error('Invalid quotes data format:', data);
          }
        } else {
          console.error('Failed to fetch quotes:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        if (this.loading) this.loading.set(false);
      }
    } else {
      console.warn('BuyerDashboard: No user found on init.');
      if (this.loading) this.loading.set(false);
    }
  }

  getServiceIcon(serviceType: string): string {
    const map: Record<string, string> = {
      // Solar
      'solar': 'wb_sunny',
      'solar-panels': 'wb_sunny',
      // Batteries
      'battery': 'battery_charging_full',
      'battery-storage': 'battery_charging_full',
      // Heat pumps
      'heat-pump': 'heat_pump',
      'heat-pumps': 'heat_pump',
      // EV
      'ev-charger': 'ev_station',
      'ev-charging': 'ev_station',
      // Insulation
      'insulation': 'thermostat',
      // Air conditioning — match 'aircon', 'air con', 'air conditioning', 'air-conditioning'
      'air-conditioning': 'ac_unit',
      'air-con': 'ac_unit',
      'aircon': 'ac_unit',
      // Water filter
      'water-filter': 'water_drop',
      'water-filters': 'water_drop',
      'water': 'water_drop',
      'water-purifier': 'water_drop',
      // Plumbing
      'plumbing': 'plumbing',
      // Electrical
      'electrical': 'bolt',
      // Gas
      'gas': 'local_fire_department',
      'gas-heating': 'local_fire_department',
    };
    const key = (serviceType || '').toLowerCase().replace(/[\s_]+/g, '-');
    return map[key] || 'home_repair_service';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      'open': 'indigo',
      'responded': 'green',
      'negotiating': 'amber',
      'accepted': 'green',
      'completed': 'green',
    };
    return map[(status || '').toLowerCase()] || 'indigo';
  }
}

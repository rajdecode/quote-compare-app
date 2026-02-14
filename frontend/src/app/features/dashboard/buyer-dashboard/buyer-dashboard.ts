import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-buyer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
        const token = await user.getIdToken();
        const role = this.authService.userRole() || 'buyer';
        console.log('Fetching quotes for Buyer:', user.uid, 'Role:', role);

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
}

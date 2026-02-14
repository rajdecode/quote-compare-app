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
  // Initialize signals with default values
  quotes = signal<any[]>([]);
  loading = signal<boolean>(true);
  expandedQuotes = signal<Set<string>>(new Set());

  authService = inject(AuthService);

  constructor() {
    // Defensive check: Ensure signals are initialized
    if (!this.quotes) this.quotes = signal([]);
    if (!this.loading) this.loading = signal(true);
    if (!this.expandedQuotes) this.expandedQuotes = signal(new Set());
  }

  toggleExpand(quoteId: string) {
    // Safety check
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
    // User safety check
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
            if (this.quotes) {
              this.quotes.set(data);
            } else {
              console.error('CRITICAL: this.quotes signal was null. Re-initializing.');
              this.quotes = signal(data);
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

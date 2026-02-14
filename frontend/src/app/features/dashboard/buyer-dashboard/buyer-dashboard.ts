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
  quotes = signal<any[]>([]);
  loading = signal<boolean>(true);
  expandedQuotes = signal<Set<string>>(new Set());
  authService = inject(AuthService);

  toggleExpand(quoteId: string) {
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
    // Ensure we give auth a moment if it's just initializing (though guard should prevent this)
    // But safely handle the null user case to avoid infinite loading
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
          console.log('Buyer Quote Data Received:', data);

          if (Array.isArray(data)) {
            console.log('Sorting', data.length, 'quotes');
            data.forEach((quote: any) => {
              if (quote.responses && Array.isArray(quote.responses)) {
                quote.responses.sort((a: any, b: any) => a.price - b.price);
              }
            });
            this.quotes.set(data);
          } else {
            console.error('Invalid quotes data format (not array):', data);
          }
        } else {
          console.error('Failed to fetch quotes. Status:', response.status, 'Text:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        this.loading.set(false);
      }
    } else {
      console.warn('BuyerDashboard: No user found on init.');
      this.loading.set(false);
    }
  }
}

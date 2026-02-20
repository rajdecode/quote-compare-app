import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vendor-dashboard.html',
  styleUrls: ['./vendor-dashboard.scss']
})
export class VendorDashboard {
  quotes = signal<any[]>([]);
  loading = signal<boolean>(true);
  quotesSentCount = signal<number>(0);
  authService = inject(AuthService);
  private router = inject(Router);

  // Tabs & Computed Lists
  activeTab = signal<'new' | 'sent' | 'action' | 'completed'>('new');
  newRequests = signal<any[]>([]);
  sentQuotes = signal<any[]>([]);
  actionRequiredQuotes = signal<any[]>([]);
  completedQuotes = signal<any[]>([]);

  hasResponded(quote: any): boolean {
    const user = this.authService.currentUser();
    if (!user || !quote.responses) return false;
    return quote.responses.some((r: any) => r.vendor_id === user.id);
  }

  getMyResponse(quote: any): any {
    const user = this.authService.currentUser();
    if (!user || !quote.responses) return null;
    return quote.responses.find((r: any) => r.vendor_id === user.id);
  }

  async ngOnInit() {
    this.loading.set(true);
    const user = this.authService.currentUser();
    console.log('VendorDashboard Init. User:', user);

    if (user) {
      try {
        const token = await this.authService.getToken();
        const role = this.authService.userRole() || 'vendor';
        console.log('Fetching quotes with Role:', role);

        const response = await fetch(`${environment.apiUrl}/quotes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Mock-Role': role
          },
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          this.quotes.set(data);

          // Calculate Quotes Sent & Filter Lists
          const vendorId = user.id;

          // Awaiting Response: Only 'responded' status (Mutually exclusive from Action Required)
          this.sentQuotes.set(data.filter((q: any) =>
            q.responses?.some((r: any) => r.vendor_id === vendorId && r.status === 'responded')
          ));

          this.newRequests.set(data.filter((q: any) =>
            !q.responses?.some((r: any) => r.vendor_id === vendorId)
          ));

          // Action Required: Accepted or Negotiating
          this.actionRequiredQuotes.set(data.filter((q: any) =>
            q.responses?.some((r: any) => r.vendor_id === vendorId && (r.status === 'accepted' || r.status === 'negotiating'))
          ));

          // Completed Quotes
          this.completedQuotes.set(data.filter((q: any) =>
            q.responses?.some((r: any) => r.vendor_id === vendorId && r.status === 'completed')
          ));

          this.quotesSentCount.set(this.sentQuotes().length);

        } else {
          console.error('Fetch failed:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        this.loading.set(false);
      }
    } else {
      console.warn('No user found in AuthService');
      this.loading.set(false);
    }
  }

  setActiveTab(tab: 'new' | 'sent' | 'action' | 'completed') {
    this.activeTab.set(tab);
  }

  respondToQuote(quoteId: string) {
    this.router.navigate(['/vendor/respond', quoteId]);
  }

  editQuote(quoteId: string) {
    this.router.navigate(['/vendor/respond', quoteId], { queryParams: { edit: 'true' } });
  }

  updateServiceArea() {
    alert('Service Area updates coming soon! For now, you will see all requests.');
  }

  hasAcceptedResponse(quote: any): boolean {
    const user = this.authService.currentUser();
    if (!user || !quote.responses) return false;
    return quote.responses.some((r: any) => r.vendor_id === user.id && r.status === 'accepted');
  }

  isCompleted(quote: any): boolean {
    const user = this.authService.currentUser();
    if (!user || !quote.responses) return false;
    return quote.responses.some((r: any) => r.vendor_id === user.id && r.status === 'completed');
  }

  async completeJob(quote: any) {
    const invoiceUrl = prompt('Please enter the URL for the invoice (e.g., Google Drive link):');
    if (!invoiceUrl) return;

    try {
      const user = this.authService.currentUser();
      if (!user) return;
      const token = await this.authService.getToken();

      const response = await fetch(`${environment.apiUrl}/quotes/${quote.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceUrl })
      });

      if (response.ok) {
        alert('Job completed and invoice submitted!');
        this.ngOnInit(); // Reload
      } else {
        const err = await response.json();
        alert('Failed to complete job: ' + (err.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error completing job:', error);
      alert('Error completing job.');
    }
  }

  getServiceIcon(serviceType: string): string {
    const map: Record<string, string> = {
      'solar': 'wb_sunny',
      'heat-pump': 'heat_pump',
      'battery': 'battery_charging_full',
      'ev-charger': 'ev_station',
      'insulation': 'thermostat',
      'air-conditioning': 'ac_unit',
    };
    const key = (serviceType || '').toLowerCase().replace(/\s+/g, '-');
    return map[key] || 'build';
  }
}

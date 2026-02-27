import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { SuccessModalComponent } from '../../../core/components/modals/success-modal';
import { CompleteJobModalComponent } from '../../../core/components/modals/complete-job-modal';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SuccessModalComponent, CompleteJobModalComponent],
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

  // Expanded Card State
  expandedQuoteId = signal<string | null>(null);

  // Modal States
  showCompleteModal = signal<boolean>(false);
  showSuccessModal = signal<boolean>(false);
  successMessage = signal<string>('');
  pendingCompleteQuote = signal<any>(null);
  invoiceUrlInput = signal<string>('');

  toggleCard(quoteId: string) {
    if (this.expandedQuoteId() === quoteId) {
      this.expandedQuoteId.set(null);
    } else {
      this.expandedQuoteId.set(quoteId);
    }
  }

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

  initiateCompleteJob(quote: any) {
    this.pendingCompleteQuote.set(quote);
    this.invoiceUrlInput.set('');
    this.showCompleteModal.set(true);
  }

  cancelCompleteJob() {
    this.showCompleteModal.set(false);
    this.pendingCompleteQuote.set(null);
    this.invoiceUrlInput.set('');
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.ngOnInit(); // Reload
  }

  async confirmCompleteJob(invoiceUrl: string) {
    const quote = this.pendingCompleteQuote();

    if (!quote || !invoiceUrl.trim()) return;

    try {
      const token = await this.authService.getToken();
      if (!token) return;

      const response = await fetch(`${environment.apiUrl}/quotes/${quote.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceUrl })
      });

      if (response.ok) {
        this.showCompleteModal.set(false);
        this.successMessage.set('Job completed and invoice submitted to the buyer!');
        this.showSuccessModal.set(true);
      } else {
        const err = await response.json();
        alert('Backend Error: ' + (err.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error completing job:', error);
      alert('Network Error: ' + (error.message || 'Unknown error'));
    } finally {
      this.pendingCompleteQuote.set(null);
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
      // Water filter / Water
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
}

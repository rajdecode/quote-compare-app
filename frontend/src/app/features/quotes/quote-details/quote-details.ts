import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-quote-details',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './quote-details.html',
    styleUrls: ['./quote-details.scss']
})
export class QuoteDetails implements OnInit {
    quote = signal<any>(null);
    quoteId: string | null = null;
    loading = signal<boolean>(true);

    // Negotiation Form State
    activeNegotiationId = signal<string | null>(null);
    negotiatePrice = signal<number | null>(null);
    negotiateMessage = signal<string>('');

    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    async ngOnInit() {
        const quoteId = this.route.snapshot.paramMap.get('quoteId');
        this.quoteId = this.route.snapshot.paramMap.get('quoteId');
        if (!this.quoteId) return;

        const token = await this.authService.getToken();
        if (token) {
            try {
                const response = await fetch(`${environment.apiUrl}/quotes/${this.quoteId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const found = await response.json();
                    console.log('Quote Details fetched:', found);
                    if (found && found.responses) {
                        console.log('Offers/Responses:', found.responses);
                        found.responses.sort((a: any, b: any) => a.price - b.price);
                    }
                    this.quote.set(found);
                }
            } catch (error) {
                console.error('Error fetching quote:', error);
            } finally {
                this.loading.set(false);
            }
        } else {
            this.loading.set(false);
        }
    }

    openNegotiationForm(vendorId: string) {
        this.activeNegotiationId.set(vendorId);
        this.negotiatePrice.set(null);
        this.negotiateMessage.set('');
    }

    cancelNegotiation() {
        this.activeNegotiationId.set(null);
        this.negotiatePrice.set(null);
        this.negotiateMessage.set('');
    }

    async updateStatus(response: any, status: 'accepted' | 'negotiating') {
        let message = '';

        if (status === 'negotiating') {
            // Combine price and details from the form
            const price = this.negotiatePrice();
            const details = this.negotiateMessage();
            if (!details && !price) {
                alert('Please provide a proposed price or additional details.');
                return;
            }

            if (price) {
                message = `Proposed Price: $${price}\n\n${details}`;
            } else {
                message = details;
            }
        } else {
            message = 'Quote accepted. Please proceed with the job.';
        }

        try {
            const token = await this.authService.getToken();
            if (!token) return;

            const res = await fetch(`${environment.apiUrl}/quotes/${this.quoteId}/responses/${response.vendor_id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, message })
            });

            if (res.ok) {
                alert(`Quote ${status} successfully!`);
                this.cancelNegotiation();
                // Reload data
                this.ngOnInit();
            } else {
                const err = await res.text();
                console.error('Failed to update status:', err);
                alert('Failed to update status.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status.');
        }
    }

    getServiceIcon(serviceType: string): string {
        const icons: Record<string, string> = {
            'heat pumps': 'heat_pump',
            'solar': 'solar_power',
            'batteries': 'battery_charging_full',
            'air conditioning': 'ac_unit',
            'water heating': 'water_heater',
        };
        return icons[serviceType?.toLowerCase()] ?? 'home_repair_service';
    }
}

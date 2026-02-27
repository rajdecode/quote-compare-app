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

    // Modal State
    showConfirmModal = signal<boolean>(false);
    showSuccessModal = signal<boolean>(false);
    successMessage = signal<string>('');
    pendingAction = signal<any>(null);

    // Comparison State
    showComparison = signal<boolean>(false);

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
                        this.generateComparison(found.responses);
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

    generateComparison(responses: any[]) {
        if (!responses || responses.length < 2) return;

        const lowestPrice = Math.min(...responses.map((r: any) => r.price));
        const highestPrice = Math.max(...responses.map((r: any) => r.price));

        responses.forEach((response: any) => {
            response.pros = [];
            response.cons = [];

            if (response.price === lowestPrice) {
                response.pros.push('Lowest Price');
            } else if (response.price === highestPrice) {
                response.cons.push('Highest Price');
            } else {
                response.pros.push('Competitive Mid-Range Price');
            }

            if (response.message && response.message.length > 50) {
                response.pros.push('Detailed Proposal');
            } else if (!response.message || response.message.length < 15) {
                response.cons.push('Minimal details provided');
            } else {
                response.pros.push('Direct communication');
            }
        });
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

    async initiateStatusUpdate(response: any, status: 'accepted' | 'negotiating') {
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

        this.pendingAction.set({ response, status, message });
        this.showConfirmModal.set(true);
    }

    cancelConfirm() {
        this.showConfirmModal.set(false);
        this.pendingAction.set(null);
    }

    closeSuccessModal() {
        this.showSuccessModal.set(false);
        this.ngOnInit(); // Reload data after closing success modal
    }

    async confirmStatusUpdate() {
        const action = this.pendingAction();
        if (!action) return;

        this.showConfirmModal.set(false);

        try {
            const token = await this.authService.getToken();
            if (!token) return;

            const res = await fetch(`${environment.apiUrl}/quotes/${this.quoteId}/responses/${action.response.vendor_id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: action.status, message: action.message })
            });

            if (res.ok) {
                this.cancelNegotiation();

                // Set appropriate beautiful success message
                if (action.status === 'accepted') {
                    this.successMessage.set('Offer accepted and sent to the seller!');
                } else {
                    this.successMessage.set('Counter offer successfully sent to the seller!');
                }

                this.showSuccessModal.set(true);
            } else {
                const err = await res.text();
                console.error('Failed to update status:', err);
                alert('Backend Error: ' + err);
            }
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Network Error: ' + (error.message || 'Unknown error'));
        } finally {
            this.pendingAction.set(null);
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

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-quote-details',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './quote-details.html',
    styleUrls: ['./quote-details.scss']
})
export class QuoteDetails implements OnInit {
    quote = signal<any>(null);
    quoteId: string | null = null;
    loading = signal<boolean>(true);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    async ngOnInit() {
        const quoteId = this.route.snapshot.paramMap.get('quoteId');
        this.quoteId = this.route.snapshot.paramMap.get('quoteId');
        if (!this.quoteId) return;

        const user = this.authService.currentUser();
        if (user) {
            try {
                const token = await user.getIdToken();
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
        }
    }

    async updateStatus(response: any, status: 'accepted' | 'negotiating') {
        let message = '';
        if (status === 'negotiating') {
            const result = prompt('Enter your message to the vendor (e.g., asking for a lower price or changes):');
            if (result === null) return; // Cancelled
            message = result;
        } else if (status === 'accepted') {
            if (!confirm(`Are you sure you want to accept this quote for $${response.price}?`)) return;
        }

        try {
            const user = this.authService.currentUser();
            if (!user) return;
            const token = await user.getIdToken();

            const res = await fetch(`${environment.apiUrl}/quotes/${this.quoteId}/responses/${response.vendorId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, message })
            });

            if (res.ok) {
                alert('Status updated successfully!');
                this.ngOnInit(); // Reload
            } else {
                alert('Failed to update status.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status.');
        }
    }
}

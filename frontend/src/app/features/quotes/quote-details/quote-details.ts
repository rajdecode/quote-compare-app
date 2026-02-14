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

                    if (found) {
                        if (found.responses) {
                            found.responses.sort((a: any, b: any) => a.price - b.price);
                        }
                        this.quote.set(found);
                    }
                }
            } catch (error) {
                console.error('Error fetching quote:', error);
            } finally {
                this.loading.set(false);
            }
        }
    }
}

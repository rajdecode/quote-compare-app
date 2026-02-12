import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-request-quote',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './request-quote.html',
    styleUrls: ['./request-quote.scss']
})
export class RequestQuote {
    serviceType = 'heat-pump';
    postalCode = '';
    details = '';
    email = '';
    loading = false;
    authService = inject(AuthService);

    constructor(private router: Router) { }

    async onSubmit() {
        this.loading = true;

        try {
            const user = this.authService.currentUser();
            let token = '';

            if (user) {
                token = await user.getIdToken();
            } else if (!this.email) {
                alert('Please provide an email address for your quote.');
                this.loading = false;
                return;
            }

            const headers: any = {
                'Content-Type': 'application/json',
                'X-Mock-Role': 'guest' // Explicitly set role for mock DB testing
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${environment.apiUrl}/quotes`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    serviceType: this.serviceType,
                    postalCode: this.postalCode,
                    details: this.details,
                    email: this.email // Send email (backend will prefer auth email if present)
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error('Failed to submit quote request: ' + errText);
            }

            const data = await response.json();
            console.log('Quote created:', data);

            if (user) {
                alert('Quote request submitted successfully!');
                this.router.navigate(['/buyer']);
            } else {
                alert('Quote request submitted! Check your email for confirmation.');
                this.router.navigate(['/']); // Go to landing page
            }
        } catch (error) {
            console.error('Error submitting quote:', error);
            alert('Error submitting quote. Please try again.');
        } finally {
            this.loading = false;
        }
    }
}

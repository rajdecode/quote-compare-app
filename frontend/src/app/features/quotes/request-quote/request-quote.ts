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
    suburb = '';
    details = '';
    email = '';
    loading = false;
    authService = inject(AuthService);

    attachments: string[] = [];
    isUploading = false;
    uploadError = '';

    submissionSuccess = false;
    submittedQuoteId = '';

    constructor(private router: Router) { }

    async copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            alert('Quote ID copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }

    async onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('File size too large. Max 5MB.');
            return;
        }

        this.isUploading = true;
        this.uploadError = '';

        try {
            const user = this.authService.currentUser();
            // If no user, we can't upload to RLS protected bucket easily without a public folder or anon policy.
            // My policy says "Authenticated Upload".
            // So Guest upload will fail unless I change policy.
            // For now, let's assume User is required for file upload or I'll catch error.

            if (!user) {
                alert('You must be logged in to upload files.');
                this.isUploading = false;
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const client = this.authService.getClient();

            const { data, error } = await client.storage
                .from('quote-files')
                .upload(fileName, file);

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = client.storage
                .from('quote-files')
                .getPublicUrl(fileName);

            this.attachments = [publicUrl]; // Single file for now
            console.log('File uploaded:', publicUrl);

        } catch (error) {
            console.error('Upload failed:', error);
            this.uploadError = 'Upload failed. Please try again.';
        } finally {
            this.isUploading = false;
        }
    }

    async onSubmit() {
        this.loading = true;

        try {
            const user = this.authService.currentUser();
            let token = '';

            if (user) {
                token = await this.authService.getToken() || '';
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
                    suburb: this.suburb,
                    details: this.details,
                    email: this.email,
                    attachments: this.attachments
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
                // Show success screen with ID instead of alerting and routing immediately
                this.submissionSuccess = true;
                this.submittedQuoteId = data.id;
            }
        } catch (error) {
            console.error('Error submitting quote:', error);
            alert('Error submitting quote. Please try again.');
        } finally {
            this.loading = false;
        }
    }
}

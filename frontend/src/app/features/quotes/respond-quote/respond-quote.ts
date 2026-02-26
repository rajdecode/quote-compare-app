import { Component, inject, effect, untracked, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-respond-quote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './respond-quote.html',
  styleUrl: './respond-quote.scss',
})
export class RespondQuote {
  quote: any = null;
  currentResponse: any = null;
  quoteId = '';
  price: number | null = null;
  message = '';
  isEditMode = false;

  // Separate loading states
  isLoadingData = false;
  isSubmitting = false;
  showSuccessModal = signal<boolean>(false);
  successMessage = signal<string>('');

  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.quoteId = this.route.snapshot.paramMap.get('quoteId') || '';

    // React to user changes
    this.route.queryParams.subscribe(params => {
      this.isEditMode = params['edit'] === 'true';
    });

    // Use an effect to load data once user is available
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.isLoadingData) {
        // Load data regardless of edit mode to show context
        untracked(() => {
          this.loadQuoteData();
        });
      }
    });
  }

  async loadQuoteData() {
    this.isLoadingData = true;
    const user = this.authService.currentUser();
    if (!user) {
      this.isLoadingData = false;
      return;
    }

    try {
      const token = await this.authService.getToken();
      // Fetch specific quote
      const response = await fetch(`${environment.apiUrl}/quotes/${this.quoteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.quote = await response.json();

        if (this.quote) {
          const myResponse = this.quote.responses?.find((r: any) => r.vendor_id === user.id);

          if (myResponse) {
            this.currentResponse = myResponse;
            this.price = myResponse.price;
            this.message = myResponse.message;
            // If we found a response, we are effectively in edit/negotiation mode
            this.isEditMode = true;
          }
        }
      }
    } catch (e) {
      console.error('Error loading quote data', e);
    } finally {
      this.isLoadingData = false;
      this.cdr.markForCheck();
    }
  }

  async onSubmit() {
    if (!this.price || !this.message) return;

    this.isSubmitting = true;
    const user = this.authService.currentUser();

    if (!user) {
      this.isSubmitting = false;
      return;
    }

    try {
      const token = await this.authService.getToken();
      const role = this.authService.userRole() || 'vendor';

      const method = this.isEditMode ? 'PUT' : 'POST';
      const url = `${environment.apiUrl}/quotes/${this.quoteId}/respond`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Mock-Role': role
        },
        body: JSON.stringify({
          price: this.price,
          message: this.message
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submission failed. Status:', response.status, 'Body:', errorText);
        throw new Error(`Failed to submit: ${response.status} ${response.statusText}`);
      }

      this.successMessage.set(this.isEditMode ? 'Quote updated successfully!' : 'Quote submitted successfully!');
      this.showSuccessModal.set(true);
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Error submitting response.');
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel() {
    this.router.navigate(['/vendor']);
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.router.navigate(['/vendor']);
  }
}

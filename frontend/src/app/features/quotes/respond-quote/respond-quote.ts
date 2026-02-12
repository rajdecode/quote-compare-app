import { Component, inject, effect, untracked, ChangeDetectorRef } from '@angular/core';
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
  quoteId = '';
  price: number | null = null;
  message = '';
  isEditMode = false;

  // Separate loading states
  isLoadingData = false;
  isSubmitting = false;

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
      if (user && this.isEditMode && !this.isLoadingData) {
        // decouple execution to avoid signal error
        untracked(() => {
          this.loadExistingResponse();
        });
      }
    });
  }

  async loadExistingResponse() {
    this.isLoadingData = true;
    const user = this.authService.currentUser();
    if (!user) {
      this.isLoadingData = false;
      return;
    }

    try {
      const token = await user.getIdToken();
      // Fetch quote to find our response
      const response = await fetch(`${environment.apiUrl}/quotes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const quotes = await response.json();
        const quote = quotes.find((q: any) => q.id === this.quoteId);

        if (quote) {
          const myResponse = quote.responses?.find((r: any) => r.vendorId === user.uid);

          if (myResponse) {
            this.price = myResponse.price;
            this.message = myResponse.message;

            // Force UI update
            this.isLoadingData = false;
            this.cdr.detectChanges();
          }
        }
      }
    } catch (e) {
      console.error('Error loading existing response', e);
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
      const token = await user.getIdToken();
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

      alert(this.isEditMode ? 'Quote updated successfully!' : 'Quote submitted successfully!');
      this.router.navigate(['/vendor']);
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
}

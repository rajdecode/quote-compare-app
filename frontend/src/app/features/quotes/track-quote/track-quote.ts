import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-track-quote',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './track-quote.html',
  styleUrls: ['./track-quote.scss']
})
export class TrackQuote implements OnInit {
  quoteId = '';
  quote: any = null;
  loading = false;
  error = '';
  expandedCardId: string | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService); // Inject AuthService for renegotiation checks

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        console.log('Route param ID:', id);
        this.quoteId = id;
        this.trackQuote();
      }
    });
  }

  trackQuote() {
    if (!this.quoteId) return;

    this.loading = true;
    this.error = '';
    this.quote = null;
    this.cd.detectChanges(); // Force update UI to show loading state

    console.log('Tracking quote (HTTP):', this.quoteId);

    // Using explicit backend URL for verification
    this.http.get<any>(`${environment.apiUrl}/quotes/${this.quoteId}`)
      .subscribe({
        next: (data) => {
          console.log('Quote Loaded:', data);
          this.quote = data;
          this.loading = false;
          this.cd.detectChanges(); // Force update UI
        },
        error: (err) => {
          console.error('Track Quote Error:', err);
          this.error = err.error?.error || 'Failed to load quote. Please check the ID.';
          this.loading = false;
          this.cd.detectChanges(); // Force update UI
        }
      });
  }

  toggleCard(responseId: string) {
    if (this.expandedCardId === responseId) {
      this.expandedCardId = null; // Close if already open
    } else {
      this.expandedCardId = responseId; // Open new card
    }
  }

  isGuest(): boolean {
    return !this.authService.currentUser();
  }

  signupToNegotiate() {
    // Specifically route to register, with a return URL to the quote dashboard
    this.router.navigate(['/auth/register'], {
      queryParams: {
        returnUrl: `/buyer/quote/${this.quote.id || this.quoteId}`
      }
    });
  }

  goToNegotiation() {
    this.router.navigate(['/buyer/quote', this.quote.id || this.quoteId]);
  }
}

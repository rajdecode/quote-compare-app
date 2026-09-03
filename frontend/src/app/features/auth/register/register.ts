import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  name = '';
  email = '';
  password = '';
  role = 'buyer'; // Default role
  plan = '';
  loading = false;
  errorMessage = '';
  returnUrl: string | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    if (this.router.url.includes('supplier') || this.router.url.includes('contractor')) {
      this.role = 'vendor';
    }
    this.route.queryParams.subscribe(params => {
      if (params['plan'] || params['role'] === 'vendor') {
        if (params['plan']) this.plan = params['plan'];
        this.role = 'vendor';
      }
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
    });
  }

  async onSubmit() {
    console.log('Attempting registration with:', this.email);
    this.loading = true;
    this.errorMessage = '';

    try {
      const { user, session } = await this.authService.register(this.email, this.password, this.name, this.role, this.plan);
      console.log('Registration successful', user);

      // Check if session exists (Email confirmation might be required)
      if (session) {
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else if (this.role === 'buyer') {
          this.router.navigate(['/buyer']);
        } else {
          this.router.navigate(['/vendor']);
        }
      } else {
        // No session means email confirmation is required
        this.errorMessage = 'Account created! Please check your email to confirm your account before logging in.';
        this.loading = false; // Stop loading spinner
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.errorMessage = error.message || 'An error occurred during registration.';
    } finally {
      this.loading = false;
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="login-page">
        <!-- LEFT PANEL — Branding -->
        <div class="login-left" aria-hidden="true">
            <div class="orb orb-1"></div>
            <div class="orb orb-2"></div>
            <div class="orb orb-3"></div>

            <div class="brand-content">
                <div class="brand-logo">
                    <span class="material-icons">bolt</span>
                </div>
                <h1 class="brand-name"><span>Procure</span> Now</h1>
                <p class="brand-tagline">Compare Australian clean energy &amp; rebate-eligible quotes instantly.</p>
                
                <div class="feature-list" style="margin-top: 2rem;">
                    <div class="feature-item">
                        <span class="material-icons">lock_reset</span>
                        <span>Secure password recovery</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT PANEL — Form -->
        <div class="login-right">
            <div class="form-container">

                <div class="form-header">
                    <h2>Reset Password</h2>
                    <p>Enter your email to receive a reset link</p>
                </div>

                @if (successMessage()) {
                    <div class="success-banner" style="background: #ECFDF5; color: #065F46; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border: 1px solid #A7F3D0;">
                        <span class="material-icons" style="color: #10B981;">check_circle</span>
                        {{ successMessage() }}
                    </div>
                    <a routerLink="/login" class="btn-signin" style="text-align: center; display: block; text-decoration: none;">Back to Login</a>
                } @else {
                    <form (ngSubmit)="onSubmit()" class="login-form">
                        
                        <div class="field-group">
                            <label class="field-label" for="email">Email address</label>
                            <div class="input-wrapper">
                                <span class="field-icon material-icons">mail_outline</span>
                                <input type="email" id="email" [(ngModel)]="email" name="email" required
                                    placeholder="you@example.com" autocomplete="email" />
                            </div>
                        </div>

                        @if (errorMessage()) {
                        <div class="error-banner">
                            <span class="material-icons">error_outline</span>
                            {{ errorMessage() }}
                        </div>
                        }

                        <button type="submit" class="btn-signin" [class.loading]="loading()" [disabled]="loading()">
                            @if (!loading()) {
                                <span>Send Reset Link <span class="material-icons">send</span></span>
                            }
                            @if (loading()) {
                                <span class="spinner-wrap">
                                    <span class="spinner"></span> Sending...
                                </span>
                            }
                        </button>
                        
                    </form>

                    <div class="form-footer">
                        <span>Remembered your password?</span>
                        <a routerLink="/login">Sign In</a>
                    </div>
                }

                <p class="version-tag">v1.5.11</p>
            </div>
        </div>
    </div>
  `,
    styleUrls: ['../login/login.scss'] // Reuse login styles
})
export class ForgotPassword {
    authService = inject(AuthService);
    email = '';
    loading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    async onSubmit() {
        console.log('Forgot Password: Submit clicked. Email:', this.email);
        if (!this.email) {
            console.warn('Forgot Password: No email entered.');
            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        try {
            console.log('Forgot Password: Sending reset email to', this.email);
            // AuthService needs to have this method implemented for Supabase
            await this.authService.resetPassword(this.email);
            console.log('Forgot Password: Email sent successfully.');
            this.successMessage.set('Check your email for the password reset link.');
        } catch (error: any) {
            console.error('Forgot Password: Reset error:', error);
            this.errorMessage.set(error.message || 'Failed to send reset email. Please try again.');
        } finally {
            this.loading.set(false);
            console.log('Forgot Password: Loading set to false.');
        }
    }
}

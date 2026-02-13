import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="auth-page">
        <div class="auth-card glass-panel">
            <h2>Reset Password</h2>
            <p class="subtitle">Enter your email to receive a reset link</p>
            
            @if (successMessage()) {
                <div class="alert success">{{ successMessage() }}</div>
                <a routerLink="/login" class="btn btn-secondary btn-block">Back to Login</a>
            } @else {
                <form (ngSubmit)="onSubmit()">
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" [(ngModel)]="email" name="email" required placeholder="you@example.com">
                    </div>
    
                    @if (errorMessage()) {
                        <div class="alert error">{{ errorMessage() }}</div>
                    }
    
                    <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
                        {{ loading() ? 'Sending...' : 'Send Reset Link' }}
                    </button>
                    
                    <div class="auth-links">
                        <a routerLink="/login">Back to Login</a>
                    </div>
                </form>
            }
        </div>
    </div>
  `,
    styleUrls: ['../login/login.scss'] // Reuse login styles
})
export class ForgotPassword {
    email = '';
    loading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    async onSubmit() {
        if (!this.email) return;

        this.loading.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        try {
            await sendPasswordResetEmail(auth, this.email);
            this.successMessage.set('Check your email for the password reset link.');
        } catch (error: any) {
            console.error('Reset error:', error);
            this.errorMessage.set(this.getErrorMessage(error.code));
        } finally {
            this.loading.set(false);
        }
    }

    getErrorMessage(code: string): string {
        switch (code) {
            case 'auth/user-not-found': return 'No user found with this email.';
            case 'auth/invalid-email': return 'Invalid email address.';
            default: return 'Failed to send reset email. Please try again.';
        }
    }
}

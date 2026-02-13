import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="container page-content">
        <div class="auth-card glass-panel" style="max-width: 500px; margin: 0 auto;">
            <h2>Change Password</h2>
            <p class="subtitle">Secure your account with a new password.</p>
            
            <form (ngSubmit)="onSubmit()">
                <div class="form-group">
                    <label for="currentPassword">Current Password (Required)</label>
                    <input type="password" id="currentPassword" [(ngModel)]="currentPassword" name="currentPassword" required>
                </div>

                <div class="form-group">
                    <label for="newPassword">New Password</label>
                    <input type="password" id="newPassword" [(ngModel)]="newPassword" name="newPassword" required minlength="6">
                </div>

                <div class="form-group">
                    <label for="confirmPassword">Confirm New Password</label>
                    <input type="password" id="confirmPassword" [(ngModel)]="confirmPassword" name="confirmPassword" required minlength="6">
                </div>

                @if (errorMessage()) {
                    <div class="alert error">{{ errorMessage() }}</div>
                }

                @if (successMessage()) {
                    <div class="alert success">{{ successMessage() }}</div>
                }

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
                        {{ loading() ? 'Updating...' : 'Update Password' }}
                    </button>
                    <button type="button" class="btn btn-secondary btn-block" (click)="goBack()">Cancel</button>
                </div>
            </form>
        </div>
    </div>
  `,
    styles: [`
    .page-content { padding-top: 8rem; }
    .auth-card { padding: 2rem; border-radius: 16px; }
    h2 { text-align: center; margin-bottom: 0.5rem; color: var(--text-heading); }
    .subtitle { text-align: center; color: var(--text-dim); margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; color: var(--text-body); font-weight: 500; }
    input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1); }
    .btn-block { width: 100%; margin-top: 1rem; }
    .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .alert.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  `]
})
export class ChangePassword {
    authService = inject(AuthService);
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    loading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    async onSubmit() {
        this.loading.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        if (this.newPassword !== this.confirmPassword) {
            this.errorMessage.set('New passwords do not match.');
            this.loading.set(false);
            return;
        }

        const user = this.authService.currentUser();
        if (!user || !user.email) {
            this.errorMessage.set('No user logged in.');
            this.loading.set(false);
            return;
        }

        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, this.currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Update Password
            await updatePassword(user, this.newPassword);

            this.successMessage.set('Password updated successfully!');
            this.currentPassword = '';
            this.newPassword = '';
            this.confirmPassword = '';
        } catch (error: any) {
            console.error('Update password error:', error);
            if (error.code === 'auth/wrong-password') {
                this.errorMessage.set('Incorrect current password.');
            } else {
                this.errorMessage.set('Failed to update password. Please try again.');
            }
        } finally {
            this.loading.set(false);
        }
    }

    goBack() {
        window.history.back();
    }
}

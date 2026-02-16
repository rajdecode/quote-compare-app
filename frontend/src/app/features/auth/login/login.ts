import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  async onSubmit() {
    console.log('Attempting login with:', this.email);
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);
      console.log('Login successful');
      // Redirect is handled in AuthService, but we should reset loading just in case
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error.message || 'An error occurred during login.';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.loading = false;
    this.errorMessage = 'Login cancelled by user.';
  }

  async testConnection() {
    this.errorMessage = 'Testing (Raw Fetch)...';
    try {
      const supabaseUrl = 'https://ilichjxywepoedtzfvyj.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaWNoanh5d2Vwb2VkdHpmdnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTY0NDMsImV4cCI6MjA4NjgzMjQ0M30.6rKfV1C4MCbZEK0D0EeodkBildzVNZwlvhIZbmVEYps';

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (!response.ok) throw new Error(`Status: ${response.status} ${response.statusText}`);

      const text = await response.text();
      console.log('Raw Fetch Result:', text);
      this.errorMessage = `Connection OK! (Raw: ${text})`;
    } catch (err: any) {
      console.error('Raw Fetch Error:', err);
      this.errorMessage = 'Connection Failed: ' + (err.message || JSON.stringify(err));
    }
  }
}

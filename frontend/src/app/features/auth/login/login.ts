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
}

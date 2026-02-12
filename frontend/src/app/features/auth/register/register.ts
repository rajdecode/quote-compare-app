import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
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
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  async onSubmit() {
    console.log('Attempting registration with:', this.email);
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.register(this.email, this.password, this.name, this.role);
      console.log('Registration successful');
      if (this.role === 'buyer') {
        this.router.navigate(['/buyer']);
      } else {
        this.router.navigate(['/vendor']);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.errorMessage = error.message || 'An error occurred during registration.';
    } finally {
      this.loading = false;
    }
  }
}

import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
    authService = inject(AuthService);
    router = inject(Router);
    currentUser = this.authService.currentUser;

    constructor() {
        effect(() => {
            const user = this.authService.currentUser();
            if (user) {
                const role = this.authService.userRole();
                if (role === 'vendor') {
                    this.router.navigate(['/vendor']);
                } else if (role === 'admin') {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/buyer']);
                }
            }
        });
    }
}

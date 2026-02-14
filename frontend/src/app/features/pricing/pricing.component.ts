import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-pricing',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './pricing.component.html',
    styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit {
    authService = inject(AuthService);
    router = inject(Router);

    ngOnInit() {
        const role = this.authService.userRole();
        if (role === 'buyer') {
            this.router.navigate(['/buyer']);
        }
        // If not logged in, authGuard handles it.
    }

    plans = [
        {
            name: 'Trial',
            price: 'Free',
            period: '7 days',
            description: 'Perfect for new vendors to try the platform.',
            features: [
                'Access to 3 Quotes',
                'Valid for 7 Days',
                'All Categories',
                'Basic Support'
            ],
            cta: 'Start Free Trial',
            link: '/register?plan=trial',
            highlight: false
        },
        {
            name: 'Basic',
            price: '$99',
            period: '/month',
            description: 'Essential access for specialized vendors.',
            features: [
                'Unlimited Quotes',
                'Heat Pumps & Batteries Only',
                'Vendor Dashboard',
                'Email Notifications'
            ],
            cta: 'Subscribe Now',
            link: '/register?plan=values', // 'values' mapped to basic in backend if needed, or just strict param
            highlight: false
        },
        {
            name: 'Pro',
            price: '$199',
            period: '/month',
            description: 'Unlimited access to grow your business.',
            features: [
                'Unlimited Quotes',
                'All Categories (Aircons, Water Filters, etc)',
                'Priority Support',
                'Advanced Analytics'
            ],
            cta: 'Go Pro',
            link: '/register?plan=pro',
            highlight: true
        }
    ];
}

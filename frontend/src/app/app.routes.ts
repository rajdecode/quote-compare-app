import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { BuyerDashboard } from './features/dashboard/buyer-dashboard/buyer-dashboard';
import { VendorDashboard } from './features/dashboard/vendor-dashboard/vendor-dashboard';
import { AdminDashboard } from './features/dashboard/admin-dashboard/admin-dashboard';
import { authGuard } from './core/guards/auth.guard';

import { RequestQuote } from './features/quotes/request-quote/request-quote';
import { RespondQuote } from './features/quotes/respond-quote/respond-quote';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'buyer', component: BuyerDashboard, canActivate: [authGuard] },
    { path: 'buyer/quote/:quoteId', loadComponent: () => import('./features/quotes/quote-details/quote-details').then(m => m.QuoteDetails), canActivate: [authGuard] },
    { path: 'request-quote', component: RequestQuote }, // Public access allowed
    { path: 'track', loadComponent: () => import('./features/quotes/track-quote/track-quote').then(m => m.TrackQuote) },
    { path: 'track/:id', loadComponent: () => import('./features/quotes/track-quote/track-quote').then(m => m.TrackQuote) },
    { path: 'vendor', component: VendorDashboard, canActivate: [authGuard] },
    { path: 'vendor/respond/:quoteId', component: RespondQuote, canActivate: [authGuard] },
    { path: 'admin', component: AdminDashboard, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];

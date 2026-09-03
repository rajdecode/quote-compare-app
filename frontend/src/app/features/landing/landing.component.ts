import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface ProjectCategory {
    id: string;
    name: string;
    badge: string;
    quoteServiceType: string;
    savingsNote: string;
}

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

    // Verified Categories (Core Launch Offering)
    categories: ProjectCategory[] = [
        {
            id: 'heat-pumps',
            name: 'Heat Pumps & Hot Water Systems',
            badge: 'High Efficiency',
            quoteServiceType: 'heat-pump',
            savingsNote: 'High-efficiency heat pumps and hot water systems cutting water heating energy by up to 70%'
        },
        {
            id: 'aircons',
            name: 'Air Conditioning & Reverse Cycle HVAC',
            badge: 'Climate Control',
            quoteServiceType: 'aircon',
            savingsNote: 'Multi-split and ducted reverse cycle inverter climate control systems'
        },
        {
            id: 'batteries',
            name: 'Home Solar Batteries & Storage',
            badge: 'Energy Storage',
            quoteServiceType: 'battery',
            savingsNote: 'Stores daytime solar generation for evening peak load avoidance and emergency backup'
        },
        {
            id: 'water-filters',
            name: 'Water Filtration & Treatment',
            badge: 'Water Quality',
            quoteServiceType: 'water-filter',
            savingsNote: 'Whole-house filtration, reverse osmosis, and UV clean drinking water treatment systems'
        }
    ];

    getCategoryEmoji(id: string): string {
        switch (id) {
            case 'heat-pumps':
            case 'heat-pump':
                return '♨️';
            case 'aircons':
            case 'aircon':
                return '❄️';
            case 'batteries':
            case 'battery':
            case 'solar':
                return '⚡';
            case 'water-filters':
            case 'water-filter':
                return '💧';
            case 'windows':
            case 'doors':
                return '🪟';
            case 'insulation':
            case 'roofing':
            case 'timber':
                return '🏠';
            default:
                return '📦';
        }
    }
}

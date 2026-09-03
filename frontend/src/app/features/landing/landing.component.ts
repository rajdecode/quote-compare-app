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

    // Verified Categories
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
        },
        {
            id: 'windows',
            name: 'Windows & Double Glazing',
            badge: 'Building Envelope',
            quoteServiceType: 'windows',
            savingsNote: 'High thermal-efficiency double glazing and architectural window systems'
        },
        {
            id: 'doors',
            name: 'Doors & Security Entry Systems',
            badge: 'Access & Security',
            quoteServiceType: 'doors',
            savingsNote: 'Security mesh, acoustic internal doors, and sliding patio systems'
        },
        {
            id: 'insulation',
            name: 'Thermal & Acoustic Insulation',
            badge: 'Thermal Comfort',
            quoteServiceType: 'insulation',
            savingsNote: 'Ceiling, wall batts, and underfloor thermal barrier insulation'
        },
        {
            id: 'roofing',
            name: 'Roofing, Gutters & Restoration',
            badge: 'Structural Upgrade',
            quoteServiceType: 'roofing',
            savingsNote: 'Colorbond re-roofing, tile restoration, and gutter replacements'
        },
        {
            id: 'timber',
            name: 'Timber & Building Materials',
            badge: 'Trade & Materials',
            quoteServiceType: 'timber',
            savingsNote: 'Framing timber, hardwoods, decking boards, and structural materials'
        }
    ];
}

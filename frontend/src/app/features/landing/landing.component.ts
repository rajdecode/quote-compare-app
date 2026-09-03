import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

export interface ProjectCategory {
    id: string;
    name: string;
    badge: string;
    defaultCost: number;
    minCost: number;
    maxCost: number;
    defaultRebate: number;
    hasRebatePotential: boolean;
    quoteServiceType: string;
    savingsNote: string;
}

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
    authService = inject(AuthService);
    router = inject(Router);
    currentUser = this.authService.currentUser;

    // Generalized Categories
    categories: ProjectCategory[] = [
        {
            id: 'heat-pumps',
            name: 'Heat Pumps & Hot Water Systems',
            badge: 'High-Efficiency Electrification',
            defaultCost: 3800,
            minCost: 1500,
            maxCost: 9000,
            defaultRebate: 1200,
            hasRebatePotential: true,
            quoteServiceType: 'heat-pump',
            savingsNote: 'Replaces inefficient gas/resistive water heaters with high COP heat pumps'
        },
        {
            id: 'aircons',
            name: 'Air Conditioning & Reverse Cycle HVAC',
            badge: 'Climate Control',
            defaultCost: 3200,
            minCost: 1200,
            maxCost: 12000,
            defaultRebate: 800,
            hasRebatePotential: true,
            quoteServiceType: 'aircon',
            savingsNote: 'Multi-split and ducted reverse cycle inverter climate control systems'
        },
        {
            id: 'batteries',
            name: 'Home Solar Batteries & Storage',
            badge: 'Energy Storage',
            defaultCost: 9500,
            minCost: 4000,
            maxCost: 24000,
            defaultRebate: 1800,
            hasRebatePotential: true,
            quoteServiceType: 'battery',
            savingsNote: 'Stores daytime solar generation for evening peak load avoidance'
        },
        {
            id: 'windows',
            name: 'Windows & Double Glazing',
            badge: 'Building Envelope',
            defaultCost: 5400,
            minCost: 1500,
            maxCost: 25000,
            defaultRebate: 600,
            hasRebatePotential: false,
            quoteServiceType: 'windows',
            savingsNote: 'High thermal-efficiency double glazing and architectural window systems'
        },
        {
            id: 'doors',
            name: 'Doors & Security Entry Systems',
            badge: 'Access & Security',
            defaultCost: 2800,
            minCost: 800,
            maxCost: 12000,
            defaultRebate: 400,
            hasRebatePotential: false,
            quoteServiceType: 'doors',
            savingsNote: 'Security mesh, acoustic internal doors, and sliding patio systems'
        },
        {
            id: 'insulation',
            name: 'Thermal & Acoustic Insulation',
            badge: 'Thermal Comfort',
            defaultCost: 2400,
            minCost: 800,
            maxCost: 8000,
            defaultRebate: 500,
            hasRebatePotential: true,
            quoteServiceType: 'insulation',
            savingsNote: 'Ceiling, wall batts, and underfloor thermal barrier insulation'
        },
        {
            id: 'roofing',
            name: 'Roofing, Gutters & Restoration',
            badge: 'Structural Upgrade',
            defaultCost: 6500,
            minCost: 2000,
            maxCost: 30000,
            defaultRebate: 800,
            hasRebatePotential: false,
            quoteServiceType: 'roofing',
            savingsNote: 'Colorbond re-roofing, tile restoration, and gutter replacements'
        },
        {
            id: 'timber',
            name: 'Timber & Building Materials',
            badge: 'Trade & Materials',
            defaultCost: 4200,
            minCost: 1000,
            maxCost: 20000,
            defaultRebate: 400,
            hasRebatePotential: false,
            quoteServiceType: 'timber',
            savingsNote: 'Framing timber, hardwoods, decking boards, and structural materials'
        },
        {
            id: 'water-filters',
            name: 'Water Filtration & Treatment',
            badge: 'Water Quality',
            defaultCost: 1800,
            minCost: 600,
            maxCost: 6000,
            defaultRebate: 300,
            hasRebatePotential: false,
            quoteServiceType: 'water-filter',
            savingsNote: 'Whole-house filtration, reverse osmosis, and UV water treatment systems'
        },
        {
            id: 'general',
            name: 'General Electrical, Plumbing & Property Trade',
            badge: 'Trade Procurement',
            defaultCost: 3500,
            minCost: 800,
            maxCost: 25000,
            defaultRebate: 500,
            hasRebatePotential: false,
            quoteServiceType: 'general',
            savingsNote: 'Certified electrical rewiring, switchboards, EV chargers & plumbing trade'
        }
    ];

    // Calculator State
    selectedCategory = 'heat-pumps';
    projectCost = 3800;
    quotesEvaluated = 3;
    applyRebate = false;
    rebateAmount = 1000;

    onCategoryChange(categoryId: string) {
        this.selectedCategory = categoryId;
        const cat = this.currentCategory;
        if (cat) {
            this.projectCost = cat.defaultCost;
            this.rebateAmount = cat.defaultRebate;
            this.applyRebate = cat.hasRebatePotential;
        }
    }

    get currentCategory(): ProjectCategory {
        return this.categories.find(c => c.id === this.selectedCategory) || this.categories[0];
    }

    // Competitive spread percentage based on number of quotes evaluated
    get spreadPercentage(): number {
        if (this.quotesEvaluated <= 2) return 0.08;
        if (this.quotesEvaluated === 3) return 0.11;
        if (this.quotesEvaluated === 4) return 0.135;
        return 0.15;
    }

    // Competitive Market Spread Savings (AUD)
    get marketSpreadSavings(): number {
        return Math.round(this.projectCost * this.spreadPercentage);
    }

    // Procurement & Admin Hours Saved
    get adminHoursSaved(): number {
        return Math.round(this.quotesEvaluated * 2.2);
    }

    // Estimated Net Project Cost
    get netProjectCost(): number {
        const rebateDeduction = this.applyRebate ? this.rebateAmount : 0;
        return Math.max(0, this.projectCost - this.marketSpreadSavings - rebateDeduction);
    }
}

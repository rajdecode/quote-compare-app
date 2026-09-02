import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface UpgradeOption {
    id: string;
    name: string;
    badge: string;
    defaultCost: number;
    defaultRebate: number;
    minCost: number;
    maxCost: number;
    quoteServiceType: string;
    rebateNote: string;
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

    // Calculator Upgrade Options
    upgradeOptions: UpgradeOption[] = [
        {
            id: 'heat-pump',
            name: 'Heat Pump Water Heater (Replaces electric/gas hot water)',
            badge: 'Up to 70% Hot Water Savings',
            defaultCost: 3800,
            defaultRebate: 1200,
            minCost: 1500,
            maxCost: 8000,
            quoteServiceType: 'heat-pump',
            rebateNote: 'Eligible for Federal STCs + State VEU/NSW ESS/Peak demand subsidies',
            savingsNote: 'Replaces inefficient gas/electric tanks, cutting water heating energy by ~65%'
        },
        {
            id: 'aircon',
            name: 'High-Efficiency Air Conditioning / Reverse Cycle Split System',
            badge: 'Top Energy Star Rating',
            defaultCost: 2800,
            defaultRebate: 800,
            minCost: 1200,
            maxCost: 10000,
            quoteServiceType: 'aircon',
            rebateNote: 'Eligible for state-level energy upgrade incentives & peak demand rebates',
            savingsNote: 'Provides ~35%+ efficiency gains over resistive heaters and older split systems'
        },
        {
            id: 'battery',
            name: 'Home Solar Battery Storage',
            badge: 'Energy Independence',
            defaultCost: 9500,
            defaultRebate: 1800,
            minCost: 4000,
            maxCost: 22000,
            quoteServiceType: 'battery',
            rebateNote: 'Eligible for Cheaper Home Battery subsidies + CER certificates',
            savingsNote: 'Stores daytime solar for evening peak use, unlocking $800–$1,400/yr bill relief'
        },
        {
            id: 'other',
            name: 'Other Subsidised Electrification Upgrade',
            badge: 'Clean Electrification',
            defaultCost: 4500,
            defaultRebate: 1000,
            minCost: 1000,
            maxCost: 15000,
            quoteServiceType: 'heat-pump',
            rebateNote: 'Eligible for federal and local clean energy certificate discounts',
            savingsNote: 'Holistic household electrification and efficiency upgrades'
        }
    ];

    selectedCategory = 'heat-pump';
    upfrontCost = 3800;
    rebateAmount = 1200;
    quarterlyBill = 850;

    onCategoryChange(categoryId: string) {
        this.selectedCategory = categoryId;
        const opt = this.currentOption;
        if (opt) {
            this.upfrontCost = opt.defaultCost;
            this.rebateAmount = opt.defaultRebate;
        }
    }

    get currentOption(): UpgradeOption {
        return this.upgradeOptions.find(o => o.id === this.selectedCategory) || this.upgradeOptions[0];
    }

    // Net Out-of-Pocket Cost (AUD): Upfront System Cost - Eligible Rebates
    get netCost(): number {
        return Math.max(0, this.upfrontCost - this.rebateAmount);
    }

    // Annual Running Cost Savings (AUD)
    get annualSavings(): number {
        const annualBill = this.quarterlyBill * 4;
        switch (this.selectedCategory) {
            case 'heat-pump': {
                // ~60% to 70% reduction in water heating energy (~$400–$800 AUD/yr)
                const base = annualBill * 0.22;
                return Math.round(Math.min(1050, Math.max(400, base)));
            }
            case 'aircon': {
                // ~35% efficiency gain over older resistive/gas heating (~$350–$650 AUD/yr)
                const base = annualBill * 0.16;
                return Math.round(Math.min(850, Math.max(350, base)));
            }
            case 'battery': {
                // Solar self-consumption optimization (~$800–$1,400 AUD/yr)
                const base = annualBill * 0.35;
                return Math.round(Math.min(1950, Math.max(800, base)));
            }
            case 'other':
            default: {
                const base = annualBill * 0.20;
                return Math.round(Math.min(1200, Math.max(450, base)));
            }
        }
    }

    // Payback Period (Years): Net Out-of-Pocket Cost / Annual Energy Savings
    get paybackPeriodYears(): string {
        if (this.annualSavings <= 0) return '0.0';
        if (this.netCost <= 0) return '< 1';
        const years = this.netCost / this.annualSavings;
        return years < 1 ? '< 1' : years.toFixed(1);
    }

    // Multi-Quote Procurement Spread Value: extra ~$300–$600 AUD saved by comparing multiple certified installers
    get multiVendorSpread(): number {
        switch (this.selectedCategory) {
            case 'heat-pump':
                return 480;
            case 'aircon':
                return 390;
            case 'battery':
                return 650;
            case 'other':
            default:
                return 420;
        }
    }

    // 10-Year cumulative net financial benefit
    get tenYearNetBenefit(): number {
        return Math.max(0, (this.annualSavings * 10) - this.netCost + this.multiVendorSpread);
    }
}

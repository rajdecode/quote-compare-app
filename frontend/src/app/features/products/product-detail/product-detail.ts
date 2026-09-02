import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
    selector: 'app-product-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="container page-content">
        <div class="product-header glass-panel">
            <h1>{{ product()?.title }}</h1>
            <p class="subtitle">{{ product()?.subtitle }}</p>
        </div>

        <div class="content-grid">
            <div class="main-content glass-panel">
                <img [src]="product()?.image" [alt]="product()?.title" class="hero-image">
                <h2>Why Choose {{ product()?.title }}?</h2>
                <p>{{ product()?.description }}</p>
                
                <h3>Key Benefits</h3>
                <ul>
                    @for (benefit of product()?.benefits; track benefit) {
                    <li><span class="material-icons">check</span> {{ benefit }}</li>
                    }
                </ul>
            </div>

            <div class="sidebar">
                <div class="glass-panel cta-card">
                    <h3>Ready to upgrade?</h3>
                    <p>Compare multi-vendor quotes from certified Australian installers today.</p>
                    <a [routerLink]="['/request-quote']" [queryParams]="{ serviceType: getQuoteServiceType() }" class="btn btn-primary btn-block">Compare Multi-Vendor Quotes</a>
                </div>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .page-content { padding-top: 8rem; padding-bottom: 4rem; }
    .product-header { text-align: center; padding: 3rem; margin-bottom: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-heading); }
    .subtitle { font-size: 1.25rem; color: var(--text-dim); }
    
    .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
    @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }
    
    .main-content { padding: 2rem; }
    .hero-image { width: 100%; height: 300px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; background: #f0f0f0; }
    h2 { font-size: 1.75rem; margin-bottom: 1rem; color: var(--primary); }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 1rem; }
    p { line-height: 1.6; color: var(--text-body); margin-bottom: 1rem; }
    ul { list-style: none; padding: 0; }
    li { display: flex; align-items: center; margin-bottom: 0.5rem; color: var(--text-body); }
    .material-icons { color: var(--secondary); margin-right: 0.5rem; font-size: 1.2rem; }
    
    .cta-card { padding: 2rem; text-align: center; position: sticky; top: 100px; }
    .btn-block { 
        display: block; 
        width: 100%; 
        box-sizing: border-box; 
        margin-top: 1.5rem; 
        text-align: center;
    }
  `]
})
export class ProductDetailComponent {
    private route = inject(ActivatedRoute);

    type = '';

    contentMap: any = {
        'heat-pumps': {
            title: 'Heat Pump Water Heaters',
            subtitle: 'Cut water heating energy by up to 70% with federal & state rebates.',
            description: 'Heat pump hot water systems extract ambient heat from the air to heat your water efficiently. Backed by Small-scale Technology Certificates (STCs) and state schemes (VEU in VIC, ESS in NSW), heat pumps deliver massive annual running cost savings over legacy gas or resistive electric storage tanks.',
            benefits: ['Up to $1,200+ in STCs and state subsidies', '60%–70% reduction in water heating electricity', 'Environmentally friendly refrigerant technology', 'Compatible with rooftop solar self-consumption'],
            image: 'assets/heat-pump.jpg',
            serviceType: 'heat-pump'
        },
        'water-filters': {
            title: 'Water Filtration & Treatment',
            subtitle: 'Pure, mineral-rich drinking water for the entire household.',
            description: 'Enjoy clean, great-tasting water straight from every tap. Our verified Australian vendors offer heavy-duty filtration, reverse osmosis, UV sterilisation, and whole-home filtration systems installed by certified plumbers.',
            benefits: ['Removes micro-contaminants, chlorine & heavy metals', 'Better taste and kitchen appliance longevity', 'Whole-home and point-of-use systems', 'Verified Australian plumbing standards'],
            image: 'assets/water-filter.jpg',
            serviceType: 'water-filter'
        },
        'aircons': {
            title: 'Reverse Cycle Air Conditioning',
            subtitle: 'Ultra-efficient heating and cooling for Australian climate conditions.',
            description: 'Modern inverter reverse cycle split and ducted systems deliver superior year-round climate control while drastically lowering seasonal power bills. Claim peak-demand incentives and energy efficiency upgrade discounts through certified installers.',
            benefits: ['~35%+ efficiency gains over resistive heaters', 'Smart WiFi zoning & climate automation', 'High Energy Star ratings & low decibel operation', 'Fast turnaround quotes from verified HVAC technicians'],
            image: 'assets/aircon.jpg',
            serviceType: 'aircon'
        },
        'batteries': {
            title: 'Home Solar Battery Storage',
            subtitle: 'Store excess solar energy and eliminate peak electricity rates.',
            description: 'Maximize your rooftop solar generation by storing daytime surplus power for evening peak usage. Home batteries provide blackout protection, virtual power plant (VPP) revenue opportunities, and substantial annual bill reduction.',
            benefits: ['Save $800–$1,400 AUD per year on grid power', 'Cheaper Home Battery subsidies & CER incentives', 'Emergency backup power during outages', 'Seamless inverter & solar system integration'],
            image: 'assets/battery.jpg',
            serviceType: 'battery'
        }
    };

    constructor() {
        this.route.params.subscribe(params => {
            this.type = params['type'];
        });
    }

    product() {
        return this.contentMap[this.type] || this.contentMap['heat-pumps'];
    }

    getQuoteServiceType(): string {
        return this.product()?.serviceType || 'heat-pump';
    }
}

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
            subtitle: 'Cut water heating energy by up to 70% with high-efficiency electrification.',
            description: 'Heat pump hot water systems extract ambient heat from the air to heat your water efficiently. Heat pumps deliver massive annual running cost savings over legacy gas or resistive electric storage tanks.',
            benefits: ['Up to 70% reduction in water heating energy', 'Environmentally friendly refrigerant technology', 'Compatible with rooftop solar self-consumption', 'Vetted Australian trade installers'],
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
            description: 'Modern inverter reverse cycle split and ducted systems deliver superior year-round climate control while drastically lowering seasonal power bills.',
            benefits: ['High Energy Star ratings & low decibel operation', 'Smart WiFi zoning & climate automation', 'Inverter heating & cooling in a single system', 'Fast turnaround quotes from verified HVAC technicians'],
            image: 'assets/aircon.jpg',
            serviceType: 'aircon'
        },
        'batteries': {
            title: 'Home Solar Battery Storage',
            subtitle: 'Store excess solar energy and eliminate peak electricity rates.',
            description: 'Maximize your rooftop solar generation by storing daytime surplus power for evening peak usage. Home batteries provide blackout protection, virtual power plant (VPP) opportunities, and substantial bill reduction.',
            benefits: ['Substantial annual bill reduction', 'Emergency backup power during grid outages', 'Seamless inverter & solar system integration', 'Vetted Australian clean energy specialists'],
            image: 'assets/battery.jpg',
            serviceType: 'battery'
        },
        'windows': {
            title: 'Windows & Double Glazing',
            subtitle: 'High-performance architectural windows & double glazing systems.',
            description: 'Upgrade your building envelope with high-efficiency double and triple glazing, thermally broken aluminium, timber, and uPVC window frames. Reduce acoustic transmission and improve year-round climate regulation.',
            benefits: ['Drastic thermal insulation & draft reduction', 'Significant noise dampening & acoustic comfort', 'Bushfire & cyclone-rated glazing options', 'Direct multi-supplier fabrication pricing'],
            image: 'assets/window.jpg',
            serviceType: 'windows'
        },
        'doors': {
            title: 'Doors & Security Entry Systems',
            subtitle: 'Architectural entry doors, security mesh & high-spec internal systems.',
            description: 'Procure high-security entrance doors, acoustic internal doors, stacking sliding glass doors, and corrosion-resistant security screens from verified Australian manufacturers and carpenters.',
            benefits: ['Stainless steel security mesh & multipoint locking', 'Energy-rated sliding & bi-fold glass doors', 'Custom timber and composite entry doors', 'Professional measuring and installation quotes'],
            image: 'assets/door.jpg',
            serviceType: 'doors'
        },
        'insulation': {
            title: 'Thermal & Acoustic Insulation',
            subtitle: 'Ceiling batts, wall acoustic solutions & underfloor insulation.',
            description: 'Maximize your home or commercial building envelope efficiency with high R-value glasswool, rockwool, and polyester thermal insulation batts installed by certified trade teams.',
            benefits: ['Up to 45% reduction in heating and cooling energy loss', 'Superior acoustic isolation between rooms and floors', 'Non-combustible fire-safe building materials', 'Fast, clean installation by insured trade specialists'],
            image: 'assets/insulation.jpg',
            serviceType: 'insulation'
        },
        'roofing': {
            title: 'Roofing, Gutters & Restoration',
            subtitle: 'Colorbond steel roofing, tile restoration & architectural rainwater systems.',
            description: 'Protect and upgrade your property with premium Colorbond metal roofing, tile re-bedding, gutter guard installations, and full roof restoration packages from licensed Australian roofers.',
            benefits: ['Genuine BlueScope Colorbond & Zincalume options', 'Complete flashing, valleys, and guttering packages', 'Comprehensive leak repair and structural tile coating', 'Multi-supplier competitive price comparison'],
            image: 'assets/roofing.jpg',
            serviceType: 'roofing'
        },
        'timber': {
            title: 'Timber & Building Materials',
            subtitle: 'Structural framing, hardwoods, engineered timber & building supplies.',
            description: 'Direct procurement of structural LVL, treated pine, hardwood decking, formwork, and architectural timber profiles from verified Australian trade yards and timber merchants.',
            benefits: ['FSC & PEFC certified sustainable Australian timber', 'MGP10 & F7 structural framing batches', 'Hardwood decking: Spotted Gum, Ironbark & Merbau', 'Bulk merchant trade discounts and delivery'],
            image: 'assets/timber.jpg',
            serviceType: 'timber'
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

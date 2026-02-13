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
                    <p>Get free quotes from trusted local vendors today.</p>
                    <a routerLink="/request-quote" class="btn btn-primary btn-block">Request Quotes</a>
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
    .btn-block { display: block; width: 100%; margin-top: 1rem; }
  `]
})
export class ProductDetailComponent {
    private route = inject(ActivatedRoute);

    type = '';

    contentMap: any = {
        'heat-pumps': {
            title: 'Heat Pumps',
            subtitle: 'Efficient heating and cooling for your home.',
            description: 'Heat pumps are the most efficient way to heat and cool your home. They move heat rather than generating it, using significantly less energy than traditional heating systems.',
            benefits: ['Lower energy bills', 'Heating & Cooling in one', 'Eco-friendly technology', 'Government rebates available'],
            image: 'assets/heat-pump.jpg' // Placeholder
        },
        'water-filters': {
            title: 'Water Filters',
            subtitle: 'Pure, safe drinking water for your family.',
            description: 'Enjoy clean, great-tasting water straight from your tap. Our vendors offer a range of filtration systems from under-sink units to whole-house solutions.',
            benefits: ['Removes contaminants', 'Better taste', 'Protects appliances', 'Healthier lifestyle'],
            image: 'assets/water-filter.jpg'
        },
        'aircons': {
            title: 'Air Conditioning',
            subtitle: 'Stay cool and comfortable all summer long.',
            description: 'Modern air conditioning systems are quiet, efficient, and smart. Control your home climate with precision and save on running costs with high energy star ratings.',
            benefits: ['Fast cooling', 'Smart control', 'Energy efficient', 'Quiet operation'],
            image: 'assets/aircon.jpg'
        },
        'batteries': {
            title: 'Solar Batteries',
            subtitle: 'Store your solar energy for day and night.',
            description: 'Maximize your solar investment by storing excess energy. Power your home at night or during blackouts with a high-performance home battery system.',
            benefits: ['Energy independence', 'Backup power', 'Save more on bills', 'Grid support'],
            image: 'assets/battery.jpg'
        }
    };

    constructor() {
        this.route.params.subscribe(params => {
            this.type = params['type'];
        });
    }

    product() {
        return this.contentMap[this.type];
    }
}

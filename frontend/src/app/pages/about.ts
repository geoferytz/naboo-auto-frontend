import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { SeoService } from '../core/seo.service';

@Component({
  selector: 'app-about',
  imports: [RouterLink, MatButtonModule],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">About us</span>
        <h1>One place for buying, servicing and restoring your vehicle</h1>
        <p class="lead">
          Naboo Automotive brings vehicle sales and a full-service workshop together, so customers in Tanzania can buy, maintain,
          repaint and restore their vehicles with one trusted team.
        </p>
      </div>
    </header>
    <section class="section">
      <div class="container grid">
        @for (v of values; track v.title) {
          <article class="card value">
            <h2>{{ v.title }}</h2>
            <p>{{ v.text }}</p>
          </article>
        }
      </div>
    </section>
    <section class="section section--dark">
      <div class="container cta">
        <h2>Ready to get started?</h2>
        <div class="actions">
          <a mat-flat-button class="btn-lg" routerLink="/cars-for-sale">Browse vehicles</a>
          <a mat-stroked-button class="btn-lg" routerLink="/contact">Contact us</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .value { padding: var(--space-5); }
    .value h2 { font-size: 1.15rem; }
    .value p { color: var(--naboo-text-muted); margin: 0; }
    .cta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-4); }
    .cta h2 { margin: 0; }
  `,
})
export class About {
  protected readonly values = [
    { title: 'Honest listings', text: 'Every vehicle shows its real price, specifications and current status — sold and reserved cars are clearly marked.' },
    { title: 'Transparent workshop pricing', text: 'Fixed prices where the scope is fixed, and itemised quotations you approve before work starts.' },
    { title: 'Complete care', text: 'From routine servicing and diagnostics to resprays, detailing and full restorations.' },
    { title: 'Clear communication', text: 'Every enquiry gets a reference number, and we keep you updated on progress.' },
  ];

  constructor() {
    inject(SeoService).set({
      title: 'About us',
      description: 'Naboo Automotive: vehicle sales and a full-service workshop for repairs, painting, detailing and restoration in Tanzania.',
      path: '/about',
    });
  }
}

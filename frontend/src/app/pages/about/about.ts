import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-about',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  protected readonly values = [
    { title: 'Honest listings', text: 'Every vehicle shows its real price, specifications and current status — sold and reserved cars are clearly marked.' },
    { title: 'Transparent workshop pricing', text: 'Fixed prices where the scope is fixed, and itemised quotations you approve before work starts.' },
    { title: 'Complete care', text: 'From routine servicing and diagnostics to resprays, detailing and full restorations.' },
    { title: 'Clear communication', text: 'Every enquiry gets a reference number, and we keep you updated on progress.' },
  ];

  // Placeholder partners — replace with real partner names, blurbs and logos.
  protected readonly partners = [
    { name: 'Partner One', blurb: 'Vehicle sourcing & logistics' },
    { name: 'Partner Two', blurb: 'Insurance & valuation' },
    { name: 'Partner Three', blurb: 'Genuine parts supplier' },
    { name: 'Partner Four', blurb: 'Financing & payments' },
  ] as { name: string; blurb: string; logo?: string }[];

  constructor() {
    inject(SeoService).set({
      title: 'About us',
      description: 'Naboo Automotive: vehicle sales and a full-service workshop for repairs, painting, detailing and restoration in Tanzania.',
      path: '/about',
    });
  }
}

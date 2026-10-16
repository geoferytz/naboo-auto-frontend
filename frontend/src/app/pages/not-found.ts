import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { SeoService } from '../core/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="container section">
      <span class="eyebrow">404</span>
      <h1>Page not found</h1>
      <p class="lead">The page you are looking for does not exist or has moved.</p>
      <div class="actions">
        <a mat-flat-button routerLink="/">Go to the home page</a>
        <a mat-stroked-button routerLink="/cars-for-sale">Browse cars for sale</a>
      </div>
    </div>
  `,
})
export class NotFound {
  constructor() {
    inject(SeoService).set({ title: 'Page not found', description: 'Page not found.', path: '/404', noIndex: true });
  }
}

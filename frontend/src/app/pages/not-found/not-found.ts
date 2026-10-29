import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../core/seo.service';

@Component({
  styleUrl: './not-found.css',
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './not-found.html',
})
export class NotFound {
  constructor() {
    inject(SeoService).set({ title: 'Page not found', description: 'Page not found.', path: '/404', noIndex: true });
  }
}

import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { Api } from '../core/api';
import { formatDuration, servicePrice } from '../core/format';
import { ServiceCategory, ServiceItem } from '../core/models';
import { SERVICE_CATALOGUE } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

@Component({
  selector: 'app-services',
  imports: [RouterLink, MatButtonModule, LoadState],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">Workshop services</span>
        <h1>Repairs, maintenance, painting &amp; restoration</h1>
        <p class="lead">
          Prices are shown as fixed, starting-from, hourly, or by quotation. Anything beyond the agreed scope is quoted and
          approved by you before work continues.
        </p>
      </div>
    </header>

    <div class="container section">
      @if (groups().length) {
        @if (groups().length > 1) {
          <nav class="jump" aria-label="Service categories">
            @for (g of groups(); track g.category.id) {
              <a routerLink="/services" [fragment]="g.category.slug">{{ g.category.name }}</a>
            }
          </nav>
        }
        @for (g of groups(); track g.category.id) {
          <section class="group" [id]="g.category.slug" [attr.aria-labelledby]="g.category.slug + '-h'">
            <h2 [id]="g.category.slug + '-h'">{{ g.category.name }}</h2>
            @if (g.category.description) {
              <p class="lead">{{ g.category.description }}</p>
            }
            <div class="grid">
              @for (s of g.services; track s.id) {
                <article class="card service">
                  <h3><a [routerLink]="['/services', s.slug]">{{ s.name }}</a></h3>
                  <p>{{ s.summary }}</p>
                  <div class="meta">
                    <strong>{{ servicePrice(s) }}</strong>
                    @if (formatDuration(s.durationMinutes); as d) {
                      <span>Approx. {{ d }}</span>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        }
      } @else {
        <app-load-state
          [state]="catalogue.isLoading() ? 'loading' : catalogue.error() ? 'error' : 'empty'"
          emptyText="Our service catalogue is being updated. Contact us and we will advise on pricing."
          (retry)="catalogue.reload()"
        >
          <a mat-flat-button routerLink="/contact" [queryParams]="{ subject: 'Service enquiry' }">Contact the workshop</a>
        </app-load-state>
      }
    </div>

    <section class="section section--grey">
      <div class="container cta">
        <div>
          <h2>Not sure what your vehicle needs?</h2>
          <p class="lead">Describe the problem and we will recommend the right service or arrange an inspection.</p>
        </div>
        <a mat-flat-button class="btn-lg" routerLink="/contact" [queryParams]="{ subject: 'Inspection request' }">Request an inspection</a>
      </div>
    </section>
  `,
  styles: `
    .jump { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-6); }
    .jump a { padding: var(--space-2) var(--space-4); border-radius: 999px; background: var(--naboo-grey); color: var(--naboo-text);
      text-decoration: none; font-weight: 600; font-size: .9rem; }
    .jump a:hover { background: var(--naboo-grey-dark); }
    .group + .group { margin-top: var(--space-7); }
    .group { scroll-margin-top: calc(var(--header-height) + var(--space-4)); }
    .service { padding: var(--space-5); display: flex; flex-direction: column; }
    .service h3 a { color: var(--naboo-text); text-decoration: none; }
    .service h3 a:hover { color: var(--naboo-red-dark); text-decoration: underline; }
    .service p { color: var(--naboo-text-muted); flex: 1; }
    .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); font-size: .95rem; }
    .meta span { color: var(--naboo-text-muted); }
    .cta { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; justify-content: space-between; }
  `,
})
export class Services {
  private readonly api = inject(Api);
  protected readonly servicePrice = servicePrice;
  protected readonly formatDuration = formatDuration;

  protected readonly catalogue = rxResource({
    stream: () => this.api.query<{ serviceCategories: ServiceCategory[]; services: ServiceItem[] }>(SERVICE_CATALOGUE),
  });

  protected readonly groups = computed(() => {
    if (!this.catalogue.hasValue()) {
      return [];
    }
    const { serviceCategories, services } = this.catalogue.value();
    return serviceCategories
      .map((category) => ({ category, services: services.filter((s) => s.category.id === category.id) }))
      .filter((g) => g.services.length > 0);
  });

  constructor() {
    inject(SeoService).set({
      title: 'Workshop services and pricing',
      description:
        'Servicing, diagnostics, brakes, suspension, painting, colour changes, detailing and restoration at Naboo Automotive, with transparent TZS pricing.',
      path: '/services',
    });
  }
}

import { Component, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../core/api';
import { formatDuration, servicePrice, servicePriceNote } from '../core/format';
import { ServiceItem } from '../core/models';
import { SERVICE_BY_SLUG } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { BookingForm } from '../shared/booking-form';
import { LoadState } from '../shared/load-state';
import { QuotationForm } from '../shared/quotation-form';

@Component({
  selector: 'app-service-detail',
  imports: [RouterLink, MatButtonModule, LoadState, BookingForm, QuotationForm],
  template: `
    @if (service.hasValue() && service.value(); as s) {
      <header class="page-header">
        <div class="container">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a routerLink="/services">Services</a> / <a [routerLink]="'/services'" [fragment]="s.category.slug">{{ s.category.name }}</a>
          </nav>
          <h1>{{ s.name }}</h1>
          <p class="lead">{{ s.summary }}</p>
        </div>
      </header>
      <div class="container section layout">
        <div class="main">
          @if (s.description) {
            <h2>What is included</h2>
            <p class="description">{{ s.description }}</p>
          }
        </div>
        <aside class="card price-card" aria-labelledby="pricing">
          <h2 id="pricing">Pricing</h2>
          <p class="price">{{ servicePrice(s) }}</p>
          <p class="note">{{ servicePriceNote(s.priceType) }}</p>
          @if (formatDuration(s.durationMinutes); as d) {
            <p class="note">Typical duration: approx. {{ d }}.</p>
          }
          <p class="note small">We will confirm availability and the final scope with you before any work starts.</p>
        </aside>

        <section class="card action-card" aria-labelledby="action-h">
          @if (s.priceType === 'QUOTE_REQUIRED') {
            <h2 id="action-h">Request a quotation</h2>
            <app-quotation-form [serviceId]="s.id" />
          } @else {
            <h2 id="action-h">Book an appointment</h2>
            <app-booking-form [serviceId]="s.id" />
          }
        </section>
      </div>
    } @else if (service.hasValue() && !service.value()) {
      <div class="container section">
        <h1>Service not found</h1>
        <p class="lead">This service may no longer be offered.</p>
        <a mat-flat-button routerLink="/services">View all services</a>
      </div>
    } @else {
      <div class="container section">
        <app-load-state [state]="service.error() ? 'error' : 'loading'" (retry)="service.reload()" />
      </div>
    }
  `,
  styles: `
    .layout { display: grid; gap: var(--space-6); }
    .description { white-space: pre-line; max-width: 70ch; }
    .price-card, .action-card { padding: var(--space-5); }
    .price-card h2, .action-card h2 { font-size: 1.1rem; }
    .action-card { margin-top: var(--space-5); }
    .price { font-size: 1.5rem; font-weight: 800; margin-bottom: var(--space-2); }
    .note { color: var(--naboo-text-muted); }
    .small { font-size: .85rem; margin: var(--space-3) 0 0; }
    .full { width: 100%; }
    @media (min-width: 900px) { .layout { grid-template-columns: 1fr 360px; align-items: start; } }
  `,
})
export class ServiceDetail {
  readonly slug = input.required<string>();
  private readonly api = inject(Api);
  private readonly seo = inject(SeoService);
  protected readonly servicePrice = servicePrice;
  protected readonly servicePriceNote = servicePriceNote;
  protected readonly formatDuration = formatDuration;

  protected readonly service = rxResource({
    params: () => this.slug(),
    stream: ({ params }) =>
      this.api.query<{ serviceBySlug: ServiceItem | null }>(SERVICE_BY_SLUG, { slug: params }).pipe(map((d) => d.serviceBySlug)),
  });

  constructor() {
    effect(() => {
      const s = this.service.hasValue() ? this.service.value() : null;
      if (s) {
        this.seo.set({ title: s.name, description: `${s.summary} ${servicePrice(s)}.`, path: `/services/${s.slug}` });
      }
    });
  }
}

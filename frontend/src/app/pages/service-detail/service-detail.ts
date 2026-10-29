import { Component, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../../core/api';
import { formatDuration, servicePrice, servicePriceNote } from '../../core/format';
import { ServiceItem } from '../../core/models';
import { SERVICE_BY_SLUG } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { BookingForm } from '../../shared/booking-form/booking-form';
import { LoadState } from '../../shared/load-state/load-state';
import { QuotationForm } from '../../shared/quotation-form/quotation-form';

@Component({
  selector: 'app-service-detail',
  imports: [RouterLink, MatButtonModule, LoadState, BookingForm, QuotationForm],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
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

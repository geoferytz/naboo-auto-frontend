import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api } from '../../core/api';
import { whatsappLink } from '../../core/business';
import { Page, VehicleCard } from '../../core/models';
import { VEHICLES } from '../../core/queries';
import { DEFAULT_ADVANTAGE, SiteContentStore } from '../../core/site-content';
import { SITE_NAME, SeoService } from '../../core/seo.service';
import { HeroSlider } from '../../shared/hero-slider/hero-slider';
import { VehicleSearch } from '../../shared/vehicle-search/vehicle-search';
import { LoadState } from '../../shared/load-state/load-state';
import { VehicleCardComponent } from '../../shared/vehicle-card/vehicle-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, VehicleCardComponent, LoadState, HeroSlider, VehicleSearch],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly api = inject(Api);
  private readonly site = inject(SiteContentStore);
  protected readonly wa = whatsappLink("Hi Naboo Automotive — I'd like to find my perfect car.");

  protected readonly content = this.site.content;
  protected readonly slides = computed(() => this.content().heroSlides ?? []);
  protected readonly pillars = computed(() =>
    (this.content().pillars ?? []).map((p) => ({
      ...p,
      wa: p.waMessage != null ? whatsappLink(p.waMessage) : null,
      query: p.subject ? { subject: p.subject } : undefined,
    })),
  );
  protected readonly advantage = computed(() => ({ ...DEFAULT_ADVANTAGE, ...this.content().advantage }));
  protected readonly steps = computed(() => this.content().workSteps ?? []);

  protected scrollPillars(track: HTMLElement, dir: 1 | -1): void {
    const card = track.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = card ? card.clientWidth + gap : track.clientWidth / 2;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  protected readonly vehicles = rxResource({
    stream: () =>
      this.api
        .query<{ vehicles: Page<VehicleCard> }>(VEHICLES, { page: 0, size: 4, sort: 'NEWEST' })
        .pipe(map((d) => d.vehicles)),
  });

  constructor() {
    this.site.load();
    inject(SeoService).set({
      title: SITE_NAME,
      description:
        'Naboo Automotive, Tanzania: vehicles for sale, workshop repairs and servicing, painting, detailing and restoration with transparent pricing.',
      path: '/',
    });
  }
}

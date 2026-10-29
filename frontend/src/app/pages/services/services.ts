import { Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { Api } from '../../core/api';
import { formatDuration, servicePrice } from '../../core/format';
import { ServiceCategory, ServiceItem } from '../../core/models';
import { SERVICE_CATALOGUE } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

const CATEGORY_IMAGES: Record<string, string[]> = {
  'repairs-maintenance': ['pillar-repairs', 'hero-workshop'],
  'painting-restoration': ['pillar-painting', 'hero-customization'],
  detailing: ['hero-cars', 'hero-prado'],
  '*': ['hero-workshop', 'hero-cars'],
};

const CATEGORY_ICONS: Record<string, string> = {
  'repairs-maintenance': 'build',
  'painting-restoration': 'format_paint',
  detailing: 'auto_awesome',
};

const SERVICE_PAGES: Partial<Record<string, { title: string; description: string }>> = {
  'repairs-maintenance': {
    title: 'Repairs & Maintenance',
    description: 'Keep your vehicle running reliably with routine servicing, diagnostics, brake and suspension repairs. Explore our services and request an inspection.',
  },
  'painting-restoration': {
    title: 'Painting & Restoration',
    description: 'Refresh or restore your vehicle with bodywork, resprays, colour changes and restoration. Tell us about your project for an assessment and quotation.',
  },
  detailing: {
    title: 'Detailing',
    description: 'Care for your vehicle inside and out with interior cleaning, exterior polishing and paint protection. Explore detailing options and discuss the right treatment with our team.',
  },
};

@Component({
  selector: 'app-services',
  imports: [RouterLink, MatButtonModule, MatIconModule, LoadState],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  private readonly api = inject(Api);
  readonly categorySlug = input<string>();
  protected readonly page = computed(() => SERVICE_PAGES[this.categorySlug() ?? '']);
  protected readonly pagePath = computed(() => this.page() ? `/services/${this.categorySlug()}` : '/services');
  protected readonly enquirySubject = computed(() => {
    const page = this.page();
    return page ? `${page.title} enquiry` : 'Service enquiry';
  });
  protected readonly servicePrice = servicePrice;
  protected readonly formatDuration = formatDuration;

  protected serviceImage(s: ServiceItem, index: number): string {
    if (s.imageUrl) {
      return s.imageUrl;
    }
    const list = CATEGORY_IMAGES[s.category.slug] ?? CATEGORY_IMAGES['*'];
    return `assets/images/automotive/${list[index % list.length]}.jpeg`;
  }

  protected categoryIcon(categorySlug: string): string {
    return CATEGORY_ICONS[categorySlug] ?? 'handyman';
  }

  protected readonly catalogue = rxResource({
    stream: () => this.api.query<{ serviceCategories: ServiceCategory[]; services: ServiceItem[] }>(SERVICE_CATALOGUE),
  });

  protected readonly groups = computed(() => {
    if (!this.catalogue.hasValue()) {
      return [];
    }
    const { serviceCategories, services } = this.catalogue.value();
    return serviceCategories
      .filter((category) => !this.categorySlug() || category.slug === this.categorySlug())
      .map((category) => ({ category, services: services.filter((s) => s.category.id === category.id) }))
      .filter((g) => g.services.length > 0);
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => seo.set({
      title: this.page()?.title ?? 'Workshop services and pricing',
      description: this.page()?.description ??
        'Servicing, diagnostics, brakes, suspension, painting, colour changes, detailing and restoration at Naboo Automotive, with transparent TZS pricing.',
      path: this.pagePath(),
    }));
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { BUSINESS } from '../../core/business';
import { SeoService } from '../../core/seo.service';
import { SiteContentStore, WorkshopItemKind } from '../../core/site-content';

@Component({
  selector: 'app-workshop',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './workshop.html',
  styleUrl: './workshop.css',
})
export class Workshop {
  private readonly site = inject(SiteContentStore);

  protected readonly business = BUSINESS;
  protected readonly filter = signal<WorkshopItemKind | 'all'>('all');
  protected readonly page = computed(() => this.site.content().workshopPage);
  protected readonly items = computed(() => this.site.content().workshopItems ?? []);

  protected readonly filters: { key: WorkshopItemKind | 'all'; label: string }[] = [
    { key: 'all', label: 'All work' },
    { key: 'before-after', label: 'Before & after' },
    { key: 'progress', label: 'Work in progress' },
    { key: 'completed', label: 'Completed' },
  ];

  protected readonly visible = computed(() => {
    const f = this.filter();
    const items = this.items();
    return f === 'all' ? items : items.filter((i) => i.kind === f);
  });

  protected readonly kindLabel: Record<WorkshopItemKind, string> = {
    'before-after': 'Before & after',
    progress: 'In progress',
    completed: 'Completed',
  };

  constructor() {
    this.site.load();
    inject(SeoService).set({
      title: 'Our workshop',
      description: 'Inside the Naboo Automotive workshop — repairs, painting, restoration and detailing, with before & after results.',
      path: '/about/workshop',
    });
  }
}

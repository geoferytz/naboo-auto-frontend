import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { Api } from '../core/api';
import { ADMIN_DASHBOARD } from '../core/admin-queries';
import { can } from '../core/capabilities';
import { AuthService } from '../core/auth.service';
import { DashboardSummary } from '../core/models';
import { formatNumber } from '../core/format';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

interface Stat {
  label: string;
  value: number;
  link: string | null;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MatIconModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Dashboard</h1>
      </div>
    </header>

    <div class="container section">
      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading dashboard…" (retry)="load()" />
      } @else {
        @for (group of groups(); track group.title) {
          <h2 class="group">{{ group.title }}</h2>
          <div class="grid">
            @for (s of group.stats; track s.label) {
              @if (s.link) {
                <a class="stat" [routerLink]="s.link">
                  <span class="value">{{ format(s.value) }}</span>
                  <span class="label">{{ s.label }}</span>
                </a>
              } @else {
                <div class="stat">
                  <span class="value">{{ format(s.value) }}</span>
                  <span class="label">{{ s.label }}</span>
                </div>
              }
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .group { margin: var(--space-5) 0 var(--space-3); font-size: 1.05rem; }
    .grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .stat { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-4);
      background: var(--naboo-white); border: 1px solid var(--naboo-border); border-radius: var(--radius-md);
      color: inherit; text-decoration: none; }
    a.stat:hover { border-color: var(--naboo-red); }
    .value { font-size: 1.8rem; font-weight: 700; }
    .label { color: var(--naboo-text-muted); font-size: .9rem; }
  `,
})
export class AdminDashboard {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly format = formatNumber;

  constructor() {
    inject(SeoService).set({ title: 'Staff dashboard', description: 'Naboo Automotive staff dashboard.', path: '/admin', noIndex: true });
    this.load();
  }

  protected groups(): { title: string; stats: Stat[] }[] {
    const s = this.summary();
    const roles = this.auth.user()?.roles;
    if (!s) return [];
    return [
      {
        title: 'Enquiries',
        stats: [
          { label: 'New sales enquiries', value: s.newSalesEnquiries, link: can.vehicleManage(roles) ? '/admin/sales-enquiries' : null },
          { label: 'Open sales enquiries', value: s.openSalesEnquiries, link: can.vehicleManage(roles) ? '/admin/sales-enquiries' : null },
          { label: 'New messages', value: s.newContactEnquiries, link: can.contactEnquiries(roles) ? '/admin/contact-enquiries' : null },
        ],
      },
      {
        title: 'Vehicles',
        stats: [
          { label: 'Available', value: s.vehiclesAvailable, link: can.vehicleManage(roles) ? '/admin/vehicles' : null },
          { label: 'Reserved', value: s.vehiclesReserved, link: can.vehicleManage(roles) ? '/admin/vehicles' : null },
          { label: 'Sold', value: s.vehiclesSold, link: can.vehicleManage(roles) ? '/admin/vehicles' : null },
          { label: 'Unpublished', value: s.vehiclesUnpublished, link: can.vehicleManage(roles) ? '/admin/vehicles' : null },
        ],
      },
    ];
  }

  protected load(): void {
    this.state.set('loading');
    this.api.query<{ adminDashboard: DashboardSummary }>(ADMIN_DASHBOARD).subscribe({
      next: ({ adminDashboard }) => {
        this.summary.set(adminDashboard);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}

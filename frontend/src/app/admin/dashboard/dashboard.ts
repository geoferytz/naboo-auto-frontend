import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { Api } from '../../core/api';
import { ADMIN_DASHBOARD } from '../../core/admin-queries';
import { can } from '../../core/capabilities';
import { AuthService } from '../../core/auth.service';
import { DashboardSummary, Money } from '../../core/models';
import { formatMoney, formatNumber } from '../../core/format';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

interface Stat {
  label: string;
  value: number | Money;
  link: string | null;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MatIconModule, LoadState, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly format = formatNumber;
  protected readonly money = formatMoney;
  protected readonly today = new Date();
  protected readonly firstName = this.auth.user()?.fullName.split(' ')[0] ?? 'there';

  protected get greeting(): string {
    const h = this.today.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  constructor() {
    inject(SeoService).set({ title: 'Staff dashboard', description: 'Naboo Automotive staff dashboard.', path: '/admin', noIndex: true });
    this.load();
  }

  protected groups(): { title: string; icon: string; stats: Stat[] }[] {
    const s = this.summary();
    const roles = this.auth.user()?.roles;
    if (!s) return [];
    return [
      {
        title: 'Enquiries',
        icon: 'forum',
        stats: [
          { label: 'New sales enquiries', value: s.newSalesEnquiries, link: can.vehicleManage(roles) ? '/admin/sales-enquiries' : null, icon: 'mark_email_unread' },
          { label: 'Open sales enquiries', value: s.openSalesEnquiries, link: can.vehicleManage(roles) ? '/admin/sales-enquiries' : null, icon: 'mail' },
          { label: 'New messages', value: s.newContactEnquiries, link: can.contactEnquiries(roles) ? '/admin/contact-enquiries' : null, icon: 'chat_bubble' },
        ],
      },
      {
        title: 'Vehicles',
        icon: 'directions_car',
        stats: [
          { label: 'Available', value: s.vehiclesAvailable, link: can.vehicleManage(roles) ? '/admin/vehicles' : null, icon: 'check_circle' },
          { label: 'Reserved', value: s.vehiclesReserved, link: can.vehicleManage(roles) ? '/admin/vehicles' : null, icon: 'bookmark' },
          { label: 'Sold', value: s.vehiclesSold, link: can.vehicleManage(roles) ? '/admin/vehicles' : null, icon: 'sell' },
          { label: 'Unpublished', value: s.vehiclesUnpublished, link: can.vehicleManage(roles) ? '/admin/vehicles' : null, icon: 'visibility_off' },
        ],
      },
      {
        title: 'Operations',
        icon: 'build',
        stats: [
          { label: 'Pending reservations', value: s.pendingReservations, link: can.rentalManage(roles) ? '/admin/reservations' : null, icon: 'event_available' },
          { label: 'Pending bookings', value: s.pendingBookings, link: can.bookingManage(roles) ? '/admin/bookings' : null, icon: 'calendar_month' },
          { label: 'Open quotations', value: s.openQuotations, link: can.quotationManage(roles) ? '/admin/quotations' : null, icon: 'request_quote' },
          { label: 'Active jobs', value: s.activeJobs, link: can.workshopManage(roles) ? '/admin/jobs' : null, icon: 'handyman' },
          { label: 'Open orders', value: s.openOrders, link: can.orderManage(roles) ? '/admin/orders' : null, icon: 'shopping_cart' },
          { label: 'Low-stock items', value: s.lowStockItems, link: can.inventoryManage(roles) ? '/admin/accessories' : null, icon: 'inventory_2' },
        ],
      },
      {
        title: 'Finance',
        icon: 'payments',
        stats: [
          { label: 'Revenue this month', value: s.revenueThisMonth, link: can.billingManage(roles) ? '/admin/invoices' : null, icon: 'monitoring' },
          { label: 'Unpaid invoices', value: s.unpaidInvoices, link: can.billingManage(roles) ? '/admin/invoices' : null, icon: 'receipt_long' },
          { label: 'Outstanding receivables', value: s.outstandingReceivables, link: can.billingManage(roles) ? '/admin/invoices' : null, icon: 'account_balance_wallet' },
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

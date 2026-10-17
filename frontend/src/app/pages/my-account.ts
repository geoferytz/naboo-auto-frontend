import { DatePipe } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DocumentNode } from 'graphql';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { formatMoney } from '../core/format';
import {
  BookingStatus,
  Invoice,
  InvoiceStatus,
  Notification as AppNotification,
  Order,
  OrderStatus,
  Page,
  Quotation,
  QuotationStatus,
  Reservation,
  ReservationStatus,
  ServiceBooking,
} from '../core/models';
import {
  CANCEL_MY_BOOKING,
  CANCEL_MY_ORDER,
  CANCEL_MY_RESERVATION,
  DECIDE_QUOTATION,
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
  MY_BOOKINGS,
  MY_INVOICES,
  MY_NOTIFICATIONS,
  MY_ORDERS,
  MY_QUOTATIONS,
  MY_RESERVATIONS,
} from '../core/queries';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const RES_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const BOOKING_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Missed',
};

const QUOTE_LABELS: Record<QuotationStatus, string> = {
  REQUESTED: 'Awaiting our price',
  QUOTED: 'Price ready — please decide',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

const ORDER_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  READY: 'Ready for collection',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Being prepared',
  ISSUED: 'Payment due',
  PAID: 'Paid',
  VOID: 'Void',
};

const WORK_LABELS: Record<string, string> = {
  PAINTING: 'Painting',
  COLOUR_CHANGE: 'Colour change',
  DETAILING: 'Detailing',
  RESTORATION: 'Restoration',
  REPAIR: 'Repair',
  MAINTENANCE: 'Maintenance',
  ACCESSORIES: 'Accessories',
  OTHER: 'Other work',
};

@Component({
  selector: 'app-my-account',
  imports: [RouterLink, DatePipe, MatButtonModule, LoadState],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">My account</span>
        <h1>{{ auth.user() ? 'Welcome, ' + auth.user()!.fullName : 'My account' }}</h1>
      </div>
    </header>
    <div class="container section">
      @if (auth.user(); as u) {
        @if (loadFailed()) {
          <p class="load-error" role="alert">
            One or more sections couldn't load.
            <button mat-button type="button" (click)="loadAll()">Try again</button>
          </p>
        }
        <div class="grid">
          <section class="card panel" aria-labelledby="profile">
            <h2 id="profile">Profile</h2>
            <dl>
              <dt>Name</dt><dd>{{ u.fullName }}</dd>
              <dt>Email</dt><dd>{{ u.email }}</dd>
              <dt>Phone</dt><dd>{{ u.phone ?? 'Not provided' }}</dd>
            </dl>
            <button mat-stroked-button type="button" (click)="auth.logout()">Sign out</button>
          </section>

          <section class="card panel" aria-labelledby="notifications">
            <div class="panel-head">
              <h2 id="notifications">Notifications</h2>
              @if (unreadCount() > 0) {
                <button mat-button type="button" [disabled]="busy()" (click)="markAllRead()">Mark all read</button>
              }
            </div>
            @if (notifications(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No notifications yet.</p>
              }
              <ul class="rows">
                @for (n of page.items; track n.id) {
                  <li [class.unread]="!n.read">
                    <div class="row-main">
                      <strong>{{ n.title }}</strong>
                      <span class="meta">{{ n.body }}</span>
                      <span class="meta">{{ n.createdAt | date: 'medium' }}</span>
                    </div>
                    @if (!n.read) {
                      <button mat-button type="button" [disabled]="busy()" (click)="markRead(n)">Mark read</button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>

          <section class="card panel" aria-labelledby="quotes">
            <h2 id="quotes">Quotations</h2>
            @if (quotations(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No quotations yet. <a routerLink="/services">Browse services</a> to request one.</p>
              }
              <ul class="rows">
                @for (q of page.items; track q.id) {
                  <li>
                    <div class="row-main">
                      <strong>{{ workLabel(q.workType) }}{{ q.serviceName ? ' · ' + q.serviceName : '' }}</strong>
                      <span class="meta">{{ q.reference }} · {{ q.createdAt | date: 'mediumDate' }}</span>
                      @if (q.status === 'QUOTED' && q.quotedAmount) {
                        <span class="price">{{ formatMoney(q.quotedAmount) }}
                          <span class="meta"> — valid until {{ q.validUntil | date: 'mediumDate' }}</span></span>
                      }
                    </div>
                    <span class="badge" [attr.data-status]="q.status">{{ quoteLabel(q.status) }}</span>
                    @if (q.status === 'QUOTED') {
                      <div class="row-actions">
                        <button mat-flat-button type="button" [disabled]="busy()" (click)="decide(q, true)">Accept</button>
                        <button mat-stroked-button type="button" [disabled]="busy()" (click)="decide(q, false)">Decline</button>
                      </div>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>

          <section class="card panel" aria-labelledby="bookings">
            <h2 id="bookings">Service bookings</h2>
            @if (bookings(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No bookings yet. <a routerLink="/services">Book a service</a>.</p>
              }
              <ul class="rows">
                @for (b of page.items; track b.id) {
                  <li>
                    <div class="row-main">
                      <strong>{{ b.service.name }}</strong>
                      <span class="meta">{{ b.reference }} · {{ b.scheduledStart | date: 'medium' }}</span>
                      <span class="meta">{{ b.vehicleDescription }}</span>
                    </div>
                    <span class="badge" [attr.data-status]="b.status">{{ bookingLabel(b.status) }}</span>
                    @if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                      <button mat-stroked-button type="button" [disabled]="busy()" (click)="cancelBooking(b)">Cancel</button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>

          <section class="card panel" aria-labelledby="orders">
            <h2 id="orders">Accessory orders</h2>
            @if (orders(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No orders yet. <a routerLink="/accessories">Browse the shop</a>.</p>
              }
              <ul class="rows">
                @for (o of page.items; track o.id) {
                  <li>
                    <div class="row-main">
                      <strong>{{ o.reference }}</strong>
                      <span class="meta">{{ o.items.map((i) => i.quantity + ' × ' + i.description).join(', ') }}</span>
                      <span class="price">{{ formatMoney(o.total) }}</span>
                    </div>
                    <span class="badge" [attr.data-status]="o.status">{{ orderLabel(o.status) }}</span>
                    @if (o.status === 'PENDING') {
                      <button mat-stroked-button type="button" [disabled]="busy()" (click)="cancelOrder(o)">Cancel</button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>

          <section class="card panel" aria-labelledby="invoices">
            <h2 id="invoices">Invoices</h2>
            @if (invoices(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No invoices yet.</p>
              }
              <ul class="rows">
                @for (inv of page.items; track inv.id) {
                  <li>
                    <div class="row-main">
                      <strong>{{ inv.reference }}</strong>
                      <span class="meta">{{ inv.items.map((i) => i.quantity + ' × ' + i.description).join(', ') }}</span>
                      <span class="price">{{ formatMoney(inv.total) }}
                        @if (inv.status === 'ISSUED') {
                          <span class="meta">— balance {{ formatMoney(inv.balance) }}{{ inv.dueDate ? ', due ' + (inv.dueDate | date: 'mediumDate') : '' }}</span>
                        }
                      </span>
                    </div>
                    <span class="badge" [attr.data-status]="inv.status">{{ invoiceLabel(inv.status) }}</span>
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>

          <section class="card panel" aria-labelledby="rentals">
            <h2 id="rentals">Rental reservations</h2>
            @if (reservations(); as page) {
              @if (!page.totalCount) {
                <p class="empty">No reservations yet. <a routerLink="/rentals">Browse rental vehicles</a>.</p>
              }
              <ul class="rows">
                @for (r of page.items; track r.id) {
                  <li>
                    <div class="row-main">
                      <strong>{{ r.vehicle.title }}</strong>
                      <span class="meta">{{ r.reference }} · {{ r.startDate | date: 'mediumDate' }} →
                        {{ r.endDate | date: 'mediumDate' }} ({{ r.days }} days)</span>
                      <span class="price">{{ formatMoney(r.total) }}</span>
                    </div>
                    <span class="badge" [attr.data-status]="r.status">{{ resLabel(r.status) }}</span>
                    @if (r.status === 'PENDING' || r.status === 'CONFIRMED') {
                      <button mat-stroked-button type="button" [disabled]="busy()" (click)="cancelReservation(r)">Cancel</button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <app-load-state state="loading" loadingText="Loading…" />
            }
          </section>
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
      } @else {
        <app-load-state state="loading" loadingText="Loading your account…" />
      }
    </div>
  `,
  styles: `
    .grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items: start; }
    .panel { padding: var(--space-5); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .panel-head h2 { margin: 0; }
    .rows li.unread { background: #fff8e6; margin-inline: calc(var(--space-3) * -1); padding-inline: var(--space-3);
      border-radius: var(--radius-sm); }
    .load-error { display: flex; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-4);
      padding: var(--space-3) var(--space-4); background: #fde8e9; color: #a3121c; border-radius: var(--radius-sm);
      font-weight: 600; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin: 0 0 var(--space-5); }
    dt { color: var(--naboo-text-muted); }
    dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
    .rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .rows li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-3) 0;
      border-top: 1px solid var(--naboo-border); }
    .row-main { flex: 1; min-width: 180px; }
    .meta { display: block; font-size: .82rem; color: var(--naboo-text-muted); }
    .price { font-weight: 700; display: block; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey);
      white-space: nowrap; }
    .badge[data-status='PENDING'], .badge[data-status='REQUESTED'], .badge[data-status='ISSUED'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='QUOTED'] { background: #fde8e9; color: #a3121c; }
    .badge[data-status='CONFIRMED'], .badge[data-status='ACCEPTED'], .badge[data-status='COMPLETED'],
    .badge[data-status='READY'], .badge[data-status='PAID'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='ACTIVE'], .badge[data-status='IN_PROGRESS'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='CANCELLED'], .badge[data-status='DECLINED'], .badge[data-status='EXPIRED'], .badge[data-status='NO_SHOW'],
    .badge[data-status='DRAFT'], .badge[data-status='VOID'] {
      background: #eceef1; color: #5a616b; }
    .row-actions { display: flex; gap: var(--space-2); }
    .empty { color: var(--naboo-text-muted); }
  `,
})
export class MyAccount {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);

  protected readonly reservations = signal<Page<Reservation> | null>(null);
  protected readonly bookings = signal<Page<ServiceBooking> | null>(null);
  protected readonly quotations = signal<Page<Quotation> | null>(null);
  protected readonly orders = signal<Page<Order> | null>(null);
  protected readonly invoices = signal<Page<Invoice> | null>(null);
  protected readonly notifications = signal<Page<AppNotification> | null>(null);
  protected readonly unreadCount = signal(0);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadFailed = signal(false);

  protected readonly formatMoney = formatMoney;
  protected readonly resLabel = (s: ReservationStatus) => RES_LABELS[s];
  protected readonly bookingLabel = (s: BookingStatus) => BOOKING_LABELS[s];
  protected readonly quoteLabel = (s: QuotationStatus) => QUOTE_LABELS[s];
  protected readonly orderLabel = (s: OrderStatus) => ORDER_LABELS[s];
  protected readonly invoiceLabel = (s: InvoiceStatus) => INVOICE_LABELS[s];
  protected readonly workLabel = (w: string) => WORK_LABELS[w] ?? w;

  constructor() {
    inject(SeoService).set({ title: 'My account', description: 'Your Naboo Automotive account.', path: '/my-account', noIndex: true });
    this.loadAll();
  }

  protected loadAll(): void {
    this.loadFailed.set(false);
    this.loadPanel(MY_RESERVATIONS, { size: 20 }, this.reservations);
    this.loadPanel(MY_BOOKINGS, { size: 20 }, this.bookings);
    this.loadPanel(MY_QUOTATIONS, { size: 20 }, this.quotations);
    this.loadPanel(MY_ORDERS, { size: 20 }, this.orders);
    this.loadPanel(MY_INVOICES, { size: 20 }, this.invoices);
    this.loadNotifications();
  }

  /** Loads one page signal; on failure shows an empty panel and raises the retry banner. */
  private loadPanel<T>(doc: DocumentNode, vars: Record<string, unknown>, target: WritableSignal<Page<T> | null>): void {
    this.api.query<Record<string, Page<T>>>(doc, vars).subscribe({
      next: (d) => target.set(Object.values(d)[0]),
      error: () => {
        target.set({ items: [], totalCount: 0, page: 0, size: 20, totalPages: 0 });
        this.loadFailed.set(true);
      },
    });
  }

  private loadNotifications(): void {
    this.api
      .query<{ myNotifications: Page<AppNotification> }>(MY_NOTIFICATIONS, { size: 30 })
      .subscribe({
        next: (d) => {
          this.notifications.set(d.myNotifications);
          this.unreadCount.set(d.myNotifications.items.filter((n) => !n.read).length);
        },
        error: () => {
          this.notifications.set({ items: [], totalCount: 0, page: 0, size: 30, totalPages: 0 });
          this.loadFailed.set(true);
        },
      });
  }

  protected markRead(n: AppNotification): void {
    this.busy.set(true);
    this.api.mutate(MARK_NOTIFICATION_READ, { id: n.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.notifications.update((p) =>
          p ? { ...p, items: p.items.map((i) => (i.id === n.id ? { ...i, read: true } : i)) } : p,
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected markAllRead(): void {
    this.busy.set(true);
    this.api.mutate(MARK_ALL_NOTIFICATIONS_READ).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadNotifications();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected cancelOrder(o: Order): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(CANCEL_MY_ORDER, { id: o.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.orders.update((p) =>
          p ? { ...p, items: p.items.map((i) => (i.id === o.id ? { ...i, status: 'CANCELLED' } : i)) } : p,
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected decide(q: Quotation, accept: boolean): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(DECIDE_QUOTATION, { id: q.id, accept }).subscribe({
      next: () => {
        this.busy.set(false);
        this.quotations.update((p) =>
          p ? { ...p, items: p.items.map((i) => (i.id === q.id ? { ...i, status: accept ? 'ACCEPTED' : 'DECLINED' } : i)) } : p,
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected cancelBooking(b: ServiceBooking): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(CANCEL_MY_BOOKING, { id: b.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.bookings.update((p) =>
          p ? { ...p, items: p.items.map((i) => (i.id === b.id ? { ...i, status: 'CANCELLED' } : i)) } : p,
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected cancelReservation(r: Reservation): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(CANCEL_MY_RESERVATION, { id: r.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.reservations.update((p) =>
          p ? { ...p, items: p.items.map((i) => (i.id === r.id ? { ...i, status: 'CANCELLED' } : i)) } : p,
        );
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}

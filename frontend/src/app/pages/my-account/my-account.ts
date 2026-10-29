import { DatePipe } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DocumentNode } from 'graphql';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/format';
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
} from '../../core/models';
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
} from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

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
  templateUrl: './my-account.html',
  styleUrl: './my-account.css',
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

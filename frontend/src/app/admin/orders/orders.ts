import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../../core/api';
import { ORDERS, UPDATE_ORDER } from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { Order, OrderStatus, Page } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const NEXT: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Confirm' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  CONFIRMED: [
    { status: 'READY', label: 'Ready for collection' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  READY: [
    { status: 'COMPLETED', label: 'Complete' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, MatButtonModule, MatButtonToggleModule, LoadState],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class AdminOrders {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<Order> | null>(null);
  protected readonly items = signal<Order[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as OrderStatus[];
  protected readonly label = (s: OrderStatus) => LABELS[s];
  protected readonly next = (s: OrderStatus) => NEXT[s];
  protected readonly formatMoney = formatMoney;

  constructor() {
    inject(SeoService).set({ title: 'Orders', description: '', path: '/admin/orders', noIndex: true });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ orders: Page<Order> }>(ORDERS, { status: this.statusFilter() || null, page, size: 20 })
      .subscribe({
        next: ({ orders }) => {
          this.page.set(orders);
          this.items.set(orders.items);
          this.state.set(orders.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected update(o: Order, status: OrderStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(UPDATE_ORDER, { id: o.id, status }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === o.id ? { ...i, status } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}

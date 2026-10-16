import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { Api, toApiError } from '../core/api';
import { ORDERS, UPDATE_ORDER } from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { Order, OrderStatus, Page } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Accessory orders</h1>
      </div>
    </header>

    <div class="container section">
      <mat-button-toggle-group [value]="statusFilter()" (change)="setFilter($event.value)" aria-label="Filter by status">
        <mat-button-toggle value="">All</mat-button-toggle>
        @for (s of statusKeys; track s) {
          <mat-button-toggle [value]="s">{{ label(s) }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading orders…" emptyText="No orders in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (o of items(); track o.id) {
            <article class="card row">
              <div class="main">
                <div class="line">
                  <span class="ref">{{ o.reference }}</span>
                  <span class="badge" [attr.data-status]="o.status">{{ label(o.status) }}</span>
                </div>
                <ul class="lines">
                  @for (i of o.items; track i.id) {
                    <li>{{ i.quantity }} × {{ i.description }} — {{ formatMoney(i.lineTotal) }}</li>
                  }
                </ul>
                <span class="price">Total: {{ formatMoney(o.total) }}</span>
                <span class="meta">{{ o.fullName }} · {{ o.phone }} · {{ o.email }} · {{ o.createdAt | date: 'short' }}</span>
                @if (o.notes) {
                  <span class="meta notes">“{{ o.notes }}”</span>
                }
              </div>
              <div class="actions">
                @for (n of next(o.status); track n.status) {
                  @if (n.status === 'CANCELLED') {
                    <button mat-stroked-button type="button" [disabled]="busy()" (click)="update(o, n.status)">{{ n.label }}</button>
                  } @else {
                    <button mat-flat-button type="button" [disabled]="busy()" (click)="update(o, n.status)">{{ n.label }}</button>
                  }
                }
              </div>
            </article>
          }
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
      }
    </div>
  `,
  styles: `
    mat-button-toggle-group { margin-bottom: var(--space-4); flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); padding: var(--space-4); flex-wrap: wrap; }
    .line { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .notes { font-style: italic; }
    .lines { margin: var(--space-1) 0; padding-left: var(--space-5); }
    .price { font-weight: 700; display: block; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='PENDING'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='CONFIRMED'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='READY'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='COMPLETED'] { background: #eceef1; color: #5a616b; }
    .badge[data-status='CANCELLED'] { background: #f5e3e3; color: #8a1e1e; }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  `,
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

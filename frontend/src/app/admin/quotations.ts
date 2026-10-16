import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../core/api';
import { CANCEL_QUOTATION, PRICE_QUOTATION, QUOTATIONS } from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { Page, Quotation, QuotationStatus } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

const LABELS: Record<QuotationStatus, string> = {
  REQUESTED: 'Needs pricing',
  QUOTED: 'Sent to customer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
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
  selector: 'app-admin-quotations',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container">
        <span class="eyebrow">Staff</span>
        <h1>Quotations</h1>
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
        <app-load-state [state]="state()" loadingText="Loading quotations…" emptyText="No quotations in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (q of items(); track q.id) {
            <article class="card quote">
              <div class="top">
                <div class="main">
                  <div class="line">
                    <span class="ref">{{ q.reference }}</span>
                    <span class="badge" [attr.data-status]="q.status">{{ label(q.status) }}</span>
                  </div>
                  <strong>{{ workLabel(q.workType) }}{{ q.serviceName ? ' · ' + q.serviceName : '' }}</strong>
                  <span class="meta">{{ q.vehicleDescription }} — {{ q.description }}</span>
                  <span class="meta">{{ q.fullName }} · {{ q.phone }} · {{ q.email }}</span>
                  @if (q.quotedAmount) {
                    <span class="price">{{ formatMoney(q.quotedAmount) }}
                      <span class="meta">valid until {{ q.validUntil | date: 'mediumDate' }}</span></span>
                  }
                </div>
                @if (q.status === 'REQUESTED' || q.status === 'QUOTED') {
                  <form [formGroup]="quoteForm" (ngSubmit)="price(q)" class="price-form" [attr.aria-label]="'Price quotation ' + q.reference">
                    <mat-form-field appearance="outline">
                      <mat-label>Amount (TZS)</mat-label>
                      <input matInput formControlName="quotedAmount" inputmode="decimal" />
                      <mat-error>Enter the quoted amount.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Valid until</mat-label>
                      <input matInput formControlName="validUntil" type="date" [min]="tomorrow" />
                      <mat-error>Choose a future date.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Note to customer (optional)</mat-label>
                      <input matInput formControlName="staffNotes" maxlength="500" />
                    </mat-form-field>
                    <div class="actions">
                      <button mat-flat-button type="submit" [disabled]="busy()">
                        {{ q.status === 'QUOTED' ? 'Update price' : 'Send price' }}
                      </button>
                      <button mat-stroked-button type="button" [disabled]="busy()" (click)="cancel(q)">Cancel quotation</button>
                    </div>
                  </form>
                }
                @if (q.staffNotes) {
                  <span class="meta notes">Your note: “{{ q.staffNotes }}”</span>
                }
              </div>
            </article>
          }
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
        @if ((page()?.totalPages ?? 0) > 1) {
          <nav class="pager" aria-label="Pages">
            <button mat-stroked-button type="button" [disabled]="page()!.page === 0" (click)="load(page()!.page - 1)">Previous</button>
            <span>Page {{ page()!.page + 1 }} of {{ page()!.totalPages }}</span>
            <button mat-stroked-button type="button" [disabled]="page()!.page + 1 >= page()!.totalPages" (click)="load(page()!.page + 1)">Next</button>
          </nav>
        }
      }
    </div>
  `,
  styles: `
    mat-button-toggle-group { margin-bottom: var(--space-4); flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .quote { padding: var(--space-4); }
    .top { display: grid; gap: var(--space-4); }
    .line { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .notes { font-style: italic; }
    .price { font-weight: 700; font-size: 1.05rem; display: block; margin-top: var(--space-1); }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='REQUESTED'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='QUOTED'] { background: #e3e8f5; color: #1e3f8a; }
    .badge[data-status='ACCEPTED'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='DECLINED'], .badge[data-status='EXPIRED'], .badge[data-status='CANCELLED'] { background: #eceef1; color: #5a616b; }
    .price-form { display: flex; flex-direction: column; gap: var(--space-2); }
    .price-form .actions { display: flex; gap: var(--space-2); }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-5); }
    @media (min-width: 860px) { .top { grid-template-columns: 1fr 320px; align-items: start; } }
  `,
})
export class AdminQuotations {
  private readonly api = inject(Api);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly page = signal<Page<Quotation> | null>(null);
  protected readonly items = signal<Quotation[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as QuotationStatus[];
  protected readonly label = (s: QuotationStatus) => LABELS[s];
  protected readonly workLabel = (w: string) => WORK_LABELS[w] ?? w;
  protected readonly formatMoney = formatMoney;
  protected readonly tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  protected readonly quoteForm = inject(FormBuilder).nonNullable.group({
    quotedAmount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    validUntil: ['', Validators.required],
    staffNotes: ['', Validators.maxLength(500)],
  });

  constructor() {
    inject(SeoService).set({ title: 'Quotations', description: '', path: '/admin/quotations', noIndex: true });
    this.load(0);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ quotations: Page<Quotation> }>(QUOTATIONS, { status: this.statusFilter() || null, page, size: 20 })
      .subscribe({
        next: ({ quotations }) => {
          this.page.set(quotations);
          this.items.set(quotations.items);
          this.state.set(quotations.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected price(q: Quotation): void {
    if (this.quoteForm.invalid) {
      this.quoteForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const v = this.quoteForm.getRawValue();
    this.api
      .mutate(PRICE_QUOTATION, { id: q.id, input: { ...v, staffNotes: v.staffNotes || null } })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.quoteForm.reset();
          this.load(this.page()?.page ?? 0);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(toApiError(e).message);
        },
      });
  }

  protected cancel(q: Quotation): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(CANCEL_QUOTATION, { id: q.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === q.id ? { ...i, status: 'CANCELLED' } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}

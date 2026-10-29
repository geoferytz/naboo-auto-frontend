import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Api, toApiError } from '../../core/api';
import { CANCEL_QUOTATION, PRICE_QUOTATION, QUOTATIONS } from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { Page, Quotation, QuotationStatus } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

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
  templateUrl: './quotations.html',
  styleUrl: './quotations.css',
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

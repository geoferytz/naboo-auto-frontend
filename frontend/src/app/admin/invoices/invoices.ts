import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../../core/api';
import { CREATE_INVOICE, INVOICES, ISSUE_INVOICE, RECORD_PAYMENT, VOID_INVOICE } from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { Invoice, InvoiceStatus, Page, PaymentMethod } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

const LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PAID: 'Paid',
  VOID: 'Void',
};

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'TIGOPESA', label: 'Tigo Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
];

@Component({
  selector: 'app-admin-invoices',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    LoadState,
  ],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
})
export class AdminInvoices {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly items = signal<Invoice[]>([]);
  protected readonly statusFilter = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly payingFor = signal<string | null>(null);
  protected readonly statusKeys = Object.keys(LABELS) as InvoiceStatus[];
  protected readonly label = (s: InvoiceStatus) => LABELS[s];
  protected readonly methods = METHODS;
  protected readonly methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.value === m)?.label ?? m;
  protected readonly formatMoney = formatMoney;
  protected readonly tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  protected readonly createForm = this.fb.nonNullable.group({
    recipientName: ['', [Validators.required, Validators.maxLength(120)]],
    recipientEmail: ['', [Validators.required, Validators.email]],
    dueDate: [''],
    items: this.fb.nonNullable.array([
      this.fb.nonNullable.group({
        description: ['', [Validators.required, Validators.maxLength(300)]],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      }),
    ]),
  });

  protected readonly payForm = this.fb.nonNullable.group({
    amount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    method: ['CASH' as PaymentMethod, Validators.required],
    reference: ['', Validators.maxLength(60)],
  });

  protected get formLines(): FormArray {
    return this.createForm.controls.items;
  }

  constructor() {
    inject(SeoService).set({ title: 'Invoices', description: '', path: '/admin/invoices', noIndex: true });
    this.load(0);
  }

  protected addLine(): void {
    this.formLines.push(
      this.fb.nonNullable.group({
        description: ['', [Validators.required, Validators.maxLength(300)]],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      }),
    );
  }

  protected removeLine(i: number): void {
    this.formLines.removeAt(i);
  }

  protected setFilter(status: string): void {
    this.statusFilter.set(status);
    this.load(0);
  }

  protected load(page = 0): void {
    this.state.set('loading');
    this.api
      .query<{ invoices: Page<Invoice> }>(INVOICES, { status: this.statusFilter() || null, page, size: 20 })
      .subscribe({
        next: ({ invoices }) => {
          this.items.set(invoices.items);
          this.state.set(invoices.items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.createError.set(null);
    this.busy.set(true);
    const v = this.createForm.getRawValue();
    this.api
      .mutate(CREATE_INVOICE, {
        input: {
          recipientName: v.recipientName,
          recipientEmail: v.recipientEmail,
          dueDate: v.dueDate || null,
          items: v.items,
          customerUserId: null, bookingId: null, orderId: null, quotationId: null, notes: null,
        },
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.createForm.reset();
          while (this.formLines.length > 1) this.formLines.removeAt(0);
          this.showCreate.set(false);
          this.load(0);
        },
        error: (e) => {
          this.busy.set(false);
          this.createError.set(toApiError(e).message);
        },
      });
  }

  protected issue(inv: Invoice): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(ISSUE_INVOICE, { id: inv.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === inv.id ? { ...i, status: 'ISSUED' } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected void(inv: Invoice): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(VOID_INVOICE, { id: inv.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.items.update((list) => list.map((i) => (i.id === inv.id ? { ...i, status: 'VOID' } : i)));
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected openPayment(inv: Invoice): void {
    this.payingFor.set(inv.id);
    this.payForm.reset({ amount: inv.balance.amount, method: 'CASH', reference: '' });
  }

  protected pay(inv: Invoice): void {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const v = this.payForm.getRawValue();
    this.api
      .mutate(RECORD_PAYMENT, { invoiceId: inv.id, input: { ...v, reference: v.reference || null, paidAt: null, note: null } })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.payingFor.set(null);
          this.load(0);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(toApiError(e).message);
        },
      });
  }
}

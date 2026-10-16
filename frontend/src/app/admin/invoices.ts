import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../core/api';
import { CREATE_INVOICE, INVOICES, ISSUE_INVOICE, RECORD_PAYMENT, VOID_INVOICE } from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { Invoice, InvoiceStatus, Page, PaymentMethod } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Invoices</h1>
        </div>
        <button mat-flat-button type="button" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? 'Close form' : 'New invoice' }}
        </button>
      </div>
    </header>

    <div class="container section">
      @if (showCreate()) {
        <form [formGroup]="createForm" (ngSubmit)="create()" class="card create" novalidate>
          <div class="two">
            <mat-form-field appearance="outline">
              <mat-label>Recipient name</mat-label>
              <input matInput formControlName="recipientName" maxlength="120" />
              <mat-error>Who is this invoice for?</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Recipient email</mat-label>
              <input matInput formControlName="recipientEmail" type="email" />
              <mat-error>Enter a valid email.</mat-error>
            </mat-form-field>
          </div>
          <div formArrayName="items" class="items">
            @for (line of formLines.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="item-row">
                <mat-form-field appearance="outline" class="desc">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description" maxlength="300" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="qty">
                  <mat-label>Qty</mat-label>
                  <input matInput formControlName="quantity" type="number" min="1" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="unit">
                  <mat-label>Unit price (TZS)</mat-label>
                  <input matInput formControlName="unitPrice" inputmode="decimal" />
                </mat-form-field>
                <button mat-icon-button type="button" [disabled]="formLines.length === 1" aria-label="Remove line" (click)="removeLine(i)">
                  <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
                </button>
              </div>
            }
          </div>
          <div class="create-actions">
            <button mat-stroked-button type="button" (click)="addLine()">+ Add line</button>
            <mat-form-field appearance="outline" class="due">
              <mat-label>Due date (optional)</mat-label>
              <input matInput formControlName="dueDate" type="date" [min]="tomorrow" />
            </mat-form-field>
          </div>
          @if (createError()) {
            <p class="alert alert--error" role="alert">{{ createError() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="busy()">Create draft invoice</button>
        </form>
      }

      <mat-button-toggle-group [value]="statusFilter()" (change)="setFilter($event.value)" aria-label="Filter by status">
        <mat-button-toggle value="">All</mat-button-toggle>
        @for (s of statusKeys; track s) {
          <mat-button-toggle [value]="s">{{ label(s) }}</mat-button-toggle>
        }
      </mat-button-toggle-group>

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading invoices…" emptyText="No invoices in this state." (retry)="load()" />
      } @else {
        <div class="list">
          @for (inv of items(); track inv.id) {
            <article class="card invoice">
              <div class="top">
                <div class="line">
                  <span class="ref">{{ inv.reference }}</span>
                  <span class="badge" [attr.data-status]="inv.status">{{ label(inv.status) }}</span>
                </div>
                <strong>{{ inv.recipientName }}</strong>
                <span class="meta">{{ inv.recipientEmail }}{{ inv.dueDate ? ' · due ' + (inv.dueDate | date: 'mediumDate') : '' }}</span>
              </div>
              <ul class="lines">
                @for (it of inv.items; track it.id) {
                  <li>{{ it.quantity }} × {{ it.description }} — {{ formatMoney(it.lineTotal) }}</li>
                }
              </ul>
              <div class="totals">
                <span>Total <strong>{{ formatMoney(inv.total) }}</strong></span>
                <span>Paid <strong>{{ formatMoney(inv.paid) }}</strong></span>
                <span>Balance <strong>{{ formatMoney(inv.balance) }}</strong></span>
              </div>
              @if (inv.payments.length) {
                <ul class="payments">
                  @for (p of inv.payments; track p.id) {
                    <li>{{ formatMoney(p.amount) }} · {{ methodLabel(p.method) }} · {{ p.paidAt | date: 'short' }}{{ p.reference ? ' · ' + p.reference : '' }}</li>
                  }
                </ul>
              }
              <div class="actions">
                @if (inv.status === 'DRAFT') {
                  <button mat-flat-button type="button" [disabled]="busy()" (click)="issue(inv)">Issue</button>
                }
                @if (inv.status === 'ISSUED') {
                  <button mat-flat-button type="button" [disabled]="busy()" (click)="openPayment(inv)">Record payment</button>
                }
                @if (inv.status === 'DRAFT' || inv.status === 'ISSUED') {
                  <button mat-stroked-button type="button" [disabled]="busy()" (click)="void(inv)">Void</button>
                }
              </div>
              @if (payingFor() === inv.id) {
                <form [formGroup]="payForm" (ngSubmit)="pay(inv)" class="pay" novalidate>
                  <mat-form-field appearance="outline">
                    <mat-label>Amount (TZS, max {{ inv.balance.amount }})</mat-label>
                    <input matInput formControlName="amount" inputmode="decimal" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Method</mat-label>
                    <mat-select formControlName="method">
                      @for (m of methods; track m.value) {
                        <mat-option [value]="m.value">{{ m.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Reference (optional)</mat-label>
                    <input matInput formControlName="reference" maxlength="60" />
                  </mat-form-field>
                  <div class="pay-actions">
                    <button mat-flat-button type="submit" [disabled]="busy()">Record</button>
                    <button mat-button type="button" (click)="payingFor.set(null)">Cancel</button>
                  </div>
                </form>
              }
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
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .create { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
    .two { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .item-row { display: flex; gap: var(--space-2); align-items: start; }
    .item-row .desc { flex: 1; min-width: 160px; }
    .item-row .qty { width: 90px; }
    .item-row .unit { width: 160px; }
    .create-actions { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
    .due { width: 190px; }
    mat-button-toggle-group { margin-bottom: var(--space-4); flex-wrap: wrap; }
    .list { display: flex; flex-direction: column; gap: var(--space-3); }
    .invoice { padding: var(--space-4); }
    .line { display: flex; align-items: center; gap: var(--space-3); }
    .ref { font-family: ui-monospace, monospace; font-size: .85rem; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .85rem; color: var(--naboo-text-muted); }
    .lines, .payments { margin: var(--space-2) 0; padding-left: var(--space-5); font-size: .92rem; }
    .payments { color: var(--naboo-text-muted); font-size: .85rem; }
    .totals { display: flex; gap: var(--space-5); margin: var(--space-2) 0; }
    .badge { padding: 2px 10px; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--naboo-grey); }
    .badge[data-status='DRAFT'] { background: #eceef1; color: #5a616b; }
    .badge[data-status='ISSUED'] { background: #fff3d6; color: #8a5a00; }
    .badge[data-status='PAID'] { background: #e4f5e8; color: #146c2e; }
    .badge[data-status='VOID'] { background: #f5e3e3; color: #8a1e1e; }
    .actions { display: flex; gap: var(--space-2); }
    .pay { display: flex; gap: var(--space-2); align-items: start; flex-wrap: wrap; margin-top: var(--space-3);
      border-top: 1px solid var(--naboo-border); padding-top: var(--space-3); }
    .pay mat-form-field { width: 170px; }
    .pay-actions { display: flex; gap: var(--space-2); }
  `,
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

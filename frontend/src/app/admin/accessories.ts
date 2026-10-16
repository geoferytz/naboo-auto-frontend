import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../core/api';
import {
  ADJUST_STOCK,
  ADMIN_ACCESSORIES,
  CREATE_ACCESSORY,
  STOCK_MOVEMENTS,
  UPDATE_ACCESSORY,
} from '../core/admin-queries';
import { formatMoney } from '../core/format';
import { Accessory, Page, StockReason } from '../core/models';
import { SeoService } from '../core/seo.service';
import { LoadState } from '../shared/load-state';

@Component({
  selector: 'app-admin-accessories',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Accessories &amp; stock</h1>
        </div>
        <button mat-flat-button type="button" (click)="startNew()">
          {{ editing() === 'new' ? 'Close form' : 'New accessory' }}
        </button>
      </div>
    </header>

    <div class="container section">
      @if (editing(); as mode) {
        <form [formGroup]="form" (ngSubmit)="save()" class="card edit-form" novalidate>
          <h2>{{ mode === 'new' ? 'New accessory' : 'Edit ' + form.controls.name.value }}</h2>
          <div class="fields">
            <mat-form-field appearance="outline">
              <mat-label>SKU (blank = auto)</mat-label>
              <input matInput formControlName="sku" maxlength="30" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" maxlength="120" />
              <mat-error>Name the item.</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <input matInput formControlName="category" maxlength="60" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Price (TZS)</mat-label>
              <input matInput formControlName="priceAmount" inputmode="decimal" />
              <mat-error>Enter a valid price.</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Opening stock</mat-label>
              <input matInput formControlName="stockQuantity" type="number" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="2" maxlength="2000"></textarea>
            </mat-form-field>
            <mat-checkbox formControlName="active">Visible in the shop</mat-checkbox>
          </div>
          @if (editError()) {
            <p class="alert alert--error" role="alert">{{ editError() }}</p>
          }
          <div class="actions">
            <button mat-flat-button type="submit" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save' }}</button>
            <button mat-button type="button" (click)="editing.set(null)">Cancel</button>
          </div>
        </form>
      }

      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading accessories…" emptyText="No accessories yet." (retry)="load()" />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Shop</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td>
                    <strong>{{ a.name }}</strong>
                    <span class="meta">{{ a.sku }}{{ a.category ? ' · ' + a.category : '' }}</span>
                  </td>
                  <td>{{ formatMoney(a.price) }}</td>
                  <td [class.low]="a.stockQuantity < 5">{{ a.stockQuantity }}</td>
                  <td>{{ a.active ? 'Listed' : 'Hidden' }}</td>
                  <td class="row-actions">
                    <button mat-button type="button" (click)="startEdit(a)">Edit</button>
                    <button mat-button type="button" (click)="openAdjust(a)">Stock</button>
                    <button mat-button type="button" (click)="toggleMovements(a)">Log</button>
                  </td>
                </tr>
                @if (adjusting() === a.id) {
                  <tr class="sub">
                    <td colspan="5">
                      <form [formGroup]="adjustForm" (ngSubmit)="adjust(a)" class="adjust">
                        <mat-form-field appearance="outline">
                          <mat-label>Change (+/−)</mat-label>
                          <input matInput formControlName="delta" type="number" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Reason</mat-label>
                          <mat-select formControlName="reason">
                            <mat-option value="RESTOCK">Restock</mat-option>
                            <mat-option value="ADJUSTMENT">Adjustment</mat-option>
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Note</mat-label>
                          <input matInput formControlName="note" maxlength="200" />
                        </mat-form-field>
                        <button mat-flat-button type="submit" [disabled]="busy()">Apply</button>
                        <button mat-button type="button" (click)="adjusting.set(null)">Cancel</button>
                      </form>
                    </td>
                  </tr>
                }
                @if (movementsFor() === a.id) {
                  <tr class="sub">
                    <td colspan="5">
                      @if (movements().length) {
                        <ul class="moves">
                          @for (m of movements(); track m.id) {
                            <li>
                              <strong>{{ m.delta > 0 ? '+' : '' }}{{ m.delta }}</strong> {{ m.reason }}
                              <span class="meta">{{ m.createdAt | date: 'short' }}{{ m.note ? ' · ' + m.note : '' }}</span>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="meta">No stock movements yet.</p>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (error()) {
          <p class="alert alert--error" role="alert">{{ error() }}</p>
        }
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .edit-form { padding: var(--space-4); margin-bottom: var(--space-4); }
    .edit-form h2 { font-size: 1.1rem; }
    .fields { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .fields .wide { grid-column: 1 / -1; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--naboo-white); }
    th, td { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--naboo-border); vertical-align: middle; }
    th { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--naboo-text-muted); }
    .meta { display: block; font-size: .82rem; color: var(--naboo-text-muted); }
    .low { color: #a3121c; font-weight: 700; }
    .row-actions { white-space: nowrap; }
    .sub td { background: #fafbfc; }
    .adjust { display: flex; gap: var(--space-3); align-items: start; flex-wrap: wrap; padding: var(--space-2) 0; }
    .adjust mat-form-field { width: 160px; }
    .moves { margin: 0; padding: var(--space-2) 0 0 var(--space-5); }
    .moves li { margin-bottom: var(--space-1); }
    .actions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class AdminAccessories {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly items = signal<Accessory[]>([]);
  protected readonly editing = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly adjusting = signal<string | null>(null);
  protected readonly movementsFor = signal<string | null>(null);
  protected readonly movements = signal<{ id: string; delta: number; reason: StockReason; note: string | null; createdAt: string }[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editError = signal<string | null>(null);
  protected readonly formatMoney = formatMoney;

  protected readonly form = this.fb.nonNullable.group({
    sku: ['', Validators.maxLength(30)],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['', Validators.maxLength(60)],
    description: ['', Validators.maxLength(2000)],
    priceAmount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    active: [true],
  });

  protected readonly adjustForm = this.fb.nonNullable.group({
    delta: [1, [Validators.required, notZero]],
    reason: ['RESTOCK' as StockReason, Validators.required],
    note: ['', Validators.maxLength(200)],
  });

  constructor() {
    inject(SeoService).set({ title: 'Accessories & stock', description: '', path: '/admin/accessories', noIndex: true });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.query<{ adminAccessories: Page<Accessory> }>(ADMIN_ACCESSORIES, { page: 0, size: 50 }).subscribe({
      next: ({ adminAccessories }) => {
        this.items.set(adminAccessories.items);
        this.state.set(adminAccessories.items.length ? 'ready' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  protected startNew(): void {
    this.editing.set(this.editing() === 'new' ? null : 'new');
    this.editingId.set(null);
    this.form.reset({ active: true, stockQuantity: 0 });
  }

  protected startEdit(a: Accessory): void {
    this.editing.set(a.id);
    this.editingId.set(a.id);
    this.form.setValue({
      sku: a.sku,
      name: a.name,
      category: a.category ?? '',
      description: a.description ?? '',
      priceAmount: a.price.amount,
      stockQuantity: a.stockQuantity,
      active: a.active,
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.editError.set(null);
    this.busy.set(true);
    const v = this.form.getRawValue();
    const input = { ...v, sku: v.sku || null, category: v.category || null, description: v.description || null };
    const id = this.editingId();
    const req = id
      ? this.api.mutate(UPDATE_ACCESSORY, { id, input })
      : this.api.mutate(CREATE_ACCESSORY, { input });
    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.editError.set(toApiError(e).message);
      },
    });
  }

  protected openAdjust(a: Accessory): void {
    this.adjusting.set(this.adjusting() === a.id ? null : a.id);
    this.adjustForm.reset({ delta: 1, reason: 'RESTOCK', note: '' });
  }

  protected adjust(a: Accessory): void {
    if (this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const v = this.adjustForm.getRawValue();
    this.api.mutate(ADJUST_STOCK, { id: a.id, input: { ...v, note: v.note || null } }).subscribe({
      next: () => {
        this.busy.set(false);
        this.adjusting.set(null);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected toggleMovements(a: Accessory): void {
    if (this.movementsFor() === a.id) {
      this.movementsFor.set(null);
      return;
    }
    this.movementsFor.set(a.id);
    this.movements.set([]);
    this.api
      .query<{ stockMovements: { id: string; delta: number; reason: StockReason; note: string | null; createdAt: string }[] }>(
        STOCK_MOVEMENTS, { accessoryId: a.id })
      .subscribe({ next: ({ stockMovements }) => this.movements.set(stockMovements), error: () => {} });
  }
}

function notZero(control: import('@angular/forms').AbstractControl): import('@angular/forms').ValidationErrors | null {
  return control.value === 0 ? { zero: true } : null;
}

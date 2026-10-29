import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../../core/api';
import {
  ADJUST_STOCK,
  ADMIN_ACCESSORIES,
  CREATE_ACCESSORY,
  STOCK_MOVEMENTS,
  UPDATE_ACCESSORY,
} from '../../core/admin-queries';
import { formatMoney } from '../../core/format';
import { Accessory, Page, StockReason } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

@Component({
  selector: 'app-admin-accessories',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, LoadState],
  templateUrl: './accessories.html',
  styleUrl: './accessories.css',
})
export class AdminAccessories {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

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
    imageUrl: ['', Validators.maxLength(500)],
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
      imageUrl: a.imageUrl ?? '',
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
    const input = { ...v, sku: v.sku || null, category: v.category || null, description: v.description || null, imageUrl: v.imageUrl || null };
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

  protected readonly uploadingImage = signal(false);

  protected uploadImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    (event.target as HTMLInputElement).value = '';
    this.uploadingImage.set(true);
    this.editError.set(null);
    const body = new FormData();
    body.set('file', file);
    this.http.post<{ url: string }>('/api/uploads/accessories', body).subscribe({
      next: (r) => {
        this.form.controls.imageUrl.setValue(r.url);
        this.form.controls.imageUrl.markAsDirty();
        this.uploadingImage.set(false);
      },
      error: (e) => {
        this.uploadingImage.set(false);
        this.editError.set(typeof e?.error?.message === 'string' ? e.error.message : 'Image upload failed.');
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

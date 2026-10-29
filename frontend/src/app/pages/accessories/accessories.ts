import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/format';
import { Accessory, EnquiryReceipt, Money, Page } from '../../core/models';
import { ACCESSORIES, PLACE_ORDER } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';

@Component({
  selector: 'app-accessories',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, LoadState],
  templateUrl: './accessories.html',
  styleUrl: './accessories.css',
})
export class Accessories {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);

  protected readonly formatMoney = formatMoney;
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  private readonly cart = signal<Map<string, { item: Accessory; qty: number }>>(new Map());
  private readonly requestToken = crypto.randomUUID();

  protected readonly catalogue = rxResource({
    stream: () =>
      this.api
        .query<{ accessories: Page<Accessory> }>(ACCESSORIES, { size: 60 })
        .pipe(map((d) => d.accessories)),
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly cartItems = computed(() => [...this.cart().values()]);

  protected readonly total = computed<Money>(() => {
    let sum = 0;
    for (const { item, qty } of this.cart().values()) {
      sum += Number(item.price.amount) * qty;
    }
    return { amount: sum.toFixed(2), currency: 'TZS' };
  });

  constructor() {
    inject(SeoService).set({
      title: 'Accessories & parts',
      description: 'Genuine vehicle accessories and parts at Naboo Automotive, priced in TZS.',
      path: '/accessories',
    });
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
    }
  }

  protected qty(id: string): number {
    return this.cart().get(id)?.qty ?? 0;
  }

  protected lineTotal(line: { item: Accessory; qty: number }): Money {
    return { amount: (Number(line.item.price.amount) * line.qty).toFixed(2), currency: 'TZS' };
  }

  protected inc(a: Accessory): void {
    const q = Math.min(this.qty(a.id) + 1, a.stockQuantity);
    this.cart.update((m) => new Map(m).set(a.id, { item: a, qty: q }));
  }

  protected dec(a: Accessory): void {
    const q = this.qty(a.id) - 1;
    this.cart.update((m) => {
      const next = new Map(m);
      if (q <= 0) next.delete(a.id);
      else next.set(a.id, { item: a, qty: q });
      return next;
    });
  }

  protected err(name: keyof typeof this.form.controls, label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .mutate<{ placeOrder: EnquiryReceipt }>(PLACE_ORDER, {
        input: {
          items: this.cartItems().map((l) => ({ accessoryId: l.item.id, quantity: l.qty })),
          fullName: v.fullName,
          email: v.email,
          phone: v.phone,
          notes: v.notes || null,
          requestToken: this.requestToken,
        },
      })
      .subscribe({
        next: ({ placeOrder }) => {
          this.sending.set(false);
          this.receipt.set(placeOrder);
        },
        error: (e) => {
          this.sending.set(false);
          const apiError = toApiError(e);
          applyServerErrors(this.form, apiError.fields);
          this.error.set(apiError.message);
        },
      });
  }
}

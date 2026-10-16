import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { formatMoney } from '../core/format';
import { Accessory, EnquiryReceipt, Money, Page } from '../core/models';
import { ACCESSORIES, PLACE_ORDER } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';

@Component({
  selector: 'app-accessories',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, LoadState],
  template: `
    <header class="page-header">
      <div class="container">
        <span class="eyebrow">Shop</span>
        <h1>Accessories &amp; parts</h1>
        <p class="lead">Genuine parts and accessories, priced in TZS. Order online and we will confirm collection or delivery.</p>
      </div>
    </header>

    <div class="container section layout">
      <div>
        @if (catalogue.hasValue()) {
          @if (catalogue.value().items.length) {
            <div class="grid">
              @for (a of catalogue.value().items; track a.id) {
                <article class="card item" [class.out]="!a.inStock">
                  <div class="body">
                    <h2>{{ a.name }}</h2>
                    @if (a.category) {
                      <span class="cat">{{ a.category }}</span>
                    }
                    @if (a.description) {
                      <p class="desc">{{ a.description }}</p>
                    }
                    <p class="price">{{ formatMoney(a.price) }}</p>
                  </div>
                  <div class="buy">
                    @if (a.inStock) {
                      <div class="qty" [attr.aria-label]="'Quantity of ' + a.name">
                        <button mat-icon-button type="button" (click)="dec(a)" aria-label="Decrease quantity"
                                [disabled]="qty(a.id) === 0">
                          <mat-icon fontSet="material-symbols-outlined">remove</mat-icon>
                        </button>
                        <span aria-live="polite">{{ qty(a.id) }}</span>
                        <button mat-icon-button type="button" (click)="inc(a)" aria-label="Increase quantity"
                                [disabled]="qty(a.id) >= a.stockQuantity">
                          <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <span class="oos">Out of stock</span>
                    }
                  </div>
                </article>
              }
            </div>
          } @else {
            <app-load-state state="empty" emptyText="The shop has no items listed right now." />
          }
        } @else {
          <app-load-state [state]="catalogue.error() ? 'error' : 'loading'" loadingText="Loading the shop…" (retry)="catalogue.reload()" />
        }
      </div>

      <aside class="card cart" aria-labelledby="cart-h">
        <h2 id="cart-h">Your order</h2>
        @if (receipt(); as r) {
          <div class="alert alert--success" role="status">
            <p><strong>{{ r.message }}</strong></p>
            <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
          </div>
          <a mat-stroked-button routerLink="/my-account">View my orders</a>
        } @else {
          @if (!cartItems().length) {
            <p class="hint">Use the + button on any item to add it to your order.</p>
          } @else {
            <ul class="lines">
              @for (line of cartItems(); track line.item.id) {
                <li>
                  <span>{{ line.qty }} × {{ line.item.name }}</span>
                  <span>{{ formatMoney(lineTotal(line)) }}</span>
                </li>
              }
            </ul>
            <p class="total">Total: <strong>{{ formatMoney(total()) }}</strong></p>
          }
          @if (auth.isAuthenticated()) {
            @if (cartItems().length) {
              <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid one" novalidate>
                <mat-form-field appearance="outline">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="fullName" autocomplete="name" maxlength="120" />
                  <mat-error>{{ err('fullName', 'Full name') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" autocomplete="email" />
                  <mat-error>{{ err('email', 'Email') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+255 7XX XXX XXX" />
                  <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Delivery notes (optional)</mat-label>
                  <textarea matInput formControlName="notes" rows="2" maxlength="2000"
                            placeholder="Collection or delivery instructions"></textarea>
                </mat-form-field>
                @if (error()) {
                  <p class="alert alert--error" role="alert">{{ error() }}</p>
                }
                <button mat-flat-button type="submit" [disabled]="sending()">{{ sending() ? 'Placing order…' : 'Place order' }}</button>
              </form>
            }
          } @else {
            <p class="hint">Sign in to place an order.</p>
            <a mat-flat-button routerLink="/login">Sign in</a>
          }
        }
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; gap: var(--space-6); }
    .grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .item { display: flex; flex-direction: column; }
    .item.out { opacity: .65; }
    .body { padding: var(--space-4); flex: 1; }
    .body h2 { font-size: 1.05rem; margin: 0 0 var(--space-1); }
    .cat { font-size: .8rem; color: var(--naboo-text-muted); text-transform: uppercase; letter-spacing: .05em; }
    .desc { font-size: .9rem; color: var(--naboo-text-muted); margin: var(--space-2) 0; }
    .price { font-weight: 700; margin: var(--space-2) 0 0; }
    .buy { padding: 0 var(--space-4) var(--space-4); }
    .qty { display: inline-flex; align-items: center; gap: var(--space-2); border: 1px solid var(--naboo-border);
      border-radius: var(--radius-sm); }
    .qty span { min-width: 2ch; text-align: center; font-weight: 700; }
    .oos { color: var(--naboo-text-muted); font-size: .9rem; }
    .cart { padding: var(--space-5); }
    .cart h2 { font-size: 1.15rem; }
    .lines { list-style: none; margin: 0 0 var(--space-3); padding: 0; }
    .lines li { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) 0;
      border-bottom: 1px solid var(--naboo-border); font-size: .92rem; }
    .total { font-size: 1.05rem; }
    .hint { color: var(--naboo-text-muted); font-size: .9rem; }
    .one { display: flex; flex-direction: column; gap: var(--space-3); }
    .ref { font-family: ui-monospace, monospace; }
    @media (min-width: 960px) { .layout { grid-template-columns: 1fr 340px; align-items: start; } }
  `,
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

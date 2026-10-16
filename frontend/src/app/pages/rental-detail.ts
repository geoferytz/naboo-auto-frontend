import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map, of } from 'rxjs';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatMoney } from '../core/format';
import { EnquiryReceipt, RentalAvailability, RentalVehicle } from '../core/models';
import { RENTAL_AVAILABILITY, RENTAL_VEHICLE_BY_SLUG, REQUEST_RENTAL } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

@Component({
  selector: 'app-rental-detail',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, LoadState, VehiclePlaceholder],
  template: `
    @if (vehicle.hasValue() && vehicle.value(); as v) {
      <header class="page-header">
        <div class="container">
          <nav class="breadcrumb" aria-label="Breadcrumb"><a routerLink="/rentals">Rentals</a> / {{ v.make }}</nav>
          <h1>{{ v.title }}</h1>
          <p class="price">{{ formatMoney(v.dailyRate) }} <span class="per">/ day</span></p>
        </div>
      </header>

      <div class="container section layout">
        <div class="main">
          <div class="gallery">
            <div class="hero-img">
              @if (activeImage(); as img) {
                <img [src]="img.url" [alt]="img.altText" width="1200" height="750" />
              } @else {
                <app-vehicle-placeholder [label]="v.title" />
              }
            </div>
            @if (v.images.length > 1) {
              <div class="thumbs" role="list" aria-label="Photos">
                @for (img of v.images; track img.id; let i = $index) {
                  <button type="button" role="listitem" [class.active]="i === imageIndex()" (click)="imageIndex.set(i)"
                          [attr.aria-label]="'Show photo ' + (i + 1) + ': ' + img.altText">
                    <img [src]="img.url" alt="" loading="lazy" width="120" height="75" />
                  </button>
                }
              </div>
            }
          </div>

          <section aria-labelledby="specs">
            <h2 id="specs">Specifications</h2>
            <dl class="specs">
              <div><dt>Year</dt><dd>{{ v.year }}</dd></div>
              <div><dt>Make</dt><dd>{{ v.make }}</dd></div>
              <div><dt>Model</dt><dd>{{ v.model }}{{ v.variant ? ' ' + v.variant : '' }}</dd></div>
              @if (v.seats) {
                <div><dt>Seats</dt><dd>{{ v.seats }}</dd></div>
              }
              <div><dt>Fuel</dt><dd>{{ fuel[v.fuelType] }}</dd></div>
              <div><dt>Transmission</dt><dd>{{ transmission[v.transmission] }}</dd></div>
              <div><dt>Body type</dt><dd>{{ body[v.bodyType] }}</dd></div>
              @if (v.color) {
                <div><dt>Colour</dt><dd>{{ v.color }}</dd></div>
              }
            </dl>
          </section>

          @if (v.description) {
            <section aria-labelledby="desc">
              <h2 id="desc">About this vehicle</h2>
              <p class="description">{{ v.description }}</p>
            </section>
          }
        </div>

        <aside class="card book" aria-labelledby="book-h">
          <h2 id="book-h">Reserve this vehicle</h2>
          @if (receipt(); as r) {
            <div class="alert alert--success" role="status">
              <p><strong>{{ r.message }}</strong></p>
              <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
            </div>
            <a mat-stroked-button routerLink="/my-account">View my reservations</a>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid one" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Pickup date</mat-label>
                <input matInput formControlName="startDate" type="date" [min]="today" />
                <mat-error>{{ err('startDate', 'Pickup date') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Return date</mat-label>
                <input matInput formControlName="endDate" type="date" [min]="today" />
                <mat-error>{{ err('endDate', 'Return date') }}</mat-error>
              </mat-form-field>

              @if (availability(); as a) {
                <div class="quote" [class.unavailable]="!a.available" role="status">
                  @if (a.available) {
                    <p><strong>{{ a.days }} day{{ a.days === 1 ? '' : 's' }}</strong> ·
                      {{ formatMoney(a.dailyRate) }}/day</p>
                    <p class="total">Estimated total: <strong>{{ formatMoney(a.total) }}</strong></p>
                  } @else {
                    <p>These dates are not available for this vehicle. Please choose different dates.</p>
                  }
                </div>
              } @else if (checking()) {
                <p class="hint">Checking availability…</p>
              } @else if (datesTouched() && !datesValid()) {
                <p class="hint">Choose a return date after the pickup date.</p>
              }

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
                <mat-label>Notes (optional)</mat-label>
                <textarea matInput formControlName="notes" rows="2" maxlength="2000"
                          placeholder="Pickup location, driver requirements, extras…"></textarea>
              </mat-form-field>
              @if (v.deposit) {
                <p class="hint">A refundable deposit of {{ formatMoney(v.deposit) }} applies.</p>
              }
              @if (error()) {
                <p class="alert alert--error" role="alert">{{ error() }}</p>
              }
              <button mat-flat-button class="btn-lg" type="submit" [disabled]="sending()">
                {{ sending() ? 'Sending…' : 'Request reservation' }}
              </button>
              <p class="hint small">We hold the vehicle once our team confirms. No payment is taken online.</p>
            </form>
          }
        </aside>
      </div>
    } @else if (vehicle.hasValue() && !vehicle.value()) {
      <div class="container section">
        <h1>Vehicle not found</h1>
        <p class="lead">This rental vehicle may no longer be listed.</p>
        <a mat-flat-button routerLink="/rentals">View all rentals</a>
      </div>
    } @else {
      <div class="container section">
        <app-load-state [state]="vehicle.error() ? 'error' : 'loading'" (retry)="vehicle.reload()" />
      </div>
    }
  `,
  styles: `
    .layout { display: grid; gap: var(--space-6); }
    .price { font-size: 1.4rem; font-weight: 800; margin: var(--space-1) 0 0; }
    .per { font-weight: 400; font-size: .9rem; opacity: .8; }
    .gallery { margin-bottom: var(--space-5); }
    .hero-img { aspect-ratio: 16/10; background: var(--naboo-grey); border-radius: var(--radius-md); overflow: hidden; }
    .hero-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumbs { display: flex; gap: var(--space-2); margin-top: var(--space-2); overflow-x: auto; }
    .thumbs button { padding: 0; border: 2px solid transparent; border-radius: var(--radius-sm); overflow: hidden;
      cursor: pointer; background: none; }
    .thumbs button.active { border-color: var(--naboo-red); }
    .thumbs img { display: block; width: 96px; height: 60px; object-fit: cover; }
    .specs { display: grid; gap: var(--space-2) var(--space-5); grid-template-columns: 1fr 1fr; margin: 0; }
    .specs div { display: flex; justify-content: space-between; gap: var(--space-2); border-bottom: 1px solid var(--naboo-border);
      padding-bottom: var(--space-2); }
    .specs dt { color: var(--naboo-text-muted); }
    .specs dd { margin: 0; font-weight: 600; }
    .description { white-space: pre-line; max-width: 70ch; }
    .book { padding: var(--space-5); }
    .book h2 { font-size: 1.15rem; }
    .one { display: flex; flex-direction: column; gap: var(--space-3); }
    .quote { background: #e4f5e8; border-radius: var(--radius-sm); padding: var(--space-3); }
    .quote p { margin: 0; }
    .quote .total { font-size: 1.05rem; }
    .quote.unavailable { background: #fde8e9; }
    .hint { color: var(--naboo-text-muted); font-size: .85rem; margin: 0; }
    .ref { font-family: ui-monospace, monospace; }
    @media (min-width: 960px) { .layout { grid-template-columns: 1fr 380px; align-items: start; } }
  `,
})
export class RentalDetail {
  readonly slug = input.required<string>();

  private readonly api = inject(Api);
  private readonly seo = inject(SeoService);

  protected readonly formatMoney = formatMoney;
  protected readonly fuel = FUEL_LABELS;
  protected readonly transmission = TRANSMISSION_LABELS;
  protected readonly body = BODY_LABELS;
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly imageIndex = signal(0);
  protected readonly sending = signal(false);
  protected readonly checking = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  protected readonly availability = signal<RentalAvailability | null>(null);
  protected readonly datesTouched = signal(false);
  private readonly requestToken = crypto.randomUUID();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly vehicle = rxResource({
    params: () => this.slug(),
    stream: ({ params }) =>
      this.api
        .query<{ rentalVehicleBySlug: RentalVehicle | null }>(RENTAL_VEHICLE_BY_SLUG, { slug: params })
        .pipe(map((d) => d.rentalVehicleBySlug)),
  });

  protected readonly activeImage = computed(() => {
    const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
    return v?.images[this.imageIndex()] ?? v?.images[0] ?? null;
  });

  constructor() {
    const auth = inject(AuthService);
    effect(() => {
      const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
      if (v) {
        this.seo.set({ title: `${v.title} rental`, description: `Hire the ${v.title} from ${formatMoney(v.dailyRate)} per day.`, path: `/rentals/${v.slug}` });
      }
    });
    effect(() => {
      const u = auth.user();
      if (u && !this.form.controls.email.dirty) {
        this.form.patchValue({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
      }
    });
    this.form.controls.startDate.valueChanges.subscribe(() => this.checkDates());
    this.form.controls.endDate.valueChanges.subscribe(() => this.checkDates());
  }

  protected datesValid(): boolean {
    const { startDate, endDate } = this.form.getRawValue();
    return !!startDate && !!endDate && endDate > startDate;
  }

  private checkDates(): void {
    const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
    this.datesTouched.set(true);
    this.availability.set(null);
    if (!v || !this.datesValid()) {
      return;
    }
    const { startDate, endDate } = this.form.getRawValue();
    this.checking.set(true);
    this.api
      .query<{ rentalAvailability: RentalAvailability }>(RENTAL_AVAILABILITY, {
        rentalVehicleId: v.id,
        startDate,
        endDate,
      })
      .subscribe({
        next: ({ rentalAvailability }) => {
          this.checking.set(false);
          this.availability.set(rentalAvailability);
        },
        error: (e) => {
          this.checking.set(false);
          this.error.set(toApiError(e).message);
        },
      });
  }

  protected err(name: keyof typeof this.form.controls, label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected submit(): void {
    this.error.set(null);
    const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
    if (this.form.invalid || !v) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.availability() && !this.availability()!.available) {
      this.error.set('These dates are not available. Please choose different dates.');
      return;
    }
    const raw = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .mutate<{ requestRental: EnquiryReceipt }>(REQUEST_RENTAL, {
        input: {
          rentalVehicleId: v.id,
          fullName: raw.fullName,
          email: raw.email,
          phone: raw.phone,
          startDate: raw.startDate,
          endDate: raw.endDate,
          notes: raw.notes || null,
          requestToken: this.requestToken,
        },
      })
      .subscribe({
        next: ({ requestRental }) => {
          this.sending.set(false);
          this.receipt.set(requestRental);
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

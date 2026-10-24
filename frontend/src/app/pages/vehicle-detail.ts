import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api, toApiError } from '../core/api';
import { AuthService } from '../core/auth.service';
import { whatsappLink } from '../core/business';
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
  formatMoney,
  formatNumber,
} from '../core/format';
import { EnquiryReceipt, EnquiryType, VehicleDetail as Vehicle } from '../core/models';
import { SUBMIT_VEHICLE_ENQUIRY, VEHICLE_BY_SLUG } from '../core/queries';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

@Component({
  selector: 'app-vehicle-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    LoadState,
    VehiclePlaceholder,
  ],
  template: `
    @if (vehicle.hasValue() && vehicle.value(); as v) {
      <header class="page-header">
        <div class="container">
          <nav class="breadcrumb" aria-label="Breadcrumb"><a routerLink="/cars-for-sale">Cars for sale</a> / {{ v.make }}</nav>
          <div class="title-row">
            <h1>{{ v.title }}</h1>
            <span [class]="'status status--' + v.status.toLowerCase()">{{ statusLabel[v.status] }}</span>
          </div>
          <p class="price">{{ formatMoney(v.price) }}</p>
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
                          [attr.aria-label]="'Show photo ' + (i + 1) + ': ' + img.altText" [attr.aria-current]="i === imageIndex()">
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
              <div><dt>Mileage</dt><dd>{{ formatNumber(v.mileageKm) }} km</dd></div>
              <div><dt>Fuel</dt><dd>{{ fuel[v.fuelType] }}</dd></div>
              <div><dt>Transmission</dt><dd>{{ transmission[v.transmission] }}</dd></div>
              <div><dt>Body type</dt><dd>{{ body[v.bodyType] }}</dd></div>
              <div><dt>Condition</dt><dd>{{ condition[v.condition] }}</dd></div>
              @if (v.engineCapacityCc || v.engineCode) {
                <div><dt>Engine</dt><dd>{{ v.engineCapacityCc ? formatNumber(v.engineCapacityCc) + ' cc' : '' }}{{ v.engineCapacityCc && v.engineCode ? ' · ' : '' }}{{ v.engineCode ?? '' }}</dd></div>
              }
              @if (v.location) {
                <div><dt>Location</dt><dd>{{ v.location }}</dd></div>
              }
              @if (v.color) {
                <div><dt>Colour</dt><dd>{{ v.color }}</dd></div>
              }
            </dl>
          </section>

          @if (v.features.length) {
            <section aria-labelledby="features">
              <h2 id="features">Features</h2>
              <ul class="features">
                @for (f of v.features; track f) {
                  <li>{{ f }}</li>
                }
              </ul>
            </section>
          }

          @if (v.description) {
            <section aria-labelledby="desc">
              <h2 id="desc">Description</h2>
              <p class="description">{{ v.description }}</p>
            </section>
          }
        </div>

        <aside class="side" aria-labelledby="enquire">
          <div class="card enquiry">
            <h2 id="enquire">Interested in this vehicle?</h2>
            @if (receipt(); as r) {
              <div class="alert alert--success" role="status">
                <p><strong>{{ r.message }}</strong></p>
                <p>Your reference: <strong class="ref">{{ r.reference }}</strong></p>
              </div>
              <button mat-stroked-button type="button" (click)="receipt.set(null)">Send another enquiry</button>
            } @else if (!v.enquiriesOpen) {
              <p class="alert">
                This vehicle is {{ statusLabel[v.status].toLowerCase() }} and no longer accepting enquiries.
              </p>
              <a mat-flat-button routerLink="/cars-for-sale">See available vehicles</a>
            } @else {
              @if (whatsappFor(v); as wa) {
                <a mat-stroked-button class="wa" [href]="wa" target="_blank" rel="noopener">
                  Chat on WhatsApp about this car
                </a>
              }
              <form [formGroup]="form" (ngSubmit)="submit(v)" novalidate>
                <mat-button-toggle-group formControlName="type" aria-label="Enquiry type" class="type">
                  <mat-button-toggle value="GENERAL">Ask a question</mat-button-toggle>
                  <mat-button-toggle value="VIEWING" [disabled]="!v.viewingsOpen">Book a viewing</mat-button-toggle>
                </mat-button-toggle-group>
                @if (!v.viewingsOpen) {
                  <p class="hint">Viewings are paused while this vehicle is reserved.</p>
                }
                <mat-form-field appearance="outline">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="fullName" autocomplete="name" maxlength="120" />
                  <mat-error>{{ err('fullName', 'Full name') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+255 7XX XXX XXX" />
                  <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" autocomplete="email" />
                  <mat-error>{{ err('email', 'Email') }}</mat-error>
                </mat-form-field>
                @if (form.controls.type.value === 'VIEWING') {
                  <mat-form-field appearance="outline">
                    <mat-label>Preferred viewing date &amp; time</mat-label>
                    <input matInput type="datetime-local" formControlName="preferredViewingAt" [min]="minViewing" />
                    <mat-hint>At least 2 hours from now, within 90 days.</mat-hint>
                    <mat-error>{{ err('preferredViewingAt', 'Viewing time') }}</mat-error>
                  </mat-form-field>
                }
                <mat-form-field appearance="outline">
                  <mat-label>Message (optional)</mat-label>
                  <textarea matInput formControlName="message" rows="3" maxlength="2000"></textarea>
                </mat-form-field>
                @if (error()) {
                  <p class="alert alert--error" role="alert">{{ error() }}</p>
                }
                <button mat-flat-button class="btn-lg submit" type="submit" [disabled]="sending()">
                  {{ sending() ? 'Sending…' : form.controls.type.value === 'VIEWING' ? 'Request viewing' : 'Send enquiry' }}
                </button>
                <p class="hint">We use your details only to respond to this enquiry. See our <a routerLink="/privacy-policy">privacy policy</a>.</p>
              </form>
            }
          </div>
        </aside>
      </div>
    } @else if (vehicle.hasValue() && !vehicle.value()) {
      <div class="container section">
        <h1>Vehicle not found</h1>
        <p class="lead">This listing may have been removed or is no longer available.</p>
        <a mat-flat-button routerLink="/cars-for-sale">Browse cars for sale</a>
      </div>
    } @else {
      <div class="container section">
        <app-load-state [state]="vehicle.error() ? 'error' : 'loading'" (retry)="vehicle.reload()" />
      </div>
    }
  `,
  styles: `
    .title-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
    .title-row h1 { margin: 0; }
    .price { font-size: 1.6rem; font-weight: 800; margin: var(--space-3) 0 0; }
    .layout { display: grid; gap: var(--space-6); }
    .main { display: flex; flex-direction: column; gap: var(--space-6); min-width: 0; }
    .hero-img { aspect-ratio: 16 / 10; border-radius: var(--radius-md); overflow: hidden; background: var(--naboo-grey); }
    .hero-img img { width: 100%; height: 100%; object-fit: cover; }
    .thumbs { display: flex; gap: var(--space-2); overflow-x: auto; margin-top: var(--space-3); padding-bottom: var(--space-1); }
    .thumbs button { flex: 0 0 96px; aspect-ratio: 16/10; padding: 0; border: 2px solid transparent; border-radius: var(--radius-sm);
      overflow: hidden; cursor: pointer; background: none; }
    .thumbs button.active { border-color: var(--naboo-red); }
    .thumbs img { width: 100%; height: 100%; object-fit: cover; }
    .specs { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-3); margin: 0; }
    .specs div { background: var(--naboo-grey); padding: var(--space-3); border-radius: var(--radius-sm); }
    dt { font-size: .78rem; color: var(--naboo-text-muted); text-transform: uppercase; letter-spacing: .06em; }
    dd { margin: 0; font-weight: 600; }
    .features { columns: 2 200px; padding-left: var(--space-5); margin: 0; }
    .description { white-space: pre-line; }
    .enquiry { padding: var(--space-5); }
    .enquiry h2 { font-size: 1.25rem; }
    form { display: flex; flex-direction: column; }
    .type { margin-bottom: var(--space-3); width: 100%; }
    .type mat-button-toggle { flex: 1; }
    .hint { font-size: .85rem; color: var(--naboo-text-muted); margin: var(--space-2) 0; }
    .wa { display: flex; justify-content: center; width: 100%; margin-bottom: var(--space-3);
      border-color: #25d366; color: #128c4a; }
    .submit { width: 100%; margin-top: var(--space-2); }
    .ref { font-family: ui-monospace, monospace; font-size: 1.1rem; letter-spacing: .04em; }
    @media (min-width: 960px) {
      .layout { grid-template-columns: minmax(0, 1fr) 380px; align-items: start; }
      .side { position: sticky; top: calc(var(--header-height) + var(--space-4)); }
    }
  `,
})
export class VehicleDetail {
  readonly slug = input.required<string>();

  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  protected readonly fuel = FUEL_LABELS;
  protected readonly transmission = TRANSMISSION_LABELS;
  protected readonly body = BODY_LABELS;
  protected readonly condition = CONDITION_LABELS;
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;

  protected readonly imageIndex = signal(0);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<EnquiryReceipt | null>(null);
  protected readonly minViewing = toLocalInput(new Date(Date.now() + 2 * 3600_000 + 5 * 60_000));

  protected readonly vehicle = rxResource({
    params: () => this.slug(),
    stream: ({ params }) =>
      this.api.query<{ vehicleBySlug: Vehicle | null }>(VEHICLE_BY_SLUG, { slug: params }).pipe(map((d) => d.vehicleBySlug)),
  });

  protected readonly activeImage = computed(() => {
    const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
    return v?.images[this.imageIndex()] ?? v?.images[0] ?? null;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: 'GENERAL' as EnquiryType,
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    preferredViewingAt: '',
    message: ['', Validators.maxLength(2000)],
  });

  constructor() {
    effect(() => {
      const v = this.vehicle.hasValue() ? this.vehicle.value() : null;
      if (v) {
        this.seo.set({
          title: `${v.title} for sale`,
          description: `${v.title}, ${formatNumber(v.mileageKm)} km, ${FUEL_LABELS[v.fuelType]}, ${TRANSMISSION_LABELS[v.transmission]}. ${formatMoney(v.price)} at Naboo Automotive.`,
          path: `/cars-for-sale/${v.slug}`,
        });
      }
    });
    effect(() => {
      const u = this.auth.user();
      if (u && !this.form.dirty) {
        this.form.patchValue({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
      }
    });
    this.form.controls.type.valueChanges.subscribe((type) => {
      const c = this.form.controls.preferredViewingAt;
      c.setValidators(type === 'VIEWING' ? Validators.required : null);
      c.updateValueAndValidity();
    });
  }

  protected err(name: keyof typeof this.form.controls, label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected whatsappFor(v: Vehicle): string | null {
    return whatsappLink(
      `Hello ${'Naboo Automotive'}, I'm interested in the ${v.title} (${formatMoney(v.price)}) listed on your website.`,
    );
  }

  protected submit(v: Vehicle): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .mutate<{ submitVehicleEnquiry: EnquiryReceipt }>(SUBMIT_VEHICLE_ENQUIRY, {
        input: {
          vehicleId: v.id,
          type: f.type,
          fullName: f.fullName,
          email: f.email,
          phone: f.phone,
          message: f.message || null,
          preferredViewingAt: f.type === 'VIEWING' && f.preferredViewingAt ? new Date(f.preferredViewingAt).toISOString() : null,
        },
      })
      .subscribe({
        next: ({ submitVehicleEnquiry }) => {
          this.sending.set(false);
          this.receipt.set(submitVehicleEnquiry);
          this.form.reset({ type: 'GENERAL', fullName: f.fullName, email: f.email, phone: f.phone });
        },
        error: (e) => {
          this.sending.set(false);
          const apiError = toApiError(e);
          applyServerErrors(this.form, apiError.fields);
          this.error.set(apiError.message);
          if (apiError.code === 'VEHICLE_NOT_AVAILABLE') {
            this.vehicle.reload();
          }
        },
      });
  }
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

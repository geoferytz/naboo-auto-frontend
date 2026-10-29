import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { whatsappLink } from '../../core/business';
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
  formatMoney,
  formatNumber,
} from '../../core/format';
import { EnquiryReceipt, EnquiryType, VehicleDetail as Vehicle } from '../../core/models';
import { SUBMIT_VEHICLE_ENQUIRY, VEHICLE_BY_SLUG } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

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
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.css',
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

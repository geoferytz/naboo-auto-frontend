import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { map, of } from 'rxjs';

import { Api, toApiError } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { whatsappLink } from '../../core/business';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatMoney } from '../../core/format';
import { EnquiryReceipt, RentalAvailability, RentalVehicle } from '../../core/models';
import { RENTAL_AVAILABILITY, RENTAL_VEHICLE_BY_SLUG, REQUEST_RENTAL } from '../../core/queries';
import { SeoService } from '../../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

@Component({
  selector: 'app-rental-detail',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, LoadState, VehiclePlaceholder],
  templateUrl: './rental-detail.html',
  styleUrl: './rental-detail.css',
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

  protected whatsappFor(v: RentalVehicle): string | null {
    return whatsappLink(`Hello Naboo Automotive, I'd like to rent the ${v.title} (${formatMoney(v.dailyRate)}/day).`);
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

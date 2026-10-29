import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';

import { Api, toApiError } from '../../core/api';
import {
  ADMIN_RENTAL,
  CREATE_RENTAL,
  REMOVE_RENTAL_IMAGE,
  REORDER_RENTAL_IMAGES,
  SET_RENTAL_PUBLISHED,
  SET_RENTAL_STATUS,
  UPDATE_RENTAL,
} from '../../core/admin-queries';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, options } from '../../core/format';
import { RentalVehicle, RentalVehicleStatus, VehicleImage } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

const CURRENT_YEAR = new Date().getFullYear();

@Component({
  selector: 'app-admin-rental-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    LoadState,
    VehiclePlaceholder,
  ],
  templateUrl: './rental-edit.html',
  styleUrl: './rental-edit.css',
})
export class AdminRentalEdit {
  readonly id = input<string>();

  private readonly api = inject(Api);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly vehicle = signal<RentalVehicle | null>(null);
  protected readonly saving = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stateError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly file = signal<File | null>(null);

  protected readonly isNew = () => !this.id();
  protected readonly currentYear = CURRENT_YEAR;
  protected readonly fuelOptions = options(FUEL_LABELS);
  protected readonly transmissionOptions = options(TRANSMISSION_LABELS);
  protected readonly bodyOptions = options(BODY_LABELS);

  protected readonly form = this.fb.nonNullable.group({
    make: ['', [Validators.required, Validators.maxLength(60)]],
    model: ['', [Validators.required, Validators.maxLength(60)]],
    variant: ['', Validators.maxLength(80)],
    year: [CURRENT_YEAR, [Validators.required, Validators.min(1950), Validators.max(CURRENT_YEAR + 1)]],
    seats: [null as number | null, [Validators.min(1), Validators.max(60)]],
    fuelType: ['PETROL', Validators.required],
    transmission: ['AUTOMATIC', Validators.required],
    bodyType: ['SUV', Validators.required],
    color: ['', Validators.maxLength(40)],
    dailyRateAmount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    depositAmount: ['', Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    registrationNumber: ['', Validators.maxLength(20)],
    location: ['', Validators.maxLength(80)],
    description: ['', Validators.maxLength(5000)],
  });

  protected readonly stateForm = this.fb.nonNullable.group({
    status: ['AVAILABLE' as RentalVehicleStatus, Validators.required],
    published: [false],
  });

  protected readonly uploadForm = this.fb.nonNullable.group({
    altText: ['', [Validators.required, Validators.maxLength(200)]],
  });

  constructor() {
    inject(SeoService).set({ title: 'Edit rental vehicle', description: '', path: '/admin/rentals', noIndex: true });
    effect(() => {
      if (this.id()) {
        this.load();
      } else {
        this.state.set('ready');
      }
    });
  }

  protected err(name: keyof typeof this.form.controls, label: string): string {
    return controlError(this.form.controls[name], label);
  }

  protected uploadErr(): string {
    return controlError(this.uploadForm.controls.altText, 'Photo description');
  }

  protected load(): void {
    const id = this.id();
    if (!id) return;
    this.state.set('loading');
    this.api.query<{ adminRentalVehicle: RentalVehicle | null }>(ADMIN_RENTAL, { id }).subscribe({
      next: ({ adminRentalVehicle }) => {
        if (!adminRentalVehicle) {
          this.state.set('error');
          return;
        }
        this.vehicle.set(adminRentalVehicle);
        this.form.patchValue({
          make: adminRentalVehicle.make,
          model: adminRentalVehicle.model,
          variant: adminRentalVehicle.variant ?? '',
          year: adminRentalVehicle.year,
          seats: adminRentalVehicle.seats,
          fuelType: adminRentalVehicle.fuelType,
          transmission: adminRentalVehicle.transmission,
          bodyType: adminRentalVehicle.bodyType,
          color: adminRentalVehicle.color ?? '',
          dailyRateAmount: adminRentalVehicle.dailyRate.amount,
          depositAmount: adminRentalVehicle.deposit?.amount ?? '',
          registrationNumber: adminRentalVehicle.registrationNumber ?? '',
          location: adminRentalVehicle.location ?? '',
          description: adminRentalVehicle.description ?? '',
        });
        this.stateForm.patchValue({ status: adminRentalVehicle.status, published: adminRentalVehicle.published ?? false });
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected save(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = {
      ...v,
      variant: v.variant || null,
      color: v.color || null,
      description: v.description || null,
      registrationNumber: v.registrationNumber || null,
      location: v.location || null,
      depositAmount: v.depositAmount || null,
    };
    this.saving.set(true);
    const request: Observable<{ id: string }> = this.isNew()
      ? this.api.mutate<{ createRentalVehicle: { id: string } }>(CREATE_RENTAL, { input }).pipe(map((d) => ({ id: d.createRentalVehicle.id })))
      : this.api.mutate<{ updateRentalVehicle: { id: string } }>(UPDATE_RENTAL, { id: this.id(), input }).pipe(map((d) => ({ id: d.updateRentalVehicle.id })));
    request.subscribe({
      next: ({ id }) => {
        this.saving.set(false);
        if (this.isNew()) {
          void this.router.navigate(['/admin/rentals', id]);
        } else {
          this.load();
        }
      },
      error: (e: unknown) => {
        this.saving.set(false);
        const apiError = toApiError(e);
        applyServerErrors(this.form, apiError.fields);
        this.error.set(apiError.message);
      },
    });
  }

  protected saveState(): void {
    const id = this.id();
    if (!id) return;
    this.stateError.set(null);
    this.saving.set(true);
    const { status, published } = this.stateForm.getRawValue();
    this.api.mutate(SET_RENTAL_STATUS, { id, status }).subscribe({
      next: () =>
        this.api.mutate(SET_RENTAL_PUBLISHED, { id, published }).subscribe({
          next: () => {
            this.saving.set(false);
            this.load();
          },
          error: (e) => this.failState(e),
        }),
      error: (e) => this.failState(e),
    });
  }

  private failState(e: unknown): void {
    this.saving.set(false);
    this.stateError.set(toApiError(e).message);
  }

  protected pickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.item(0) ?? null);
  }

  protected upload(): void {
    const id = this.id();
    const file = this.file();
    if (!id || !file || this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }
    this.uploadError.set(null);
    this.busy.set(true);
    const body = new FormData();
    body.set('file', file);
    body.set('altText', this.uploadForm.getRawValue().altText);
    this.http.post<VehicleImage>(`/api/uploads/rentals/${id}/images`, body).subscribe({
      next: () => {
        this.busy.set(false);
        this.file.set(null);
        this.uploadForm.reset();
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.uploadError.set(typeof e?.error?.message === 'string' ? e.error.message : 'Upload failed. Please try again.');
      },
    });
  }

  protected removeImage(img: VehicleImage): void {
    const id = this.id();
    if (!id) return;
    this.busy.set(true);
    this.api.mutate(REMOVE_RENTAL_IMAGE, { rentalVehicleId: id, imageId: img.id }).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.uploadError.set(toApiError(e).message);
      },
    });
  }

  protected move(img: VehicleImage, direction: -1 | 1): void {
    const v = this.vehicle();
    if (!v) return;
    const ids = v.images.map((i) => i.id);
    const idx = ids.indexOf(img.id);
    const swap = idx + direction;
    if (swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    this.busy.set(true);
    this.api.mutate(REORDER_RENTAL_IMAGES, { rentalVehicleId: v.id, imageIds: ids }).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.uploadError.set(toApiError(e).message);
      },
    });
  }
}

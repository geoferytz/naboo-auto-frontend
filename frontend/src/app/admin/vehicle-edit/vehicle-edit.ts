import { DatePipe } from '@angular/common';
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
  ADMIN_VEHICLE,
  CREATE_VEHICLE,
  REMOVE_VEHICLE_IMAGE,
  REORDER_VEHICLE_IMAGES,
  SET_VEHICLE_PUBLISHED,
  SET_VEHICLE_STATUS,
  UPDATE_VEHICLE,
} from '../../core/admin-queries';
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
  formatMoney,
  options,
} from '../../core/format';
import { AdminVehicle, VehicleImage, VehicleStatus } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';
import { VehiclePlaceholder } from '../../shared/vehicle-placeholder/vehicle-placeholder';

const CURRENT_YEAR = new Date().getFullYear();

@Component({
  selector: 'app-admin-vehicle-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    LoadState,
    VehiclePlaceholder,
  ],
  templateUrl: './vehicle-edit.html',
  styleUrl: './vehicle-edit.css',
})
export class AdminVehicleEdit {
  /** Bound from the route: /admin/vehicles/:id (absent for /admin/vehicles/new). */
  readonly id = input<string>();

  private readonly api = inject(Api);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly state = signal<'loading' | 'error' | 'ready'>('loading');
  protected readonly vehicle = signal<AdminVehicle | null>(null);
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
  protected readonly conditionOptions = options(CONDITION_LABELS);
  protected readonly statusOptions = options(STATUS_LABELS);
  protected readonly statusLabel = (s: VehicleStatus) => STATUS_LABELS[s];
  protected readonly formatMoney = formatMoney;

  protected readonly form = this.fb.nonNullable.group({
    make: ['', [Validators.required, Validators.maxLength(60)]],
    model: ['', [Validators.required, Validators.maxLength(80)]],
    variant: ['', Validators.maxLength(80)],
    year: [CURRENT_YEAR, [Validators.required, Validators.min(1950), Validators.max(CURRENT_YEAR + 1)]],
    mileageKm: [null as number | null, Validators.min(0)],
    condition: ['FOREIGN_USED', Validators.required],
    fuelType: ['PETROL', Validators.required],
    transmission: ['AUTOMATIC', Validators.required],
    bodyType: ['SUV', Validators.required],
    color: ['', Validators.maxLength(40)],
    engineCapacityCc: [null as number | null, Validators.min(0)],
    engineCode: ['', Validators.maxLength(30)],
    location: ['', Validators.maxLength(80)],
    priceAmount: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    registrationNumber: ['', Validators.maxLength(20)],
    description: ['', Validators.maxLength(5000)],
    features: [''],
  });

  protected readonly stateForm = this.fb.nonNullable.group({
    status: ['AVAILABLE' as VehicleStatus, Validators.required],
    published: [false],
  });

  protected readonly uploadForm = this.fb.nonNullable.group({
    altText: ['', [Validators.required, Validators.maxLength(200)]],
  });

  constructor() {
    inject(SeoService).set({ title: 'Edit vehicle', description: '', path: '/admin/vehicles', noIndex: true });
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
    this.api.query<{ adminVehicle: AdminVehicle | null }>(ADMIN_VEHICLE, { id }).subscribe({
      next: ({ adminVehicle }) => {
        if (!adminVehicle) {
          this.state.set('error');
          return;
        }
        this.vehicle.set(adminVehicle);
        this.form.patchValue({
          make: adminVehicle.make,
          model: adminVehicle.model,
          variant: adminVehicle.variant ?? '',
          year: adminVehicle.year,
          mileageKm: adminVehicle.mileageKm,
          condition: adminVehicle.condition,
          fuelType: adminVehicle.fuelType,
          transmission: adminVehicle.transmission,
          bodyType: adminVehicle.bodyType,
          color: adminVehicle.color ?? '',
          engineCapacityCc: adminVehicle.engineCapacityCc,
          engineCode: adminVehicle.engineCode ?? '',
          location: adminVehicle.location ?? '',
          priceAmount: adminVehicle.price.amount,
          registrationNumber: adminVehicle.registrationNumber ?? '',
          description: adminVehicle.description ?? '',
          features: adminVehicle.features.join('\n'),
        });
        this.stateForm.patchValue({ status: adminVehicle.status, published: adminVehicle.published });
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
      engineCode: v.engineCode || null,
      location: v.location || null,
      description: v.description || null,
      registrationNumber: v.registrationNumber || null,
      features: v.features.split('\n').map((f) => f.trim()).filter(Boolean),
    };
    this.saving.set(true);
    const request: Observable<{ id: string }> = this.isNew()
      ? this.api
          .mutate<{ createVehicle: { id: string } }>(CREATE_VEHICLE, { input })
          .pipe(map((d) => ({ id: d.createVehicle.id })))
      : this.api
          .mutate<{ updateVehicle: { id: string } }>(UPDATE_VEHICLE, { id: this.id(), input })
          .pipe(map((d) => ({ id: d.updateVehicle.id })));
    request.subscribe({
      next: ({ id }) => {
        this.saving.set(false);
        if (this.isNew()) {
          void this.router.navigate(['/admin/vehicles', id]);
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
    this.api.mutate(SET_VEHICLE_STATUS, { id, status }).subscribe({
      next: () =>
        this.api.mutate(SET_VEHICLE_PUBLISHED, { id, published }).subscribe({
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
    this.http.post<VehicleImage>(`/api/uploads/vehicles/${id}/images`, body).subscribe({
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
    this.api.mutate(REMOVE_VEHICLE_IMAGE, { vehicleId: id, imageId: img.id }).subscribe({
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
    this.api.mutate(REORDER_VEHICLE_IMAGES, { vehicleId: v.id, imageIds: ids }).subscribe({
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

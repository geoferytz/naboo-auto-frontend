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

import { Api, toApiError } from '../core/api';
import {
  ADMIN_VEHICLE,
  CREATE_VEHICLE,
  REMOVE_VEHICLE_IMAGE,
  REORDER_VEHICLE_IMAGES,
  SET_VEHICLE_PUBLISHED,
  SET_VEHICLE_STATUS,
  UPDATE_VEHICLE,
} from '../core/admin-queries';
import {
  BODY_LABELS,
  CONDITION_LABELS,
  FUEL_LABELS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
  formatMoney,
  options,
} from '../core/format';
import { AdminVehicle, VehicleImage, VehicleStatus } from '../core/models';
import { SeoService } from '../core/seo.service';
import { applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';
import { VehiclePlaceholder } from '../shared/vehicle-placeholder';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff · Vehicles</span>
          <h1>{{ isNew() ? 'Add vehicle' : (vehicle()?.title ?? 'Edit vehicle') }}</h1>
        </div>
        @if (vehicle(); as v) {
          <a mat-stroked-button [routerLink]="['/cars-for-sale', v.slug]" target="_blank">View public page</a>
        }
      </div>
    </header>

    <div class="container section">
      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading vehicle…" errorText="We could not load this vehicle." (retry)="load()" />
      } @else {
        <div class="layout">
          <section class="card form-card" aria-labelledby="details-h">
            <h2 id="details-h">Details</h2>
            <form [formGroup]="form" (ngSubmit)="save()" class="form-grid" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Make</mat-label>
                <input matInput formControlName="make" maxlength="60" />
                <mat-error>{{ err('make', 'Make') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Model</mat-label>
                <input matInput formControlName="model" maxlength="80" />
                <mat-error>{{ err('model', 'Model') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Variant (optional)</mat-label>
                <input matInput formControlName="variant" maxlength="80" placeholder="e.g. TX Limited" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Year</mat-label>
                <input matInput formControlName="year" type="number" min="1950" [max]="currentYear + 1" />
                <mat-error>{{ err('year', 'Year') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Mileage (km, optional)</mat-label>
                <input matInput formControlName="mileageKm" type="number" min="0" />
                <mat-error>{{ err('mileageKm', 'Mileage') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Condition</mat-label>
                <mat-select formControlName="condition">
                  @for (o of conditionOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fuel</mat-label>
                <mat-select formControlName="fuelType">
                  @for (o of fuelOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Transmission</mat-label>
                <mat-select formControlName="transmission">
                  @for (o of transmissionOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Body type</mat-label>
                <mat-select formControlName="bodyType">
                  @for (o of bodyOptions; track o.value) {
                    <mat-option [value]="o.value">{{ o.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Colour (optional)</mat-label>
                <input matInput formControlName="color" maxlength="40" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Engine size (cc, optional)</mat-label>
                <input matInput formControlName="engineCapacityCc" type="number" min="0" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Price (TZS)</mat-label>
                <input matInput formControlName="priceAmount" inputmode="decimal" placeholder="e.g. 45000000" />
                <mat-error>{{ err('priceAmount', 'Price') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Registration no. (staff only)</mat-label>
                <input matInput formControlName="registrationNumber" maxlength="20" />
                <mat-error>{{ err('registrationNumber', 'Registration number') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="4" maxlength="5000"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Features — one per line</mat-label>
                <textarea matInput formControlName="features" rows="4"
                          placeholder="Air conditioning&#10;Reverse camera&#10;Leather seats"></textarea>
              </mat-form-field>
              @if (error()) {
                <p class="alert alert--error full" role="alert">{{ error() }}</p>
              }
              <div class="full actions">
                <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : isNew() ? 'Create vehicle' : 'Save changes' }}</button>
                <a mat-button routerLink="/admin/vehicles">Back to list</a>
              </div>
            </form>
          </section>

          @if (vehicle(); as v) {
            <aside class="side-col">
              <section class="card" aria-labelledby="state-h">
                <h2 id="state-h">Status</h2>
                <form [formGroup]="stateForm" (ngSubmit)="saveState()" class="state-form">
                  <mat-form-field appearance="outline">
                    <mat-label>Vehicle status</mat-label>
                    <mat-select formControlName="status">
                      @for (o of statusOptions; track o.value) {
                        <mat-option [value]="o.value">{{ o.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-checkbox formControlName="published" [disabled]="stateForm.controls.status.value === 'UNAVAILABLE'">
                    Published on the website
                  </mat-checkbox>
                  @if (stateError()) {
                    <p class="alert alert--error" role="alert">{{ stateError() }}</p>
                  }
                  <button mat-flat-button type="submit" [disabled]="saving()">Update status</button>
                </form>
                @if (v.statusHistory.length) {
                  <h3 class="sub">History</h3>
                  <ul class="history">
                    @for (h of v.statusHistory; track h.changedAt) {
                      <li>{{ h.fromStatus ? statusLabel(h.fromStatus) + ' → ' : '' }}{{ statusLabel(h.toStatus) }}
                        <span class="meta">{{ h.changedAt | date: 'medium' }}</span></li>
                    }
                  </ul>
                }
              </section>

              <section class="card" aria-labelledby="photos-h">
                <h2 id="photos-h">Photos</h2>
                @if (!v.images.length) {
                  <div class="empty-photos"><app-vehicle-placeholder /></div>
                }
                <ul class="photos">
                  @for (img of v.images; track img.id; let first = $first, last = $last) {
                    <li>
                      <img [src]="img.url" [alt]="img.altText" width="96" height="64" />
                      <div class="photo-info">
                        <span class="alt">{{ img.altText }}</span>
                        <div class="photo-actions">
                          <button mat-icon-button type="button" [disabled]="first || busy()" aria-label="Move photo earlier" (click)="move(img, -1)">
                            <mat-icon fontSet="material-symbols-outlined">arrow_upward</mat-icon>
                          </button>
                          <button mat-icon-button type="button" [disabled]="last || busy()" aria-label="Move photo later" (click)="move(img, 1)">
                            <mat-icon fontSet="material-symbols-outlined">arrow_downward</mat-icon>
                          </button>
                          <button mat-icon-button type="button" [disabled]="busy()" aria-label="Delete photo" (click)="removeImage(img)">
                            <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                          </button>
                        </div>
                      </div>
                    </li>
                  }
                </ul>
                <form [formGroup]="uploadForm" (ngSubmit)="upload()" class="upload">
                  <mat-form-field appearance="outline">
                    <mat-label>Describe the photo</mat-label>
                    <input matInput formControlName="altText" maxlength="200" placeholder="e.g. Front three-quarter view" />
                    <mat-error>{{ uploadErr() }}</mat-error>
                  </mat-form-field>
                  <label class="file-btn">
                    <input type="file" accept="image/jpeg,image/png,image/webp" (change)="pickFile($event)" [disabled]="busy()" />
                    <span class="mat-mdc-outlined-button file-label">
                      <mat-icon fontSet="material-symbols-outlined">upload</mat-icon>
                      {{ file()?.name ?? 'Choose photo…' }}
                    </span>
                  </label>
                  @if (uploadError()) {
                    <p class="alert alert--error" role="alert">{{ uploadError() }}</p>
                  }
                  <button mat-flat-button type="submit" [disabled]="!file() || busy()">
                    {{ busy() ? 'Working…' : 'Upload photo' }}
                  </button>
                  <p class="hint">JPEG, PNG or WebP up to 10 MB. Photos are re-encoded and resized on the server.</p>
                </form>
              </section>
            </aside>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .layout { display: grid; gap: var(--space-5); }
    .form-card, .side-col .card { padding: var(--space-5); }
    .side-col { display: flex; flex-direction: column; gap: var(--space-5); }
    .state-form { display: flex; flex-direction: column; gap: var(--space-3); }
    .sub { margin: var(--space-4) 0 var(--space-2); font-size: 1rem; }
    .history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
    .meta { display: block; font-size: .8rem; color: var(--naboo-text-muted); }
    .photos { list-style: none; margin: 0 0 var(--space-4); padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .photos li { display: flex; gap: var(--space-3); align-items: center; }
    .photos img { width: 96px; height: 64px; object-fit: cover; border-radius: var(--radius-sm); }
    .photo-info { flex: 1; min-width: 0; }
    .alt { display: block; font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .photo-actions { display: flex; }
    .empty-photos { max-width: 200px; margin-bottom: var(--space-4); }
    .upload { display: flex; flex-direction: column; gap: var(--space-3); }
    .file-btn input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .file-label { display: inline-flex; align-items: center; gap: var(--space-2); padding: 8px 16px; border: 1px solid var(--naboo-border);
      border-radius: var(--radius-sm); cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
    .hint { font-size: .8rem; color: var(--naboo-text-muted); margin: 0; }
    @media (min-width: 1080px) { .layout { grid-template-columns: 1fr 360px; align-items: start; } }
  `,
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

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
  ADMIN_SERVICES,
  CREATE_SERVICE,
  CREATE_SERVICE_CATEGORY,
  UPDATE_SERVICE,
  UPDATE_SERVICE_CATEGORY,
} from '../../core/admin-queries';
import { can } from '../../core/capabilities';
import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/format';
import { AdminServiceCategory, AdminServiceItem, PriceType } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  FIXED: 'Fixed price',
  STARTING_FROM: 'Starting from',
  HOURLY: 'Per hour',
  INSPECTION_REQUIRED: 'After inspection',
  QUOTE_REQUIRED: 'By quotation',
};

type Editing =
  | { kind: 'category'; id: string | null }
  | { kind: 'service'; id: string | null; categoryId: string }
  | null;

@Component({
  selector: 'app-admin-services',
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, LoadState],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class AdminServices {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly state = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly categories = signal<AdminServiceCategory[]>([]);
  protected readonly services = signal<AdminServiceItem[]>([]);
  protected readonly editing = signal<Editing>(null);
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly priceTypeOptions = (Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((value) => ({
    value,
    label: PRICE_TYPE_LABELS[value],
  }));

  protected readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
    sortOrder: [0, Validators.min(0)],
  });

  protected readonly serviceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    summary: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(4000)],
    imageUrl: ['', Validators.maxLength(500)],
    priceType: ['FIXED' as PriceType, Validators.required],
    priceAmount: ['', Validators.pattern(/^\d+(\.\d{1,2})?$/)],
    durationMinutes: [null as number | null, Validators.min(0)],
    sortOrder: [0, Validators.min(0)],
    active: [true],
  });

  constructor() {
    inject(SeoService).set({ title: 'Service catalogue', description: '', path: '/admin/services', noIndex: true });
    this.load();
  }

  protected editable(): boolean {
    return can.catalogueManage(this.auth.user()?.roles);
  }

  protected servicesOf(categoryId: string): AdminServiceItem[] {
    return this.services().filter((s) => s.category.id === categoryId);
  }

  protected priceLabel(s: AdminServiceItem): string {
    const amount = formatMoney(s.price);
    const labels: Record<PriceType, string> = {
      FIXED: amount,
      STARTING_FROM: `From ${amount}`,
      HOURLY: `${amount} / h`,
      INSPECTION_REQUIRED: 'After inspection',
      QUOTE_REQUIRED: 'By quotation',
    };
    return `${labels[s.priceType]}${s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}`;
  }

  protected needsPrice(): boolean {
    return ['FIXED', 'STARTING_FROM', 'HOURLY'].includes(this.serviceForm.controls.priceType.value);
  }

  protected load(): void {
    this.state.set('loading');
    this.api
      .query<{ serviceCategories: AdminServiceCategory[]; adminServices: AdminServiceItem[] }>(ADMIN_SERVICES)
      .subscribe({
        next: ({ serviceCategories, adminServices }) => {
          this.categories.set(serviceCategories);
          this.services.set(adminServices);
          this.state.set(serviceCategories.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  protected editCategory(cat: AdminServiceCategory | null): void {
    this.formError.set(null);
    this.categoryForm.setValue({ name: cat?.name ?? '', description: cat?.description ?? '', sortOrder: cat?.sortOrder ?? 0 });
    this.editing.set({ kind: 'category', id: cat?.id ?? null });
  }

  protected editService(s: AdminServiceItem | null, categoryId: string): void {
    this.formError.set(null);
    this.serviceForm.setValue({
      name: s?.name ?? '',
      summary: s?.summary ?? '',
      description: s?.description ?? '',
      imageUrl: s?.imageUrl ?? '',
      priceType: s?.priceType ?? 'FIXED',
      priceAmount: s?.price?.amount ?? '',
      durationMinutes: s?.durationMinutes ?? null,
      sortOrder: s?.sortOrder ?? 0,
      active: s?.active ?? true,
    });
    this.editing.set({ kind: 'service', id: s?.id ?? null, categoryId });
  }

  protected catErr(name: keyof typeof this.categoryForm.controls, label: string): string {
    return controlError(this.categoryForm.controls[name], label);
  }

  protected svcErr(name: keyof typeof this.serviceForm.controls, label: string): string {
    return controlError(this.serviceForm.controls[name], label);
  }

  protected saveCategory(): void {
    const ed = this.editing();
    if (this.categoryForm.invalid || !ed || ed.kind !== 'category') {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const v = this.categoryForm.getRawValue();
    const input = { name: v.name, description: v.description || null, sortOrder: v.sortOrder };
    this.finish(
      ed.id
        ? this.api.mutate(UPDATE_SERVICE_CATEGORY, { id: ed.id, input })
        : this.api.mutate(CREATE_SERVICE_CATEGORY, { input }),
      this.categoryForm,
    );
  }

  protected readonly uploadingImage = signal(false);

  protected uploadImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    (event.target as HTMLInputElement).value = '';
    this.uploadingImage.set(true);
    this.formError.set(null);
    const body = new FormData();
    body.set('file', file);
    this.http.post<{ url: string }>('/api/uploads/services', body).subscribe({
      next: (r) => {
        this.serviceForm.controls.imageUrl.setValue(r.url);
        this.serviceForm.controls.imageUrl.markAsDirty();
        this.uploadingImage.set(false);
      },
      error: (e) => {
        this.uploadingImage.set(false);
        this.formError.set(typeof e?.error?.message === 'string' ? e.error.message : 'Image upload failed.');
      },
    });
  }

  protected saveService(categoryId: string): void {
    const ed = this.editing();
    if (this.serviceForm.invalid || !ed || ed.kind !== 'service') {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const v = this.serviceForm.getRawValue();
    const input = {
      categoryId,
      name: v.name,
      summary: v.summary,
      description: v.description || null,
      imageUrl: v.imageUrl || null,
      priceType: v.priceType,
      priceAmount: this.needsPrice() ? v.priceAmount : null,
      durationMinutes: v.durationMinutes,
      active: v.active,
      sortOrder: v.sortOrder,
    };
    this.finish(
      ed.id ? this.api.mutate(UPDATE_SERVICE, { id: ed.id, input }) : this.api.mutate(CREATE_SERVICE, { input }),
      this.serviceForm,
    );
  }

  private finish(request: ReturnType<Api['mutate']>, form: typeof this.categoryForm | typeof this.serviceForm): void {
    this.busy.set(true);
    this.formError.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        const apiError = toApiError(e);
        applyServerErrors(form, apiError.fields);
        this.formError.set(apiError.message);
      },
    });
  }
}

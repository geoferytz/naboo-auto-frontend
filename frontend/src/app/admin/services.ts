import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../core/api';
import {
  ADMIN_SERVICES,
  CREATE_SERVICE,
  CREATE_SERVICE_CATEGORY,
  UPDATE_SERVICE,
  UPDATE_SERVICE_CATEGORY,
} from '../core/admin-queries';
import { can } from '../core/capabilities';
import { AuthService } from '../core/auth.service';
import { formatMoney } from '../core/format';
import { AdminServiceCategory, AdminServiceItem, PriceType } from '../core/models';
import { SeoService } from '../core/seo.service';
import { applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';

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
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, LoadState],
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Service catalogue</h1>
        </div>
        @if (editable()) {
          <button mat-flat-button type="button" (click)="editCategory(null)">Add category</button>
        }
      </div>
    </header>

    <div class="container section">
      @if (state() !== 'ready') {
        <app-load-state [state]="state()" loadingText="Loading catalogue…" (retry)="load()" />
      } @else {
        @for (cat of categories(); track cat.id) {
          <section class="card cat" [attr.aria-labelledby]="'cat-' + cat.id">
            <div class="cat-head">
              <div>
                <h2 [id]="'cat-' + cat.id">{{ cat.name }}</h2>
                @if (cat.description) {
                  <p class="hint">{{ cat.description }}</p>
                }
              </div>
              @if (editable()) {
                <div class="cat-actions">
                  <button mat-stroked-button type="button" (click)="editCategory(cat)">Edit</button>
                  <button mat-stroked-button type="button" (click)="editService(null, cat.id)">Add service</button>
                </div>
              }
            </div>
            <ul class="services">
              @for (s of servicesOf(cat.id); track s.id) {
                <li>
                  <div class="svc">
                    <strong>{{ s.name }}</strong>
                    @if (!s.active) {
                      <span class="badge">Hidden</span>
                    }
                    <span class="meta">{{ priceLabel(s) }}</span>
                  </div>
                  @if (editable()) {
                    <button mat-button type="button" (click)="editService(s, cat.id)">Edit</button>
                  }
                </li>
              } @empty {
                <li class="meta">No services in this category yet.</li>
              }
            </ul>
          </section>
        }

        @if (editing(); as ed) {
          <section class="card editor" aria-labelledby="editor-h">
            @if (ed.kind === 'category') {
              <h2 id="editor-h">{{ ed.id ? 'Edit category' : 'New category' }}</h2>
              <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="form-grid" novalidate>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" maxlength="80" />
                  <mat-error>{{ catErr('name', 'Name') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Description (optional)</mat-label>
                  <textarea matInput formControlName="description" rows="2" maxlength="500"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sort order</mat-label>
                  <input matInput formControlName="sortOrder" type="number" min="0" />
                </mat-form-field>
                @if (formError()) {
                  <p class="alert alert--error full" role="alert">{{ formError() }}</p>
                }
                <div class="full actions">
                  <button mat-flat-button type="submit" [disabled]="busy()">Save category</button>
                  <button mat-button type="button" (click)="editing.set(null)">Cancel</button>
                </div>
              </form>
            } @else {
              <h2 id="editor-h">{{ ed.id ? 'Edit service' : 'New service' }}</h2>
              <form [formGroup]="serviceForm" (ngSubmit)="saveService(ed.categoryId)" class="form-grid" novalidate>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" maxlength="100" />
                  <mat-error>{{ svcErr('name', 'Name') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Summary</mat-label>
                  <input matInput formControlName="summary" maxlength="200" />
                  <mat-error>{{ svcErr('summary', 'Summary') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Description (optional)</mat-label>
                  <textarea matInput formControlName="description" rows="3" maxlength="4000"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Price type</mat-label>
                  <mat-select formControlName="priceType">
                    @for (o of priceTypeOptions; track o.value) {
                      <mat-option [value]="o.value">{{ o.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (needsPrice()) {
                  <mat-form-field appearance="outline">
                    <mat-label>Price (TZS)</mat-label>
                    <input matInput formControlName="priceAmount" inputmode="decimal" />
                    <mat-error>{{ svcErr('priceAmount', 'Price') }}</mat-error>
                  </mat-form-field>
                }
                <mat-form-field appearance="outline">
                  <mat-label>Duration (minutes, optional)</mat-label>
                  <input matInput formControlName="durationMinutes" type="number" min="0" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sort order</mat-label>
                  <input matInput formControlName="sortOrder" type="number" min="0" />
                </mat-form-field>
                <mat-checkbox formControlName="active" class="full">Visible on the website</mat-checkbox>
                @if (formError()) {
                  <p class="alert alert--error full" role="alert">{{ formError() }}</p>
                }
                <div class="full actions">
                  <button mat-flat-button type="submit" [disabled]="busy()">Save service</button>
                  <button mat-button type="button" (click)="editing.set(null)">Cancel</button>
                </div>
              </form>
            }
          </section>
        }
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .cat { padding: var(--space-4); margin-bottom: var(--space-4); }
    .cat-head { display: flex; justify-content: space-between; align-items: start; gap: var(--space-3); flex-wrap: wrap;
      margin-bottom: var(--space-3); }
    .cat-head h2 { margin: 0; font-size: 1.15rem; }
    .cat-actions { display: flex; gap: var(--space-2); }
    .hint { color: var(--naboo-text-muted); font-size: .9rem; margin: var(--space-1) 0 0; }
    .services { list-style: none; margin: 0; padding: 0; }
    .services li { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
      padding: var(--space-2) 0; border-top: 1px solid var(--naboo-border); }
    .meta { color: var(--naboo-text-muted); font-size: .85rem; display: block; }
    .badge { padding: 1px 8px; border-radius: 999px; font-size: .75rem; font-weight: 600; background: var(--naboo-grey);
      margin-left: var(--space-2); }
    .editor { padding: var(--space-5); border: 2px solid var(--naboo-red); }
  `,
})
export class AdminServices {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

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

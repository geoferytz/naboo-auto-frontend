import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../../core/api';
import { CREATE_STAFF_USER, SET_USER_ENABLED, SET_USER_ROLES, STAFF_USERS, USERS } from '../../core/admin-queries';
import { AuthService } from '../../core/auth.service';
import { Page, Role, User } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../../shared/form-errors';
import { LoadState } from '../../shared/load-state/load-state';

const STAFF_ROLES: { value: Role; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES_AGENT', label: 'Sales agent' },
  { value: 'RENTAL_AGENT', label: 'Rental agent' },
  { value: 'SERVICE_ADVISOR', label: 'Service advisor' },
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory manager' },
  { value: 'FINANCE_OFFICER', label: 'Finance officer' },
];

const ROLE_LABELS = new Map(STAFF_ROLES.map((r) => [r.value, r.label] as const));
ROLE_LABELS.set('CUSTOMER', 'Customer');

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LoadState],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class AdminUsers {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  protected readonly staff = signal<User[]>([]);
  protected readonly staffState = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly users = signal<User[]>([]);
  protected readonly usersPage = signal<Page<User> | null>(null);
  protected readonly usersState = signal<'loading' | 'error' | 'empty' | 'ready'>('loading');
  protected readonly includeDisabled = signal(false);
  protected readonly creating = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly createError = signal<string | null>(null);
  protected readonly staffRoles = STAFF_ROLES;
  protected readonly meId = () => this.auth.user()?.id;

  protected readonly createForm = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', Validators.pattern(PHONE_PATTERN)],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    roles: [[] as Role[], Validators.required],
  });

  protected readonly searchForm = inject(FormBuilder).nonNullable.group({ q: [''] });

  constructor() {
    inject(SeoService).set({ title: 'Manage users', description: '', path: '/admin/users', noIndex: true });
    this.loadStaff();
    this.search(0);
  }

  protected err(name: keyof typeof this.createForm.controls, label: string): string {
    return controlError(this.createForm.controls[name], label);
  }

  protected roleList(u: User): string {
    return u.roles.map((r) => ROLE_LABELS.get(r) ?? r).join(', ');
  }

  protected setIncludeDisabled(event: Event): void {
    this.includeDisabled.set((event.target as HTMLInputElement).checked);
    this.loadStaff();
  }

  protected loadStaff(): void {
    this.staffState.set('loading');
    this.api.query<{ staffUsers: User[] }>(STAFF_USERS, { includeDisabled: this.includeDisabled() }).subscribe({
      next: ({ staffUsers }) => {
        this.staff.set(staffUsers);
        this.staffState.set(staffUsers.length ? 'ready' : 'empty');
      },
      error: () => this.staffState.set('error'),
    });
  }

  protected search(page = 0): void {
    this.usersState.set('loading');
    this.api
      .query<{ users: Page<User> }>(USERS, { search: this.searchForm.getRawValue().q || null, page, size: 20 })
      .subscribe({
        next: ({ users }) => {
          this.usersPage.set(users);
          this.users.set(users.items);
          this.usersState.set(users.items.length ? 'ready' : 'empty');
        },
        error: () => this.usersState.set('error'),
      });
  }

  protected create(): void {
    this.createError.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    this.busy.set(true);
    this.api
      .mutate<{ createStaffUser: User }>(CREATE_STAFF_USER, {
        input: { ...v, phone: v.phone || null, roles: v.roles },
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.creating.set(false);
          this.createForm.reset({ roles: [] });
          this.loadStaff();
        },
        error: (e) => {
          this.busy.set(false);
          const apiError = toApiError(e);
          applyServerErrors(this.createForm, apiError.fields);
          this.createError.set(apiError.message);
        },
      });
  }

  protected setRoles(u: User, roles: Role[]): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(SET_USER_ROLES, { id: u.id, roles }).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadStaff();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
        this.loadStaff();
      },
    });
  }

  protected toggleEnabled(u: User): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.mutate(SET_USER_ENABLED, { id: u.id, enabled: u.enabled === false }).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadStaff();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}

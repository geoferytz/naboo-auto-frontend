import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api, toApiError } from '../core/api';
import { CREATE_STAFF_USER, SET_USER_ENABLED, SET_USER_ROLES, STAFF_USERS, USERS } from '../core/admin-queries';
import { AuthService } from '../core/auth.service';
import { Page, Role, User } from '../core/models';
import { SeoService } from '../core/seo.service';
import { PHONE_PATTERN, applyServerErrors, controlError } from '../shared/form-errors';
import { LoadState } from '../shared/load-state';

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
  template: `
    <header class="page-header page-header--tight">
      <div class="container head">
        <div>
          <span class="eyebrow">Staff</span>
          <h1>Users</h1>
        </div>
        <button mat-flat-button type="button" (click)="creating.set(!creating())">
          {{ creating() ? 'Close' : 'Add staff user' }}
        </button>
      </div>
    </header>

    <div class="container section">
      @if (creating()) {
        <section class="card editor" aria-labelledby="new-staff-h">
          <h2 id="new-staff-h">New staff account</h2>
          <form [formGroup]="createForm" (ngSubmit)="create()" class="form-grid" novalidate>
            <mat-form-field appearance="outline">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="fullName" maxlength="120" />
              <mat-error>{{ err('fullName', 'Full name') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" maxlength="254" />
              <mat-error>{{ err('email', 'Email') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Phone (optional)</mat-label>
              <input matInput formControlName="phone" type="tel" />
              <mat-error>{{ err('phone', 'Phone number') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Temporary password</mat-label>
              <input matInput formControlName="password" type="text" autocomplete="off" />
              <mat-error>{{ err('password', 'Password') }}</mat-error>
              <mat-hint>At least 12 characters. The user should change it after signing in.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Roles</mat-label>
              <mat-select formControlName="roles" multiple>
                @for (r of staffRoles; track r.value) {
                  <mat-option [value]="r.value">{{ r.label }}</mat-option>
                }
              </mat-select>
              <mat-error>{{ err('roles', 'Roles') }}</mat-error>
            </mat-form-field>
            @if (createError()) {
              <p class="alert alert--error full" role="alert">{{ createError() }}</p>
            }
            <div class="full actions">
              <button mat-flat-button type="submit" [disabled]="busy()">Create account</button>
            </div>
          </form>
        </section>
      }

      <h2 class="sub">Staff</h2>
      <label class="check">
        <input type="checkbox" [checked]="includeDisabled()" (change)="setIncludeDisabled($event)" />
        Show disabled accounts
      </label>
      @if (staffState() !== 'ready') {
        <app-load-state [state]="staffState()" loadingText="Loading staff…" (retry)="loadStaff()" />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of staff(); track u.id) {
                <tr>
                  <td>{{ u.fullName }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <mat-form-field appearance="outline" class="roles-field">
                      <mat-select [value]="u.roles" (selectionChange)="setRoles(u, $event.value)" multiple [disabled]="u.id === meId()">
                        @for (r of staffRoles; track r.value) {
                          <mat-option [value]="r.value">{{ r.label }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </td>
                  <td>{{ u.enabled === false ? 'Disabled' : 'Active' }}</td>
                  <td>{{ u.lastLoginAt ? (u.lastLoginAt | date: 'short') : 'Never' }}</td>
                  <td>
                    @if (u.id !== meId()) {
                      <button mat-stroked-button type="button" [disabled]="busy()" (click)="toggleEnabled(u)">
                        {{ u.enabled === false ? 'Enable' : 'Disable' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <h2 class="sub">All users</h2>
      <form [formGroup]="searchForm" (ngSubmit)="search()" class="search" role="search">
        <mat-form-field appearance="outline">
          <mat-label>Search by name or email</mat-label>
          <input matInput formControlName="q" />
        </mat-form-field>
        <button mat-stroked-button type="submit">Search</button>
      </form>
      @if (usersState() !== 'ready') {
        <app-load-state [state]="usersState()" loadingText="Loading users…" emptyText="No users found." (retry)="search()" />
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Roles</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>{{ u.fullName }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ roleList(u) }}</td>
                  <td>{{ u.enabled === false ? 'Disabled' : 'Active' }}</td>
                  <td>{{ u.createdAt | date: 'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if ((usersPage()?.totalPages ?? 0) > 1) {
          <nav class="pager" aria-label="Pages">
            <button mat-stroked-button type="button" [disabled]="usersPage()!.page === 0" (click)="search(usersPage()!.page - 1)">Previous</button>
            <span>Page {{ usersPage()!.page + 1 }} of {{ usersPage()!.totalPages }}</span>
            <button mat-stroked-button type="button" [disabled]="usersPage()!.page + 1 >= usersPage()!.totalPages" (click)="search(usersPage()!.page + 1)">Next</button>
          </nav>
        }
      }
      @if (error()) {
        <p class="alert alert--error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
    .sub { margin: var(--space-6) 0 var(--space-3); font-size: 1.1rem; }
    .editor { padding: var(--space-5); border: 2px solid var(--naboo-red); margin-bottom: var(--space-5); }
    .check { display: inline-flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--naboo-white); }
    th, td { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--naboo-border); vertical-align: middle; }
    th { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--naboo-text-muted); }
    .roles-field { min-width: 200px; }
    .search { display: flex; gap: var(--space-3); align-items: start; margin-bottom: var(--space-3); }
    .pager { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-4); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
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

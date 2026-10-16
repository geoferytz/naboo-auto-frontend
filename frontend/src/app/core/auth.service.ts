import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { Api } from './api';
import { AuthPayload, User } from './models';
import { LOGIN, ME, REGISTER } from './queries';

const STORAGE_KEY = 'naboo.session';

interface StoredSession {
  token: string;
  expiresAt: string;
}

/**
 * Holds the short-lived access token. The token is kept in sessionStorage (cleared when the
 * browser session ends) and is discarded as soon as it expires.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(readSession());
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    if (this.session()) {
      // Deferred: the HTTP interceptor injects this service, so it must finish constructing first.
      queueMicrotask(() =>
        this.api.query<{ me: User | null }>(ME).subscribe({
          next: ({ me }) => (me ? this.user.set(me) : this.clear()),
          error: () => this.clear(),
        }),
      );
    }
  }

  token(): string | null {
    const s = this.session();
    if (s && Date.parse(s.expiresAt) <= Date.now()) {
      this.clear();
      return null;
    }
    return s?.token ?? null;
  }

  login(email: string, password: string): Observable<{ login: AuthPayload }> {
    return this.api
      .mutate<{ login: AuthPayload }>(LOGIN, { input: { email, password } })
      .pipe(tap(({ login }) => this.store(login)));
  }

  register(input: { email: string; password: string; fullName: string; phone: string | null }): Observable<{ register: AuthPayload }> {
    return this.api
      .mutate<{ register: AuthPayload }>(REGISTER, { input })
      .pipe(tap(({ register }) => this.store(register)));
  }

  logout(): void {
    this.clear();
    void this.router.navigateByUrl('/');
  }

  private store(payload: AuthPayload): void {
    const s = { token: payload.token, expiresAt: payload.expiresAt };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    this.session.set(s);
    this.user.set(payload.user);
  }

  private clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.user.set(null);
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as StoredSession) : null;
    return s && Date.parse(s.expiresAt) > Date.now() ? s : null;
  } catch {
    return null;
  }
}

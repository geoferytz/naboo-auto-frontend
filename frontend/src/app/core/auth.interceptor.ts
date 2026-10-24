import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Attaches the bearer token to same-origin API requests only (GraphQL and uploads).
 * If a stored token is rejected with 401, the session is dropped and the request is
 * retried once without it — public endpoints recover transparently instead of the
 * whole app failing to load until storage is cleared manually.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/graphql') && !req.url.startsWith('/api/')) {
    return next(req);
  }
  const auth = inject(AuthService);
  const token = auth.token();
  const send = (t: string | null): Observable<HttpEvent<unknown>> =>
    next(t ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);
  return send(token).pipe(
    catchError((e: unknown) => {
      if (token && e instanceof HttpErrorResponse && e.status === 401) {
        auth.clearSession();
        return send(null);
      }
      throw e;
    }),
  );
};

import { Injectable, inject } from '@angular/core';
import { CombinedGraphQLErrors } from '@apollo/client';
import { Apollo } from 'apollo-angular';
import type { DocumentNode } from 'graphql';
import { Observable, map } from 'rxjs';

type Variables = Record<string, unknown>;

/** Field-level validation messages returned by the backend (extensions.fields). */
export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  code?: string;
  fields: FieldError[];
}

/**
 * Thin typed wrapper around Apollo. Every request goes to the network so that prices,
 * availability and statuses always reflect the backend.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly apollo = inject(Apollo);

  query<T>(query: DocumentNode, variables: Variables = {}): Observable<T> {
    return this.apollo
      .query<T, Variables>({ query, variables, fetchPolicy: 'network-only' })
      .pipe(map((r) => r.data as T));
  }

  mutate<T>(mutation: DocumentNode, variables: Variables = {}): Observable<T> {
    return this.apollo.mutate<T, Variables>({ mutation, variables }).pipe(map((r) => r.data as T));
  }
}

export function toApiError(error: unknown): ApiError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const ext = (first?.extensions ?? {}) as { code?: string; fields?: FieldError[]; classification?: string };
    if (ext.classification === 'UNAUTHORIZED') {
      return { message: 'Please sign in to continue.', code: 'UNAUTHORIZED', fields: [] };
    }
    if (ext.classification === 'FORBIDDEN') {
      return { message: 'You do not have permission to do that.', code: 'FORBIDDEN', fields: [] };
    }
    const internal = ext.classification === 'INTERNAL_ERROR';
    return {
      message: internal ? 'Something went wrong on our side. Please try again.' : (first?.message ?? 'Request failed.'),
      code: ext.code,
      fields: ext.fields ?? [],
    };
  }
  return {
    message: 'We could not reach Naboo Automotive. Check your connection and try again.',
    code: 'NETWORK',
    fields: [],
  };
}

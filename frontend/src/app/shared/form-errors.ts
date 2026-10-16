import { AbstractControl, FormGroup } from '@angular/forms';

import { FieldError } from '../core/api';

/** Returns a human-readable message for the first validation error on a control. */
export function controlError(control: AbstractControl | null, label = 'This field'): string {
  const e = control?.errors;
  if (!e) {
    return '';
  }
  if (e['required']) return `${label} is required.`;
  if (e['email']) return 'Enter a valid email address.';
  if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters.`;
  if (e['maxlength']) return `${label} must be at most ${e['maxlength'].requiredLength} characters.`;
  if (e['pattern']) return `Enter a valid ${label.toLowerCase()}.`;
  if (e['server']) return e['server'];
  return `${label} is invalid.`;
}

/** Applies backend field errors (extensions.fields) onto matching form controls. */
export function applyServerErrors(form: FormGroup, fields: FieldError[]): void {
  for (const f of fields) {
    const control = form.get(f.field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: capitalise(f.message) });
      control.markAsTouched();
    }
  }
}

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1) + (s.endsWith('.') ? '' : '.');
}

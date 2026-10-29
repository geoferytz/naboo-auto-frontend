import { FormControl, FormGroup, Validators } from '@angular/forms';

import { safeRedirect } from '../pages/login/login';
import { PHONE_PATTERN, applyServerErrors, controlError } from './form-errors';

describe('form helpers', () => {
  it('maps server field errors onto controls', () => {
    const form = new FormGroup({ password: new FormControl('x') });
    applyServerErrors(form, [{ field: 'password', message: 'must be between 10 and 128 characters' }]);
    expect(controlError(form.controls.password, 'Password')).toBe('Must be between 10 and 128 characters.');
  });

  it('describes client-side validation errors', () => {
    const c = new FormControl('', Validators.required);
    expect(controlError(c, 'Email')).toBe('Email is required.');
  });

  it('accepts Tanzanian phone formats', () => {
    expect(PHONE_PATTERN.test('+255 712 345 678')).toBe(true);
    expect(PHONE_PATTERN.test('0712345678')).toBe(true);
    expect(PHONE_PATTERN.test('call me')).toBe(false);
  });

  it('only allows relative redirects after login', () => {
    expect(safeRedirect('/cars-for-sale')).toBe('/cars-for-sale');
    expect(safeRedirect('//evil.example')).toBe('/my-account');
    expect(safeRedirect('https://evil.example')).toBe('/my-account');
    expect(safeRedirect(undefined)).toBe('/my-account');
  });
});

import { Component, input } from '@angular/core';

/** Neutral artwork shown when a listing has no photos yet. */
@Component({
  selector: 'app-vehicle-placeholder',
  template: `
    <svg viewBox="0 0 320 200" role="img" [attr.aria-label]="'Photo coming soon' + (label() ? ' for ' + label() : '')">
      <rect width="320" height="200" fill="#e9ecef" />
      <path
        d="M58 128c0-8 4-14 12-16l30-8 24-22c6-5 13-8 21-8h50c9 0 17 4 23 10l20 22 26 5c8 2 14 9 14 17v12c0 5-4 8-8 8h-12a24 24 0 0 0-47 0h-92a24 24 0 0 0-47 0h-6c-5 0-8-3-8-8z"
        fill="#c9ced4"
      />
      <circle cx="98" cy="146" r="17" fill="#30343b" />
      <circle cx="235" cy="146" r="17" fill="#30343b" />
      <path d="M131 84h40v24h-60zM180 84h22l20 24h-42z" fill="#e9ecef" />
      <text x="160" y="186" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#7a818b">
        Photos coming soon
      </text>
    </svg>
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    svg { width: 100%; height: 100%; display: block; }
  `,
})
export class VehiclePlaceholder {
  readonly label = input<string>('');
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#E52B36" />
      <path d="M10 29V11h4l9 11.6V11h4v18h-4l-9-11.6V29z" fill="#fff" />
    </svg>
    <span class="word">NABOO<span class="sub">AUTOMOTIVE</span></span>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 10px; }
    .word { display: flex; flex-direction: column; font-weight: 800; font-size: 1.15rem; letter-spacing: 0.12em; line-height: 1; }
    .sub { font-size: 0.56rem; font-weight: 600; letter-spacing: 0.32em; color: #aab0b8; margin-top: 4px; }
  `,
})
export class Logo {}

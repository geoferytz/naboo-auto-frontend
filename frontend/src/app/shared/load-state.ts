import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Consistent loading / error / empty presentation for data-driven sections. */
@Component({
  selector: 'app-load-state',
  imports: [MatProgressSpinnerModule, MatButtonModule],
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="state" role="status" aria-live="polite">
          <mat-progress-spinner mode="indeterminate" diameter="36" aria-label="Loading" />
          <span>{{ loadingText() }}</span>
        </div>
      }
      @case ('error') {
        <div class="state alert alert--error" role="alert">
          <p>{{ errorText() }}</p>
          <button mat-stroked-button type="button" (click)="retry.emit()">Try again</button>
        </div>
      }
      @case ('empty') {
        <div class="state empty">
          <p>{{ emptyText() }}</p>
          <ng-content />
        </div>
      }
    }
  `,
  styles: `
    .state { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-7) var(--space-4);
      text-align: center; color: var(--naboo-text-muted); }
    .alert { align-items: flex-start; text-align: left; padding: var(--space-4); }
    .alert p { margin: 0; color: var(--naboo-text); }
    .empty { background: var(--naboo-grey); border-radius: var(--radius-md); }
  `,
})
export class LoadState {
  readonly state = input.required<'loading' | 'error' | 'empty' | 'ready'>();
  readonly loadingText = input('Loading…');
  readonly errorText = input('We could not load this information.');
  readonly emptyText = input('Nothing to show yet.');
  readonly retry = output<void>();
}

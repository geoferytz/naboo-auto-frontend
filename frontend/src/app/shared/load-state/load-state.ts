import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Consistent loading / error / empty presentation for data-driven sections. */
@Component({
  selector: 'app-load-state',
  imports: [MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './load-state.html',
  styleUrl: './load-state.css',
})
export class LoadState {
  readonly state = input.required<'loading' | 'error' | 'empty' | 'ready'>();
  readonly loadingText = input('Loading…');
  readonly errorText = input('We could not load this information.');
  readonly emptyText = input('Nothing to show yet.');
  readonly retry = output<void>();
}

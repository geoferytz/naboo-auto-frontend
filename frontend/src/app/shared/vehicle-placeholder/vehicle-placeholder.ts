import { Component, input } from '@angular/core';

/** Neutral artwork shown when a listing has no photos yet. */
@Component({
  selector: 'app-vehicle-placeholder',
  templateUrl: './vehicle-placeholder.html',
  styleUrl: './vehicle-placeholder.css',
})
export class VehiclePlaceholder {
  readonly label = input<string>('');
}

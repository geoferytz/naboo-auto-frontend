import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS, formatMoney, formatNumber } from '../../core/format';
import { VehicleCard as Vehicle } from '../../core/models';
import { VehiclePlaceholder } from '../vehicle-placeholder/vehicle-placeholder';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, MatButtonModule, MatIconModule, VehiclePlaceholder],
  templateUrl: './vehicle-card.html',
  styleUrl: './vehicle-card.css',
})
export class VehicleCardComponent {
  readonly vehicle = input.required<Vehicle>();
  readonly compact = input(false);
  readonly row = input(false);
  protected readonly body = BODY_LABELS;
  protected readonly cover = computed(() => this.vehicle().images[0] ?? null);
  protected readonly fuel = FUEL_LABELS;
  protected readonly transmission = TRANSMISSION_LABELS;
  protected readonly condition = CONDITION_LABELS;
  protected readonly statusLabel = STATUS_LABELS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;
}

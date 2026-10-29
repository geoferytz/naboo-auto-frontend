import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { whatsappLink } from '../../core/business';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-car-exchange',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './car-exchange.html',
  styleUrl: './car-exchange.css',
})
export class CarExchange {
  protected readonly whatsapp = whatsappLink('Hi Naboo Automotive — I would like to discuss a car exchange.');

  constructor() {
    inject(SeoService).set({
      title: 'Car Exchange',
      description: 'Discuss exchanging your current vehicle with Naboo Automotive. Share your vehicle details and the car you are looking for to request an assessment.',
      path: '/car-exchange',
    });
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BUSINESS } from '../../core/business';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, Logo],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly business = BUSINESS;
  protected readonly year = new Date().getFullYear();
  protected readonly socials = [
    { label: 'Facebook', url: BUSINESS.socials?.facebook },
    { label: 'Instagram', url: BUSINESS.socials?.instagram },
    { label: 'X', url: BUSINESS.socials?.x },
    { label: 'LinkedIn', url: BUSINESS.socials?.linkedin },
  ].filter((s): s is { label: string; url: string } => !!s.url);
  protected readonly hasSocials = this.socials.length > 0;
}

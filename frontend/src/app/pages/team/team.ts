import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { BUSINESS } from '../../core/business';
import { SeoService } from '../../core/seo.service';
import { SiteContentStore, TeamMember } from '../../core/site-content';

@Component({
  selector: 'app-team',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class Team {
  protected readonly business = BUSINESS;
  private readonly site = inject(SiteContentStore);

  protected readonly members = computed<TeamMember[]>(() => this.site.content().teamMembers ?? []);
  protected readonly page = computed(() => this.site.content().teamPage ?? {});

  protected initials(name: string): string {
    return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  protected waHref(member: TeamMember): string {
    const number = (member.whatsapp ?? BUSINESS.whatsapp ?? '').replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent(`Hi Naboo Automotive — I would like to speak with ${member.name}.`)}`;
  }

  protected telHref(member: TeamMember): string {
    return `tel:${(member.phone ?? BUSINESS.phone ?? '').replace(/\s/g, '')}`;
  }

  protected mailHref(member: TeamMember): string {
    return `mailto:${member.email ?? BUSINESS.email}`;
  }

  constructor() {
    this.site.load();
    inject(SeoService).set({
      title: 'Our team',
      description: 'Meet the people behind Naboo Automotive — sales, workshop and customer care, all under one roof in Dodoma, Tanzania.',
      path: '/about/team',
    });
  }
}

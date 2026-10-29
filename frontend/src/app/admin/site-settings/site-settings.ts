import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Api } from '../../core/api';
import { BUSINESS } from '../../core/business';
import { SITE_CONTENT, UPDATE_SITE_CONTENT } from '../../core/queries';
import {
  AdvantageContent,
  DEFAULT_ADVANTAGE,
  DEFAULT_HERO_SLIDES,
  DEFAULT_PILLARS,
  DEFAULT_TEAM,
  DEFAULT_WORK_STEPS,
  DEFAULT_WORKSHOP_ITEMS,
  HeroBadge,
  HeroSlide,
  IconTextItem,
  SiteContent,
  SiteContentStore,
  SitePillar,
  TeamMember,
  WorkshopItem,
} from '../../core/site-content';
import { SeoService } from '../../core/seo.service';
import { LoadState } from '../../shared/load-state/load-state';

interface EditableSlide extends HeroSlide {
  caption: { title: string; specs: string[]; link?: string };
  /** Comma-separated editing buffer for caption.specs. */
  specText: string;
  /** One badge per line, "icon|text". */
  badgeText: string;
}

type Doc = Omit<SiteContent, 'heroSlides' | 'pillars' | 'advantage' | 'workSteps' | 'teamMembers' | 'teamPage' | 'workshopPage' | 'workshopItems' | 'contactPage' | 'openingHours'> & {
  heroSlides: EditableSlide[];
  pillars: SitePillar[];
  advantage: AdvantageContent;
  workSteps: { title: string; text: string }[];
  teamMembers: TeamMember[];
  teamPage: { eyebrow: string; heading: string; lead: string };
  workshopPage: { eyebrow: string; heading: string; lead: string };
  workshopItems: WorkshopItem[];
  contactPage: { eyebrow: string; heading: string; lead: string };
  /** One opening-hours line per row. */
  openingHoursText: string;
};

@Component({
  selector: 'app-admin-site-settings',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, LoadState],
  templateUrl: './site-settings.html',
  styleUrl: './site-settings.css',
})
export class AdminSiteSettings {
  private readonly api = inject(Api);
  private readonly http = inject(HttpClient);
  private readonly store = inject(SiteContentStore);

  protected doc: Doc | null = null;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(0);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(SeoService).set({ title: 'Site settings', description: 'Manage public site content.', path: '/admin/site-settings', noIndex: true });
    this.reload();
  }

  protected reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.query<{ siteContent: string | null }>(SITE_CONTENT).subscribe({
      next: (d) => {
        this.doc = buildDoc(d.siteContent);
        this.loading.set(false);
      },
      error: () => {
        this.doc = null;
        this.loading.set(false);
      },
    });
  }

  protected readonly themePresets = [
    { name: 'Naboo red', color: '#e52b36' },
    { name: 'Ocean blue', color: '#1565d8' },
    { name: 'Forest green', color: '#15803d' },
    { name: 'Sunset orange', color: '#ea580c' },
    { name: 'Royal purple', color: '#7c3aed' },
    { name: 'Gold', color: '#b8860b' },
  ];

  protected addSlide(): void {
    this.doc?.heroSlides.push(editSlide({ ...blankSlide() }));
  }

  protected remove<T>(list: T[], i: number): void {
    list.splice(i, 1);
  }

  protected addPillar(): void {
    this.doc?.pillars.push({ icon: 'star', image: '', imageAlt: '', title: 'New card', text: '', cta: 'Learn more' });
  }

  protected addAdvantage(): void {
    this.doc?.advantage.items.push({ icon: 'star', title: 'New item', text: '' });
  }

  protected addStep(): void {
    this.doc?.workSteps.push({ title: '', text: '' });
  }

  protected addMember(): void {
    this.doc?.teamMembers.push({ name: 'New member', role: '', bio: '' });
  }

  protected addWorkshopItem(): void {
    this.doc?.workshopItems.push({ kind: 'completed', title: 'New item', caption: '', image: '' });
  }

  protected upload(event: Event, target: object, key: string): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    (event.target as HTMLInputElement).value = '';
    this.uploading.update((n) => n + 1);
    const body = new FormData();
    body.set('file', file);
    this.http.post<{ url: string }>('/api/uploads/site', body).subscribe({
      next: (r) => {
        (target as Record<string, unknown>)[key] = r.url;
        this.uploading.update((n) => n - 1);
      },
      error: (e) => {
        this.uploading.update((n) => n - 1);
        this.error.set(typeof e?.error?.message === 'string' ? e.error.message : 'Image upload failed.');
      },
    });
  }

  protected save(): void {
    if (!this.doc || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    const content = JSON.stringify(toContent(this.doc));
    this.api.mutate<{ updateSiteContent: string }>(UPDATE_SITE_CONTENT, { content }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.store.refresh();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(typeof e?.message === 'string' ? e.message : 'Save failed. Please try again.');
      },
    });
  }
}

function blankSlide(): HeroSlide {
  return {
    image: '',
    alt: '',
    label: 'New slide',
    headline: 'Headline',
    description: '',
    primary: { label: 'Learn more', link: '/' },
    secondary: { label: 'Contact us', link: '/contact' },
    badges: [],
  };
}

function editSlide(s: HeroSlide): EditableSlide {
  return {
    ...s,
    caption: { title: s.caption?.title ?? '', specs: s.caption?.specs ?? [], link: s.caption?.link },
    specText: s.caption?.specs.join(', ') ?? '',
    badgeText: (s.badges ?? []).map((b) => `${b.icon}|${b.text}`).join('\n'),
  };
}

function toContent(doc: Doc): SiteContent {
  const heroSlides: HeroSlide[] = doc.heroSlides.map((s) => {
    const { specText, badgeText, ...slide } = s;
    const badges: HeroBadge[] = badgeText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [icon, ...text] = line.split('|');
        return { icon: icon.trim() || 'check_circle', text: text.join('|').trim() };
      });
    const specs = specText.split(',').map((x) => x.trim()).filter((x) => x.length > 0);
    return {
      ...slide,
      badges: badges.length ? badges : undefined,
      caption: slide.caption.title || specs.length ? { title: slide.caption.title, specs, link: slide.caption.link } : undefined,
    };
  });
  const { openingHoursText, ...rest } = doc;
  const openingHours = openingHoursText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  return { ...rest, heroSlides, openingHours };
}

function buildDoc(raw: string | null): Doc {
  let stored: SiteContent = {};
  try {
    stored = raw ? (JSON.parse(raw) as SiteContent) : {};
  } catch {
    stored = {};
  }
  return {
    logoUrl: stored.logoUrl ?? BUSINESS.logoUrl ?? '',
    location: stored.location ?? BUSINESS.address ?? '',
    phone: stored.phone ?? BUSINESS.phone ?? '',
    email: stored.email ?? BUSINESS.email ?? '',
    whatsapp: stored.whatsapp ?? BUSINESS.whatsapp ?? '',
    themeColor: stored.themeColor ?? '#e52b36',
    heroSlides: (stored.heroSlides ?? DEFAULT_HERO_SLIDES).map(editSlide),
    pillars: structuredClone(stored.pillars ?? DEFAULT_PILLARS),
    advantage: structuredClone(stored.advantage ?? DEFAULT_ADVANTAGE),
    workSteps: structuredClone(stored.workSteps ?? DEFAULT_WORK_STEPS),
    teamMembers: structuredClone(stored.teamMembers ?? DEFAULT_TEAM),
    teamPage: {
      eyebrow: stored.teamPage?.eyebrow ?? 'Our team',
      heading: stored.teamPage?.heading ?? 'The people behind Naboo Automotive',
      lead: stored.teamPage?.lead ??
        'From the showroom floor to the workshop bench — meet the team that keeps our customers moving. Reach any of us directly, or send a general enquiry.',
    },
    workshopPage: {
      eyebrow: stored.workshopPage?.eyebrow ?? 'Our workshop',
      heading: stored.workshopPage?.heading ?? 'See the work we do',
      lead: stored.workshopPage?.lead ??
        'Repairs, painting, restoration and detailing — a look inside our workshop, from work in progress to finished results.',
    },
    workshopItems: structuredClone(stored.workshopItems ?? DEFAULT_WORKSHOP_ITEMS),
    contactPage: {
      eyebrow: stored.contactPage?.eyebrow ?? 'Contact',
      heading: stored.contactPage?.heading ?? 'Talk to Naboo Automotive',
      lead: stored.contactPage?.lead ??
        'Questions about a vehicle, a quotation for workshop work, or anything else — send us a message.',
    },
    openingHoursText: (stored.openingHours ?? []).join('\n'),
  };
}

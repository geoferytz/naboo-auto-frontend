import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from './api';
import { BUSINESS } from './business';
import { SITE_CONTENT } from './queries';

export interface HeroCta {
  label: string;
  link: string;
  queryParams?: Record<string, string>;
}

export interface HeroBadge {
  icon: string;
  text: string;
}

export interface HeroCaption {
  title: string;
  specs: string[];
  link?: string;
}

export interface HeroSlide {
  image: string;
  alt: string;
  label: string;
  headline: string;
  /** Trailing part of the headline rendered in the red accent colour. */
  accent?: string;
  suffix?: string;
  description: string;
  primary: HeroCta;
  secondary: HeroCta;
  badges?: HeroBadge[];
  /** Optional vehicle card pinned to the bottom-right of the slide. */
  caption?: HeroCaption;
  /** 'split' anchors the image to the right half, fading into the dark text side. */
  layout?: 'full' | 'split';
}

export interface SitePillar {
  icon: string;
  image: string;
  imageAlt: string;
  title: string;
  text: string;
  /** Internal route; leave empty when the card is a WhatsApp link. */
  link?: string;
  /** Contact-form subject used as a query param on internal links. */
  subject?: string;
  /** Prefilled WhatsApp message; when set the card opens wa.me instead of routing. */
  waMessage?: string;
  cta: string;
}

export interface IconTextItem {
  icon: string;
  title: string;
  text: string;
}

export interface AdvantageContent {
  image?: string;
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  text?: string;
  tagline?: string;
  taglineAccent?: string;
  items: IconTextItem[];
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  /** Photo URL under assets/ or uploads/; empty falls back to an initials avatar. */
  photo?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export interface SiteContent {
  logoUrl?: string;
  location?: string;
  phone?: string;
  email?: string;
  /** WhatsApp number, international format digits only. */
  whatsapp?: string;
  /** Accent colour as a hex string, e.g. '#e52b36'. Overrides --naboo-red site-wide. */
  themeColor?: string;
  heroSlides?: HeroSlide[];
  pillars?: SitePillar[];
  advantage?: AdvantageContent;
  workSteps?: { title: string; text: string }[];
  teamMembers?: TeamMember[];
  /** Header copy on the Our Team page. */
  teamPage?: { eyebrow?: string; heading?: string; lead?: string };
  /** Header copy on the Our Workshop page. */
  workshopPage?: { eyebrow?: string; heading?: string; lead?: string };
  workshopItems?: WorkshopItem[];
  /** Header copy on the Contact page. */
  contactPage?: { eyebrow?: string; heading?: string; lead?: string };
  /** Opening hours lines shown on the contact page, one entry per line. */
  openingHours?: string[];
}

export type WorkshopItemKind = 'before-after' | 'progress' | 'completed';

export interface WorkshopItem {
  kind: WorkshopItemKind;
  title: string;
  caption: string;
  /** Single image for progress/completed items. */
  image?: string;
  /** Image pair for before-after items. */
  before?: string;
  after?: string;
}

export const TRUST_BADGES: HeroBadge[] = [
  { icon: 'verified', text: 'Quality Vehicles' },
  { icon: 'handyman', text: 'Professional Service' },
  { icon: 'check_circle', text: 'Trusted & Transparent' },
];

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: 'assets/images/automotive/hero-prado.jpeg',
    alt: 'A black Toyota Land Cruiser Prado parked on a hilltop at sunset',
    label: 'Premium cars for sale',
    headline: 'Drive Your',
    accent: 'Dream',
    suffix: 'Today',
    description:
      'Quality vehicles. Reliable service. At Naboo Automotive, we bring you the best cars at competitive prices.',
    primary: { label: 'Browse Our Cars', link: '/cars-for-sale' },
    secondary: { label: 'Contact Us', link: '/contact', queryParams: { subject: 'Vehicle enquiry' } },
    badges: TRUST_BADGES,
    caption: { title: 'Toyota Land Cruiser Prado TX-L', specs: ['2020', 'Diesel', 'Automatic'] },
    layout: 'split',
  },
  {
    image: 'assets/images/automotive/hero-rentals.jpeg',
    alt: 'A Toyota SUV driving along a scenic road at sunset',
    label: 'Drive your way',
    headline: 'The Right Car for',
    accent: ' Every Journey.',
    description:
      'Enjoy convenient vehicle rentals for business, travel, special occasions, and everyday mobility.',
    primary: { label: 'Explore rentals', link: '/rentals' },
    secondary: { label: 'Book a vehicle', link: '/rentals' },
    badges: TRUST_BADGES,
    caption: { title: 'Toyota Fortuner', specs: ['2022', 'Diesel', 'Automatic'] },
  },
  {
    image: 'assets/images/automotive/hero-workshop.jpeg',
    alt: 'A technician servicing a silver sports car in a modern workshop',
    label: 'Expert automotive care',
    headline: 'More Than',
    accent: ' Just a Drive.',
    description:
      'Professional repairs, servicing, restoration, customization, and vehicle care from one trusted automotive destination.',
    primary: { label: 'Our services', link: '/services' },
    secondary: { label: 'Book a service', link: '/contact', queryParams: { subject: 'Service booking' } },
    badges: TRUST_BADGES,
    caption: { title: 'Naboo Workshop', specs: ['Diagnostics', 'Repairs', 'Restoration'] },
  },
  {
    image: 'assets/images/automotive/hero-customization.jpeg',
    alt: 'A freshly detailed black luxury car with dramatic red lighting',
    label: 'Make it yours',
    headline: 'Your Vision.',
    accent: ' Your Vehicle.',
    description:
      'Personalize your vehicle with quality accessories, color changes, detailing, and restoration services.',
    primary: { label: 'Explore customization', link: '/services' },
    secondary: { label: 'Shop accessories', link: '/accessories' },
    badges: TRUST_BADGES,
    caption: { title: 'Custom & Detailing', specs: ['Accessories', 'Paint', 'Restoration'] },
  },
];

export const DEFAULT_PILLARS: SitePillar[] = [
  { icon: 'directions_car', image: 'assets/images/automotive/pillar-sales.jpeg', imageAlt: 'A row of vehicles for sale at the Naboo yard', title: 'Cars for sale', text: 'Inspected new and used vehicles with clear prices and specifications.', link: '/cars-for-sale', cta: 'Browse vehicles' },
  { icon: 'build', image: 'assets/images/automotive/pillar-repairs.jpeg', imageAlt: 'A technician working on a car engine', title: 'Repairs & maintenance', text: 'Servicing, diagnostics, brakes, suspension and electrical work.', link: '/services', cta: 'View services' },
  { icon: 'format_paint', image: 'assets/images/automotive/pillar-painting.jpeg', imageAlt: 'A freshly painted red car in the spray booth', title: 'Painting & restoration', text: 'Resprays, colour changes, bodywork and complete restorations.', link: '/services', cta: 'View services' },
  { icon: 'request_quote', image: 'assets/images/automotive/pillar-quote.jpeg', imageAlt: 'An itemised quotation sheet', title: 'Request a quotation', text: 'Tell us about your vehicle and the work you need — we will reply with a quote.', link: '/contact', subject: 'Quotation request', cta: 'Get a quote' },
  { icon: 'forum', image: 'assets/images/automotive/hero-cars.jpeg', imageAlt: 'A premium sedan under showroom lighting', title: 'Expert Consultation', text: 'Get personalized advice from our automotive experts. We help you make informed decisions about buying, and selling your vehicle.', waMessage: 'Hi Naboo Automotive — I would like expert advice about a vehicle.', cta: 'Chat with an expert' },
  { icon: 'fact_check', image: 'assets/images/automotive/hero-workshop.jpeg', imageAlt: 'A vehicle being inspected in the Naboo workshop', title: 'Quality Assurance', text: 'Rest easy knowing that every car we offer undergoes rigorous quality checks. We stand behind the reliability and safety of our vehicles.', waMessage: 'Hi Naboo Automotive — I have a question about vehicle quality checks.', cta: 'Ask about our checks' },
];

export const DEFAULT_ADVANTAGE: AdvantageContent = {
  image: 'assets/images/automotive/advantage-landcruiser.png',
  eyebrow: 'Why choose Naboo',
  heading: 'The Naboo',
  headingAccent: 'Advantage.',
  text: "We are committed to making your car buying journey simple, transparent and enjoyable. From finding your perfect vehicle to keeping it in excellent condition, we're here for you every step of the way.",
  tagline: 'Your journey.',
  taglineAccent: 'Our commitment.',
  items: [
    { icon: 'verified_user', title: 'Quality Assured', text: 'Every vehicle is carefully inspected and verified to help you drive with confidence.' },
    { icon: 'sell', title: 'Best Value', text: 'Competitive prices, transparent deals, and exceptional value for your investment.' },
    { icon: 'support_agent', title: 'Expert Support', text: 'Our automotive team is ready to guide you through every step of your journey.' },
    { icon: 'directions_car', title: 'Flexible Solutions', text: 'Explore trade-ins, financing options, rentals, and personalized automotive solutions.' },
  ],
};

export const DEFAULT_WORK_STEPS: { title: string; text: string }[] = [
  { title: 'Clear pricing.', text: 'Fixed prices where the scope is fixed; otherwise an estimate or itemised quotation.' },
  { title: 'Your approval first.', text: 'Additional work is never added without your consent.' },
  { title: 'Accurate listings.', text: 'Sold and reserved vehicles are clearly marked.' },
  { title: 'A reference for everything.', text: 'Every enquiry receives a reference number you can quote.' },
];

export const DEFAULT_TEAM: TeamMember[] = [
  {
    name: 'Team Member 1',
    role: 'Founder & Managing Director',
    bio: 'Leads Naboo Automotive with a focus on quality vehicles, transparent pricing and dependable workshop service.',
  },
  {
    name: 'Team Member 2',
    role: 'Workshop Manager',
    bio: 'Runs the workshop floor — scheduling, quality checks and turnaround on repairs, painting and restorations.',
  },
  {
    name: 'Team Member 3',
    role: 'Senior Mechanic',
    bio: 'Diagnostics, engine work, brakes and suspension across all makes we service.',
  },
  {
    name: 'Team Member 4',
    role: 'Sales & Customer Care',
    bio: 'Helps customers find the right vehicle, handles enquiries, quotations and after-sales follow-up.',
  },
];

const IMG = 'assets/images/automotive/';

export const DEFAULT_WORKSHOP_ITEMS: WorkshopItem[] = [
  {
    kind: 'before-after',
    title: 'Full respray & panel work',
    caption: 'Body repairs, prep and a fresh coat in our paint booth.',
    before: IMG + 'hero-workshop.jpeg',
    after: IMG + 'pillar-painting.jpeg',
  },
  {
    kind: 'progress',
    title: 'Engine diagnostics & service',
    caption: 'Routine service and diagnostic checks underway on the workshop floor.',
    image: IMG + 'pillar-repairs.jpeg',
  },
  {
    kind: 'completed',
    title: 'Interior & exterior detail',
    caption: 'Full detail — wash, polish and interior refresh, ready for collection.',
    image: IMG + 'hero-cars.jpeg',
  },
  {
    kind: 'before-after',
    title: 'Paint & restoration',
    caption: 'Colour restoration and refinishing on a customer restoration project.',
    before: IMG + 'pillar-repairs.jpeg',
    after: IMG + 'hero-customization.jpeg',
  },
  {
    kind: 'progress',
    title: 'Accessories & customization',
    caption: 'Fitment of accessories and customization work in progress.',
    image: IMG + 'hero-customization.jpeg',
  },
  {
    kind: 'completed',
    title: 'Workshop-ready handover',
    caption: 'Inspected, serviced and cleaned — another vehicle back on the road.',
    image: IMG + 'hero-prado.jpeg',
  },
];

const DEFAULTS: SiteContent = {
  heroSlides: DEFAULT_HERO_SLIDES,
  pillars: DEFAULT_PILLARS,
  advantage: DEFAULT_ADVANTAGE,
  workSteps: DEFAULT_WORK_STEPS,
  teamMembers: DEFAULT_TEAM,
  teamPage: {
    eyebrow: 'Our team',
    heading: 'The people behind Naboo Automotive',
    lead: 'From the showroom floor to the workshop bench — meet the team that keeps our customers moving. Reach any of us directly, or send a general enquiry.',
  },
  workshopPage: {
    eyebrow: 'Our workshop',
    heading: 'See the work we do',
    lead: 'Repairs, painting, restoration and detailing — a look inside our workshop, from work in progress to finished results.',
  },
  workshopItems: DEFAULT_WORKSHOP_ITEMS,
  contactPage: {
    eyebrow: 'Contact',
    heading: 'Talk to Naboo Automotive',
    lead: 'Questions about a vehicle, a quotation for workshop work, or anything else — send us a message.',
  },
};

/**
 * Loads the admin-managed site-content document once and merges it over the
 * built-in defaults. Also patches BUSINESS so every existing contact link
 * picks up the configured phone, email, location and WhatsApp number.
 */
@Injectable({ providedIn: 'root' })
export class SiteContentStore {
  private readonly api = inject(Api);
  private readonly doc = signal<SiteContent>({});
  private started = false;

  /** Content merged over defaults — always safe to render. */
  readonly content = computed<SiteContent>(() => ({ ...DEFAULTS, ...this.doc() }));

  /** Starts the one-time load; call from any component rendering managed content. */
  load(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.api.query<{ siteContent: string | null }>(SITE_CONTENT).subscribe({
      next: (d) => this.apply(d.siteContent),
      error: () => undefined,
    });
  }

  /** Re-reads after an admin save. */
  refresh(): void {
    this.api.query<{ siteContent: string | null }>(SITE_CONTENT).subscribe({
      next: (d) => this.apply(d.siteContent),
      error: () => undefined,
    });
  }

  private apply(raw: string | null): void {
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SiteContent;
      this.doc.set(parsed && typeof parsed === 'object' ? parsed : {});
      if (parsed.logoUrl !== undefined) BUSINESS.logoUrl = parsed.logoUrl || null;
      if (parsed.phone !== undefined) BUSINESS.phone = parsed.phone || null;
      if (parsed.whatsapp !== undefined) BUSINESS.whatsapp = parsed.whatsapp || null;
      if (parsed.email !== undefined) BUSINESS.email = parsed.email || null;
      if (parsed.location !== undefined) BUSINESS.address = parsed.location || null;
      if (parsed.openingHours !== undefined) BUSINESS.openingHours = parsed.openingHours?.length ? parsed.openingHours : null;
      applyThemeColor(parsed.themeColor);
    } catch {
      // Malformed stored document — keep the built-in defaults.
    }
  }
}

/** Overrides the accent colour site-wide; null/invalid restores the stylesheet default. */
export function applyThemeColor(hex: string | null | undefined): void {
  if (typeof document === 'undefined') {
    return;
  }
  const style = document.documentElement.style;
  const clean = (hex ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(clean)) {
    style.setProperty('--naboo-red', clean);
    style.setProperty('--naboo-red-dark', darkenHex(clean, 0.78));
  } else {
    style.removeProperty('--naboo-red');
    style.removeProperty('--naboo-red-dark');
  }
}

function darkenHex(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

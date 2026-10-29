import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { routes } from '../../app.routes';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Services } from '../../pages/services/services';
import { Header } from './header';

const categories = [
  { id: 'repairs', slug: 'repairs-maintenance', name: 'Repairs & Maintenance', description: null },
  { id: 'painting', slug: 'painting-restoration', name: 'Painting & Restoration', description: null },
  { id: 'detailing', slug: 'detailing', name: 'Detailing', description: null },
];
const catalogue = {
  serviceCategories: categories,
  services: categories.map((category, i) => ({
    id: category.id, slug: `service-${i}`, name: `Service for ${category.name}`, summary: 'Service summary',
    category, priceType: 'QUOTE_REQUIRED', price: null, durationMinutes: null,
  })),
};

describe('Header navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: AuthService, useValue: { user: signal(null), isAuthenticated: signal(false) } },
        { provide: Api, useValue: { query: () => of(catalogue) } },
      ],
    });
  });

  it('opens Cars on click and navigates to the exchange page', async () => {
    const outlet = await RouterTestingHarness.create();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness.with({ triggerText: /^Cars/ }));
    expect(await menu.isOpen()).toBe(false);
    await menu.open();
    const items = await menu.getItems();
    expect(await Promise.all(items.map(async (item) => (await item.host()).text({ exclude: 'mat-icon' }))))
      .toEqual(['Cars for Sale', 'Cars for Rental', 'Car Exchange']);
    expect(await Promise.all(items.map(async (item) => (await item.host()).getAttribute('href'))))
      .toEqual(['/cars-for-sale', '/rentals', '/car-exchange']);
    await menu.clickItem({ text: /Car Exchange$/ });
    await fixture.whenStable();
    outlet.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/car-exchange');
    expect(outlet.routeNativeElement?.querySelector('h1')?.textContent).toBe('Car Exchange');
    expect(await menu.isOpen()).toBe(false);
  });

  it('supports service navigation from the mobile menu and closes it after selection', async () => {
    const outlet = await RouterTestingHarness.create();
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.menu-toggle').click();
    fixture.detectChanges();
    const loader = await TestbedHarnessEnvironment.loader(fixture).getChildLoader('.mobile');
    const menu = await loader.getHarness(MatMenuHarness.with({ triggerText: /^Services/ }));
    await menu.open();
    const items = await menu.getItems();
    expect(await Promise.all(items.map(async (item) => (await item.host()).text({ exclude: 'mat-icon' }))))
      .toEqual(['Repairs & Maintenance', 'Painting & Restoration', 'Detailing']);
    await menu.clickItem({ text: /Detailing$/ });
    await fixture.whenStable();
    outlet.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/services/detailing');
    expect(fixture.nativeElement.querySelector('.mobile')).toBeNull();
    expect(outlet.routeNativeElement?.querySelector('h1')?.textContent).toBe('Detailing');
  });

  it('shows only the selected category and resets when returning to all services', async () => {
    const outlet = await RouterTestingHarness.create();
    for (const category of categories) {
      await outlet.navigateByUrl(`/services/${category.slug}`, Services);
      await outlet.fixture.whenStable();
      outlet.detectChanges();
      const page = outlet.routeNativeElement!;
      expect(page.querySelector('h1')?.textContent).toBe(category.name);
      expect([...page.querySelectorAll('.service h3')].map((heading) => heading.textContent?.trim()))
        .toEqual([`Service for ${category.name}`]);
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
        .toBe(`https://naboo.co.tz/services/${category.slug}`);
    }
    await outlet.navigateByUrl('/services', Services);
    await outlet.fixture.whenStable();
    outlet.detectChanges();
    expect(outlet.routeNativeElement?.querySelectorAll('.service').length).toBe(3);
  });

  it('closes the dropdown with Escape and restores focus to its trigger', async () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness.with({ triggerText: /^Cars/ }));
    await menu.open();
    const panel = document.querySelector('[role="menu"]')!;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await fixture.whenStable();
    expect(await menu.isOpen()).toBe(false);
    expect(document.activeElement?.textContent).toContain('Cars');
  });
});

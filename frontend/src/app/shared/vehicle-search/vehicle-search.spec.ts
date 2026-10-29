import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { routes } from '../../app.routes';
import { Api } from '../../core/api';
import { catalogueFilter } from '../../core/catalogue-search';
import { RENTAL_SEARCH_OPTIONS, RENTAL_VEHICLES, VEHICLE_MAKES, VEHICLE_SEARCH_OPTIONS, VEHICLES } from '../../core/queries';
import { VehicleSearch } from './vehicle-search';

describe('Vehicle search', () => {
  const saleOptions = [
    { make: 'Toyota', model: 'Prado', year: 2020 },
    { make: 'Toyota', model: 'Vitz', year: 2019 },
    { make: 'Nissan', model: 'X-Trail', year: 2021 },
  ];
  const rentalOptions = [{ make: 'Toyota', model: 'Fortuner', year: 2022 }];
  const query = vi.fn((document: unknown) => {
    if (document === VEHICLE_SEARCH_OPTIONS) return of({ vehicleSearchOptions: saleOptions });
    if (document === RENTAL_SEARCH_OPTIONS) return of({ rentalSearchOptions: rentalOptions });
    if (document === VEHICLE_MAKES) return of({ vehicleMakes: ['Toyota', 'Nissan'] });
    const page = { items: [], totalCount: 0, page: 0, totalPages: 0, size: 24 };
    return of(document === VEHICLES ? { vehicles: page } : { rentalVehicles: page });
  });

  beforeEach(() => {
    query.mockClear();
    vi.stubGlobal('matchMedia', () => ({
      matches: false, addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
    }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: Api, useValue: { query } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const outlet = await RouterTestingHarness.create();
    const fixture = TestBed.createComponent(VehicleSearch);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const select = async (name: string, value: string) => {
      const element = fixture.nativeElement.querySelector(`select[formControlName="${name}"]`) as HTMLSelectElement;
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, select, outlet };
  }

  it('submits make, model, exact year and price range to the sales catalogue', async () => {
    const { fixture, select } = await setup();
    await select('make', 'Toyota');
    await select('model', 'Prado');
    await select('year', '2020');
    await select('budget', '20000000:50000000');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('/cars-for-sale?');
    expect(query).toHaveBeenCalledWith(VEHICLES, expect.objectContaining({
      filter: expect.objectContaining({ make: 'Toyota', model: 'Prado', minYear: 2020, maxYear: 2020,
        minPrice: '20000000', maxPrice: '50000000' }),
      page: 0,
    }));
  });

  it('resets dependent selections and uses daily rate filters for rentals', async () => {
    const { fixture, select, outlet } = await setup();
    await select('make', 'Toyota');
    await select('model', 'Prado');
    await select('make', 'Nissan');
    expect(fixture.nativeElement.querySelector('[formControlName="model"]').value).toBe('');
    await select('budget', '20000000:50000000');
    fixture.nativeElement.querySelectorAll('.purpose button')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="budget"]').value).toBe('');
    await select('make', 'Toyota');
    await select('model', 'Fortuner');
    await select('year', '2022');
    await select('budget', '100000:250000');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    outlet.detectChanges();
    expect(TestBed.inject(Router).url).toContain('/rentals?');
    expect(query).toHaveBeenCalledWith(RENTAL_VEHICLES, expect.objectContaining({
      filter: { make: 'Toyota', model: 'Fortuner', minYear: 2022, maxYear: 2022, minPrice: '100000', maxPrice: '250000' },
    }));
    expect(outlet.routeNativeElement?.textContent).toContain('No rental vehicles match your search');
    await TestBed.inject(Router).navigate(['/rentals'], { queryParams: { make: 'Toyota', page: 2 } });
    await fixture.whenStable();
    expect(query).toHaveBeenCalledWith(RENTAL_VEHICLES, expect.objectContaining({ page: 1, filter: expect.objectContaining({ make: 'Toyota' }) }));
  });

  it('preserves decimal price strings and rejects malformed URL filters', () => {
    expect(catalogueFilter(convertToParamMap({ minPrice: '150000.25', maxPrice: '999999999999.99', minYear: '2021' })))
      .toMatchObject({ minPrice: '150000.25', maxPrice: '999999999999.99', minYear: 2021 });
    expect(catalogueFilter(convertToParamMap({ minPrice: '-1', maxPrice: 'Infinity', minYear: 'abc' })))
      .toMatchObject({ minPrice: null, maxPrice: null, minYear: null });
  });
});

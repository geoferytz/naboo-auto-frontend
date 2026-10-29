import { ParamMap } from '@angular/router';
import { RentalFilter } from './models';

/** Shared URL filters. Prices remain decimal strings from the URL through GraphQL. */
export function catalogueFilter(params: ParamMap): RentalFilter {
  const year = (key: string) => {
    const raw = params.get(key);
    return raw && /^\d{4}$/.test(raw) && Number(raw) >= 1950 && Number(raw) <= 2100 ? Number(raw) : null;
  };
  const price = (key: string) => {
    const raw = params.get(key)?.trim();
    return raw && /^\d{1,12}(?:\.\d{1,2})?$/.test(raw) ? raw : null;
  };
  return {
    make: params.get('make')?.trim() || null,
    model: params.get('model')?.trim() || null,
    minYear: year('minYear'),
    maxYear: year('maxYear'),
    minPrice: price('minPrice'),
    maxPrice: price('maxPrice'),
  };
}

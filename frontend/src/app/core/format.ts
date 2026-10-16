import { BodyType, FuelType, Money, PriceType, ServiceItem, Transmission, VehicleCondition, VehicleStatus } from './models';

const numberFormat = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

/** Formats a decimal-string amount without converting through floating point for display grouping. */
export function formatMoney(money: Money | null | undefined): string {
  if (!money) {
    return '';
  }
  const [whole, fraction] = money.amount.split('.');
  const grouped = numberFormat.format(BigInt(whole));
  const cents = fraction && /[1-9]/.test(fraction) ? `.${fraction}` : '';
  return `${money.currency} ${grouped}${cents}`;
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : numberFormat.format(value);
}

export const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  HYBRID: 'Hybrid',
  ELECTRIC: 'Electric',
  LPG: 'LPG',
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = { MANUAL: 'Manual', AUTOMATIC: 'Automatic' };

export const BODY_LABELS: Record<BodyType, string> = {
  SEDAN: 'Sedan',
  HATCHBACK: 'Hatchback',
  SUV: 'SUV',
  PICKUP: 'Pickup',
  VAN: 'Van',
  COUPE: 'Coupe',
  WAGON: 'Wagon',
  OTHER: 'Other',
};

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  NEW: 'New',
  FOREIGN_USED: 'Foreign used',
  LOCALLY_USED: 'Locally used',
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  UNAVAILABLE: 'Unavailable',
};

export function options<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

/** Customer-facing price wording that distinguishes fixed prices from estimates and quotes. */
export function servicePrice(s: Pick<ServiceItem, 'priceType' | 'price'>): string {
  const amount = formatMoney(s.price);
  const labels: Record<PriceType, string> = {
    FIXED: amount,
    STARTING_FROM: `From ${amount}`,
    HOURLY: `${amount} per hour`,
    INSPECTION_REQUIRED: 'Price after inspection',
    QUOTE_REQUIRED: 'Quotation required',
  };
  return labels[s.priceType];
}

export function servicePriceNote(priceType: PriceType): string {
  switch (priceType) {
    case 'FIXED':
      return 'Fixed price for the described scope of work.';
    case 'STARTING_FROM':
      return 'Starting price. The final cost depends on your vehicle and parts required, and is confirmed before work begins.';
    case 'HOURLY':
      return 'Labour is charged per hour. Parts are quoted separately and approved by you first.';
    case 'INSPECTION_REQUIRED':
      return 'We inspect your vehicle first and provide an itemised quotation for approval.';
    case 'QUOTE_REQUIRED':
      return 'This work is priced individually. Request a quotation and we will contact you.';
  }
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) {
    return null;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

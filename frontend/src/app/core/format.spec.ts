import { formatDuration, formatMoney, servicePrice } from './format';

describe('formatMoney', () => {
  it('groups whole shillings without floating point', () => {
    expect(formatMoney({ amount: '98000000.00', currency: 'TZS' })).toBe('TZS 98,000,000');
  });

  it('keeps non-zero cents and handles amounts beyond Number precision', () => {
    expect(formatMoney({ amount: '45000000.50', currency: 'TZS' })).toBe('TZS 45,000,000.50');
    expect(formatMoney({ amount: '900719925474099312.00', currency: 'TZS' })).toBe('TZS 900,719,925,474,099,312');
  });

  it('returns empty string for missing money', () => {
    expect(formatMoney(null)).toBe('');
  });
});

describe('servicePrice', () => {
  it('distinguishes fixed, estimated and quoted prices', () => {
    const price = { amount: '50000.00', currency: 'TZS' };
    expect(servicePrice({ priceType: 'FIXED', price })).toBe('TZS 50,000');
    expect(servicePrice({ priceType: 'STARTING_FROM', price })).toBe('From TZS 50,000');
    expect(servicePrice({ priceType: 'HOURLY', price })).toBe('TZS 50,000 per hour');
    expect(servicePrice({ priceType: 'QUOTE_REQUIRED', price: null })).toBe('Quotation required');
    expect(servicePrice({ priceType: 'INSPECTION_REQUIRED', price: null })).toBe('Price after inspection');
  });
});

describe('formatDuration', () => {
  it('formats minutes', () => {
    expect(formatDuration(180)).toBe('3 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(null)).toBeNull();
  });
});

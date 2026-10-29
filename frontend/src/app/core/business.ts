/**
 * Public business contact details.
 *
 * IMPORTANT: Values must be confirmed by Naboo Automotive before launch. Anything left as null is
 * simply not rendered, so the site never shows invented contact information. These will move to
 * backend-managed site settings in the administration milestone.
 */
export const BUSINESS = {
  name: 'Naboo Automotive',
  logoUrl: null as string | null,
  phone: '+255 684 455 740' as string | null,
  whatsapp: '255684455740' as string | null, // international format digits only
  email: 'info@naboo.co.tz' as string | null,
  address: 'Makao mapya, Dodoma, Tanzania' as string | null,
  openingHours: null as string[] | null, // e.g. ['Mon–Fri 08:00–18:00', 'Sat 09:00–14:00']
  mapUrl: null as string | null,
  socials: null as { facebook?: string; instagram?: string; x?: string; linkedin?: string } | null,
};

/** wa.me deep link with a prefilled message, or null when WhatsApp is not configured. */
export function whatsappLink(message: string): string | null {
  return BUSINESS.whatsapp ? `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}` : null;
}

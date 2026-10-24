-- DEVELOPMENT / DEMONSTRATION DATA ONLY.
-- Loaded exclusively by the "dev" Spring profile (classpath:db/seed-dev).
-- Prices, vehicles and services below are illustrative and must not be used in production.
-- Idempotent: safe to re-run whenever this file changes.

INSERT INTO service_categories (slug, name, description, sort_order) VALUES
    ('repairs-maintenance', 'Repairs & Maintenance', 'Routine servicing, diagnostics and mechanical repairs.', 10),
    ('painting-restoration', 'Painting & Restoration', 'Resprays, colour changes, bodywork and full restorations.', 20),
    ('detailing', 'Detailing', 'Interior and exterior detailing and paint protection.', 30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, slug, name, summary, description, price_type, price_amount, duration_minutes, sort_order)
SELECT c.id, s.slug, s.name, s.summary, s.description, s.price_type, s.price_amount, s.duration_minutes, s.sort_order
FROM (VALUES
    ('repairs-maintenance', 'general-service', 'General Service', 'Oil, filters, fluid top-ups and a multi-point inspection.',
        'A complete routine service including engine oil and filter replacement, air filter check, fluid top-ups and a written multi-point inspection report. Parts are charged according to your vehicle.',
        'STARTING_FROM', 180000.00, 180, 10),
    ('repairs-maintenance', 'oil-change', 'Oil & Filter Change', 'Engine oil and oil filter replacement.',
        'Engine oil drained and replaced with the grade specified for your vehicle, plus a new oil filter.',
        'STARTING_FROM', 95000.00, 60, 20),
    ('repairs-maintenance', 'diagnostics', 'Computer Diagnostics', 'Electronic fault scan with a written report.',
        'Full OBD scan of engine, transmission, ABS and airbag systems. Includes a written summary of fault codes and recommended next steps.',
        'FIXED', 50000.00, 60, 30),
    ('repairs-maintenance', 'brakes', 'Brake Service', 'Pads, discs, fluid and brake system inspection.',
        'Inspection of pads, discs, calipers and lines, with replacement where required. A quotation is provided before any parts are fitted.',
        'INSPECTION_REQUIRED', NULL, 120, 40),
    ('repairs-maintenance', 'suspension', 'Suspension Repair', 'Shocks, bushes, ball joints and alignment.',
        'Diagnosis and repair of suspension components. Labour is charged hourly; parts are quoted separately.',
        'HOURLY', 40000.00, NULL, 50),
    ('painting-restoration', 'full-respray', 'Full Respray & Colour Change', 'Complete repaint in the original or a new colour.',
        'Panel preparation, primer, base coat and clear coat. Requires an inspection to quote accurately.',
        'QUOTE_REQUIRED', NULL, NULL, 10),
    ('painting-restoration', 'restoration', 'Vehicle Restoration', 'Mechanical and cosmetic restoration projects.',
        'Bespoke restoration projects scoped after an inspection, with itemised quotations and progress updates.',
        'INSPECTION_REQUIRED', NULL, NULL, 20),
    ('detailing', 'full-detail', 'Full Detail', 'Deep interior clean and exterior polish.',
        'Interior vacuum and shampoo, leather care, exterior wash, clay bar and machine polish.',
        'FIXED', 150000.00, 240, 10)
) AS s(category_slug, slug, name, summary, description, price_type, price_amount, duration_minutes, sort_order)
JOIN service_categories c ON c.slug = s.category_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO vehicles (slug, make, model, variant, model_year, mileage_km, fuel_type, transmission, body_type, color,
                      vehicle_condition, engine_capacity_cc, engine_code, location, description, price_amount, status, published, published_at)
VALUES
    ('demo-toyota-land-cruiser-prado-2018', 'Toyota', 'Land Cruiser Prado', 'TX-L', 2018, 86000, 'DIESEL', 'AUTOMATIC', 'SUV', 'Pearl White',
        'FOREIGN_USED', 2800, '1KD-FTV', 'Main yard, Dar es Salaam', 'Demonstration listing for development only.', 98000000.00, 'AVAILABLE', TRUE, now()),
    ('demo-toyota-rav4-2017', 'Toyota', 'RAV4', 'G', 2017, 74000, 'PETROL', 'AUTOMATIC', 'SUV', 'Silver',
        'FOREIGN_USED', 2000, '3ZR-FAE', 'Main yard, Dar es Salaam', 'Demonstration listing for development only.', 52000000.00, 'AVAILABLE', TRUE, now()),
    ('demo-nissan-x-trail-2016', 'Nissan', 'X-Trail', '20X', 2016, 92000, 'PETROL', 'AUTOMATIC', 'SUV', 'Black',
        'FOREIGN_USED', 2000, 'MR20DE', 'Main yard, Dar es Salaam', 'Demonstration listing for development only.', 38500000.00, 'RESERVED', TRUE, now()),
    ('demo-toyota-hilux-2019', 'Toyota', 'Hilux', 'Double Cab', 2019, 61000, 'DIESEL', 'MANUAL', 'PICKUP', 'Grey',
        'LOCALLY_USED', 2400, '2GD-FTV', 'Dodoma branch', 'Demonstration listing for development only.', 75000000.00, 'AVAILABLE', TRUE, now()),
    ('demo-subaru-forester-2015', 'Subaru', 'Forester', '2.0i', 2015, 110000, 'PETROL', 'AUTOMATIC', 'SUV', 'Blue',
        'FOREIGN_USED', 2000, 'FB20', 'Main yard, Dar es Salaam', 'Demonstration listing for development only.', 29000000.00, 'SOLD', TRUE, now()),
    ('demo-mazda-cx5-2018-draft', 'Mazda', 'CX-5', 'XD', 2018, 70000, 'DIESEL', 'AUTOMATIC', 'SUV', 'Red',
        'FOREIGN_USED', 2200, 'SH-VPTR', 'Main yard, Dar es Salaam', 'Unpublished demonstration listing for development only.', 45000000.00, 'AVAILABLE', FALSE, NULL)
ON CONFLICT (slug) DO UPDATE SET engine_code = EXCLUDED.engine_code, location = EXCLUDED.location;

INSERT INTO vehicle_features (vehicle_id, sort_order, feature)
SELECT v.id, f.ord, f.feature
FROM vehicles v
CROSS JOIN LATERAL (VALUES (0, 'Air conditioning'), (1, 'Reverse camera'), (2, 'Bluetooth audio'), (3, 'Alloy wheels')) AS f(ord, feature)
WHERE v.slug LIKE 'demo-%'
ON CONFLICT DO NOTHING;

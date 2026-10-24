-- Vehicle detail fields: engine code (e.g. 1KD-FTV) and yard/showroom location.
ALTER TABLE vehicles
    ADD COLUMN engine_code VARCHAR(30),
    ADD COLUMN location VARCHAR(80);

ALTER TABLE rental_vehicles
    ADD COLUMN location VARCHAR(80);

package com.naboo.automotive.rentals;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RentalVehicleRepository extends JpaRepository<RentalVehicle, UUID>, JpaSpecificationExecutor<RentalVehicle> {

    Optional<RentalVehicle> findBySlug(String slug);

    boolean existsBySlug(String slug);
}

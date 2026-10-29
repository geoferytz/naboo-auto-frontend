package com.naboo.automotive.rentals;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import com.naboo.automotive.common.VehicleSearchOption;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;

public interface RentalVehicleRepository extends JpaRepository<RentalVehicle, UUID>, JpaSpecificationExecutor<RentalVehicle> {

    Optional<RentalVehicle> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("""
            select distinct new com.naboo.automotive.common.VehicleSearchOption(v.make, v.model, v.modelYear)
            from RentalVehicle v where v.published = true and v.status = :status
            order by v.make, v.model, v.modelYear desc
            """)
    List<VehicleSearchOption> findSearchOptions(RentalVehicleStatus status);
}

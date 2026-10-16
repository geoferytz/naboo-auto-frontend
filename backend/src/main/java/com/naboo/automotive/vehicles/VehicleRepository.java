package com.naboo.automotive.vehicles;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID>, JpaSpecificationExecutor<Vehicle> {

    Optional<Vehicle> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByStatus(VehicleStatus status);

    long countByPublishedFalse();

    @Query("select distinct v.make from Vehicle v where v.published = true and v.status <> :excluded order by v.make")
    List<String> findPublicMakes(VehicleStatus excluded);
}

package com.naboo.automotive.vehicles;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleStatusHistoryRepository extends JpaRepository<VehicleStatusHistory, UUID> {

    List<VehicleStatusHistory> findByVehicleIdOrderByChangedAtDesc(UUID vehicleId);
}

package com.naboo.automotive.vehicles;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;

public interface VehicleEnquiryRepository extends JpaRepository<VehicleEnquiry, UUID> {

    @EntityGraph(attributePaths = "vehicle")
    Page<VehicleEnquiry> findByStatus(EnquiryStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "vehicle")
    Page<VehicleEnquiry> findAllBy(Pageable pageable);
}

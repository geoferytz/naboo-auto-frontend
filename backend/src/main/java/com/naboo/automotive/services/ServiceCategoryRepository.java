package com.naboo.automotive.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {

    Optional<ServiceCategory> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<ServiceCategory> findAllByOrderBySortOrderAscNameAsc();
}

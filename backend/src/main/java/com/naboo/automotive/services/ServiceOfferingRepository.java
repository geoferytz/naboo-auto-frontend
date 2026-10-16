package com.naboo.automotive.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, UUID> {

    @EntityGraph(attributePaths = "category")
    Optional<ServiceOffering> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @EntityGraph(attributePaths = "category")
    @Query("""
            select s from ServiceOffering s
            where s.active = true and (:categorySlug is null or s.category.slug = :categorySlug)
            order by s.category.sortOrder, s.sortOrder, s.name""")
    List<ServiceOffering> findActive(String categorySlug);

    @EntityGraph(attributePaths = "category")
    @Query("select s from ServiceOffering s order by s.category.sortOrder, s.sortOrder, s.name")
    List<ServiceOffering> findAllOrdered();
}

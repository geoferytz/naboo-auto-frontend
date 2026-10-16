package com.naboo.automotive.workshop;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.naboo.automotive.workshop.WorkshopJob.JobStatus;

public interface WorkshopJobRepository extends JpaRepository<WorkshopJob, UUID>, JpaSpecificationExecutor<WorkshopJob> {

    Page<WorkshopJob> findByStatus(JobStatus status, Pageable pageable);

    Page<WorkshopJob> findByAssignedToUserId(UUID userId, Pageable pageable);
}

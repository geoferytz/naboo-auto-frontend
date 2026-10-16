package com.naboo.automotive.workshop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Single-row configuration (id = 1): how many jobs the workshop can run at the same time. */
@Entity
@Table(name = "workshop_capacity")
public class WorkshopCapacity {

    @Id
    private short id;

    @Column(name = "max_concurrent_jobs", nullable = false)
    private int maxConcurrentJobs;

    protected WorkshopCapacity() {
    }

    public int getMaxConcurrentJobs() {
        return maxConcurrentJobs;
    }

    public void setMaxConcurrentJobs(int maxConcurrentJobs) {
        this.maxConcurrentJobs = maxConcurrentJobs;
    }
}

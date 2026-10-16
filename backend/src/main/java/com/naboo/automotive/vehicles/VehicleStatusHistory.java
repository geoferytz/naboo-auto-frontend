package com.naboo.automotive.vehicles;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vehicle_status_history")
public class VehicleStatusHistory {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private VehicleStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private VehicleStatus toStatus;

    @Column(name = "changed_by_user_id")
    private UUID changedByUserId;

    @CreationTimestamp
    @Column(name = "changed_at", updatable = false)
    private Instant changedAt;

    protected VehicleStatusHistory() {
    }

    public VehicleStatusHistory(UUID vehicleId, VehicleStatus fromStatus, VehicleStatus toStatus, UUID changedByUserId) {
        this.vehicleId = vehicleId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedByUserId = changedByUserId;
    }

    public VehicleStatus getFromStatus() {
        return fromStatus;
    }

    public VehicleStatus getToStatus() {
        return toStatus;
    }

    public Instant getChangedAt() {
        return changedAt;
    }
}

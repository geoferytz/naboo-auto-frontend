package com.naboo.automotive.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface AccessoryRepository extends JpaRepository<Accessory, UUID>, JpaSpecificationExecutor<Accessory> {

    boolean existsBySku(String sku);

    /** Locks accessory rows (in id order to avoid deadlocks) while stock is checked and moved. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Accessory a where a.id in :ids order by a.id")
    List<Accessory> findAllForUpdate(@Param("ids") List<UUID> ids);
}

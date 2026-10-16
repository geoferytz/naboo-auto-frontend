package com.naboo.automotive.users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("select count(u) > 0 from User u join u.roles r where r = :role")
    boolean existsByRole(Role role);

    @Query("select count(distinct u) from User u join u.roles r where r = :role and u.enabled = true")
    long countEnabledWithRole(Role role);

    @Query("""
            select distinct u from User u join u.roles r
            where r <> :excluded and (u.enabled = true or :includeDisabled = true)
            order by u.fullName""")
    List<User> findStaff(Role excluded, boolean includeDisabled);

    @Query("""
            select u from User u
            where (:search = '' or lower(u.email) like :search or lower(u.fullName) like :search)""")
    Page<User> search(String search, Pageable pageable);
}

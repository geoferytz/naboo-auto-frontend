package com.naboo.automotive.contact;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactEnquiryRepository extends JpaRepository<ContactEnquiry, UUID> {

    Page<ContactEnquiry> findByStatus(ContactEnquiry.Status status, Pageable pageable);
}

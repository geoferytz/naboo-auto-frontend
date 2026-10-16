package com.naboo.automotive.reports;

import java.util.List;

import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.contact.ContactEnquiry;
import com.naboo.automotive.contact.ContactEnquiryRepository;
import com.naboo.automotive.vehicles.VehicleEnquiryRepository;
import com.naboo.automotive.vehicles.VehicleRepository;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

@Controller
public class DashboardController {

    public record DashboardSummary(long newSalesEnquiries, long openSalesEnquiries, long newContactEnquiries,
            long vehiclesAvailable, long vehiclesReserved, long vehiclesSold, long vehiclesUnpublished) {
    }

    private final VehicleRepository vehicles;
    private final VehicleEnquiryRepository enquiries;
    private final ContactEnquiryRepository contacts;

    public DashboardController(VehicleRepository vehicles, VehicleEnquiryRepository enquiries, ContactEnquiryRepository contacts) {
        this.vehicles = vehicles;
        this.enquiries = enquiries;
        this.contacts = contacts;
    }

    @QueryMapping
    @PreAuthorize(Permissions.STAFF)
    @Transactional(readOnly = true)
    public DashboardSummary adminDashboard() {
        return new DashboardSummary(
                enquiries.countByStatus(EnquiryStatus.NEW),
                enquiries.countByStatusIn(List.of(EnquiryStatus.NEW, EnquiryStatus.CONTACTED, EnquiryStatus.VIEWING_SCHEDULED)),
                contacts.countByStatus(ContactEnquiry.Status.NEW),
                vehicles.countByStatus(VehicleStatus.AVAILABLE),
                vehicles.countByStatus(VehicleStatus.RESERVED),
                vehicles.countByStatus(VehicleStatus.SOLD),
                vehicles.countByPublishedFalse());
    }
}

package com.naboo.automotive.reports;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.billing.Invoice.InvoiceStatus;
import com.naboo.automotive.billing.InvoiceRepository;
import com.naboo.automotive.billing.PaymentRepository;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.contact.ContactEnquiry;
import com.naboo.automotive.contact.ContactEnquiryRepository;
import com.naboo.automotive.inventory.AccessoryRepository;
import com.naboo.automotive.inventory.InventoryTypes.OrderStatus;
import com.naboo.automotive.inventory.OrderRepository;
import com.naboo.automotive.quotations.Quotation.QuotationStatus;
import com.naboo.automotive.quotations.QuotationRepository;
import com.naboo.automotive.rentals.RentalReservationRepository;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;
import com.naboo.automotive.vehicles.VehicleEnquiryRepository;
import com.naboo.automotive.vehicles.VehicleRepository;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;
import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;
import com.naboo.automotive.workshop.ServiceBookingRepository;
import com.naboo.automotive.workshop.WorkshopJob.JobStatus;
import com.naboo.automotive.workshop.WorkshopJobRepository;

@Controller
public class DashboardController {

    public record DashboardSummary(
            long newSalesEnquiries, long openSalesEnquiries, long newContactEnquiries,
            long vehiclesAvailable, long vehiclesReserved, long vehiclesSold, long vehiclesUnpublished,
            long pendingReservations, long pendingBookings, long openQuotations, long activeJobs,
            long openOrders, long unpaidInvoices, long lowStockItems,
            Money revenueThisMonth, Money outstandingReceivables) {
    }

    private final VehicleRepository vehicles;
    private final VehicleEnquiryRepository enquiries;
    private final ContactEnquiryRepository contacts;
    private final RentalReservationRepository reservations;
    private final ServiceBookingRepository bookings;
    private final QuotationRepository quotations;
    private final WorkshopJobRepository jobs;
    private final OrderRepository orders;
    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final AccessoryRepository accessories;
    private final AppProperties properties;

    public DashboardController(VehicleRepository vehicles, VehicleEnquiryRepository enquiries,
            ContactEnquiryRepository contacts, RentalReservationRepository reservations,
            ServiceBookingRepository bookings, QuotationRepository quotations, WorkshopJobRepository jobs,
            OrderRepository orders, InvoiceRepository invoices, PaymentRepository payments,
            AccessoryRepository accessories, AppProperties properties) {
        this.vehicles = vehicles;
        this.enquiries = enquiries;
        this.contacts = contacts;
        this.reservations = reservations;
        this.bookings = bookings;
        this.quotations = quotations;
        this.jobs = jobs;
        this.orders = orders;
        this.invoices = invoices;
        this.payments = payments;
        this.accessories = accessories;
        this.properties = properties;
    }

    @QueryMapping
    @PreAuthorize(Permissions.STAFF)
    @Transactional(readOnly = true)
    public DashboardSummary adminDashboard() {
        LocalDate monthStart = LocalDate.now(ZoneId.of(properties.timezone())).withDayOfMonth(1);
        BigDecimal revenue = payments.sumSince(monthStart.atStartOfDay(ZoneId.of(properties.timezone())).toInstant());
        BigDecimal outstanding = invoices.sumByStatus(InvoiceStatus.ISSUED);
        return new DashboardSummary(
                enquiries.countByStatus(EnquiryStatus.NEW),
                enquiries.countByStatusIn(List.of(EnquiryStatus.NEW, EnquiryStatus.CONTACTED, EnquiryStatus.VIEWING_SCHEDULED)),
                contacts.countByStatus(ContactEnquiry.Status.NEW),
                vehicles.countByStatus(VehicleStatus.AVAILABLE),
                vehicles.countByStatus(VehicleStatus.RESERVED),
                vehicles.countByStatus(VehicleStatus.SOLD),
                vehicles.countByPublishedFalse(),
                reservations.countByStatus(ReservationStatus.PENDING),
                bookings.countByStatus(BookingStatus.PENDING),
                quotations.countByStatusIn(List.of(QuotationStatus.REQUESTED, QuotationStatus.QUOTED)),
                jobs.countByStatusIn(List.of(JobStatus.SCHEDULED, JobStatus.IN_PROGRESS, JobStatus.ON_HOLD)),
                orders.countByStatusIn(List.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.READY)),
                invoices.countByStatus(InvoiceStatus.ISSUED),
                accessories.countByStockQuantityLessThanAndActiveTrue(5),
                Money.of(revenue, properties.currency()),
                Money.of(outstanding, properties.currency()));
    }
}

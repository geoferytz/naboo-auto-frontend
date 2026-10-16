import { gql } from 'apollo-angular';

const USER_FIELDS = 'id email fullName phone roles staff enabled lastLoginAt createdAt';

const ADMIN_VEHICLE_FIELDS = `
  id slug title make model variant year mileageKm fuelType transmission bodyType color condition
  engineCapacityCc description features status published enquiriesOpen viewingsOpen
  price { amount currency }
  images { id url altText sortOrder }
  registrationNumber publishedAt createdAt updatedAt
  statusHistory { fromStatus toStatus changedAt }
`;

export const ADMIN_DASHBOARD = gql`
  query AdminDashboard {
    adminDashboard {
      newSalesEnquiries openSalesEnquiries newContactEnquiries
      vehiclesAvailable vehiclesReserved vehiclesSold vehiclesUnpublished
    }
  }
`;

export const ADMIN_VEHICLES = gql`
  query AdminVehicles($filter: AdminVehicleFilter, $page: Int, $size: Int) {
    adminVehicles(filter: $filter, page: $page, size: $size) {
      totalCount page size totalPages
      items {
        id slug title make model year status published
        price { amount currency }
        images { id url altText sortOrder }
      }
    }
  }
`;

export const ADMIN_VEHICLE = gql`
  query AdminVehicle($id: ID!) {
    adminVehicle(id: $id) { ${ADMIN_VEHICLE_FIELDS} }
  }
`;

export const CREATE_VEHICLE = gql`
  mutation CreateVehicle($input: VehicleInput!) {
    createVehicle(input: $input) { id }
  }
`;

export const UPDATE_VEHICLE = gql`
  mutation UpdateVehicle($id: ID!, $input: VehicleInput!) {
    updateVehicle(id: $id, input: $input) { id }
  }
`;

export const SET_VEHICLE_STATUS = gql`
  mutation SetVehicleStatus($id: ID!, $status: VehicleStatus!) {
    setVehicleStatus(id: $id, status: $status) { id status }
  }
`;

export const SET_VEHICLE_PUBLISHED = gql`
  mutation SetVehiclePublished($id: ID!, $published: Boolean!) {
    setVehiclePublished(id: $id, published: $published) { id published }
  }
`;

export const REMOVE_VEHICLE_IMAGE = gql`
  mutation RemoveVehicleImage($vehicleId: ID!, $imageId: ID!) {
    removeVehicleImage(vehicleId: $vehicleId, imageId: $imageId) { id }
  }
`;

export const REORDER_VEHICLE_IMAGES = gql`
  mutation ReorderVehicleImages($vehicleId: ID!, $imageIds: [ID!]!) {
    reorderVehicleImages(vehicleId: $vehicleId, imageIds: $imageIds) { id }
  }
`;

export const SALES_ENQUIRIES = gql`
  query SalesEnquiries($status: EnquiryStatus, $page: Int, $size: Int) {
    salesEnquiries(status: $status, page: $page, size: $size) {
      totalCount page size totalPages
      items {
        id reference type fullName email phone message preferredViewingAt status assignedToUserId createdAt
        vehicle { id slug title status }
      }
    }
  }
`;

export const UPDATE_SALES_ENQUIRY = gql`
  mutation UpdateSalesEnquiry($id: ID!, $input: UpdateEnquiryInput!) {
    updateSalesEnquiry(id: $id, input: $input) { id status assignedToUserId }
  }
`;

export const CONTACT_ENQUIRIES = gql`
  query ContactEnquiries($status: ContactEnquiryStatus, $page: Int, $size: Int) {
    contactEnquiries(status: $status, page: $page, size: $size) {
      totalCount page size totalPages
      items { id reference fullName email phone subject message status createdAt }
    }
  }
`;

export const UPDATE_CONTACT_ENQUIRY = gql`
  mutation UpdateContactEnquiry($id: ID!, $status: ContactEnquiryStatus!) {
    updateContactEnquiryStatus(id: $id, status: $status) { id status }
  }
`;

export const ADMIN_SERVICES = gql`
  query AdminServices {
    serviceCategories { id slug name description sortOrder }
    adminServices {
      id slug name summary description priceType durationMinutes active sortOrder
      price { amount currency }
      category { id slug name }
    }
  }
`;

export const CREATE_SERVICE_CATEGORY = gql`
  mutation CreateServiceCategory($input: ServiceCategoryInput!) {
    createServiceCategory(input: $input) { id }
  }
`;

export const UPDATE_SERVICE_CATEGORY = gql`
  mutation UpdateServiceCategory($id: ID!, $input: ServiceCategoryInput!) {
    updateServiceCategory(id: $id, input: $input) { id }
  }
`;

export const CREATE_SERVICE = gql`
  mutation CreateService($input: ServiceInput!) {
    createService(input: $input) { id }
  }
`;

export const UPDATE_SERVICE = gql`
  mutation UpdateService($id: ID!, $input: ServiceInput!) {
    updateService(id: $id, input: $input) { id }
  }
`;

export const STAFF_USERS = gql`
  query StaffUsers($includeDisabled: Boolean) {
    staffUsers(includeDisabled: $includeDisabled) { ${USER_FIELDS} }
  }
`;

export const USERS = gql`
  query Users($search: String, $page: Int, $size: Int) {
    users(search: $search, page: $page, size: $size) {
      totalCount page size totalPages
      items { ${USER_FIELDS} }
    }
  }
`;

export const CREATE_STAFF_USER = gql`
  mutation CreateStaffUser($input: CreateStaffUserInput!) {
    createStaffUser(input: $input) { ${USER_FIELDS} }
  }
`;

export const SET_USER_ROLES = gql`
  mutation SetUserRoles($id: ID!, $roles: [Role!]!) {
    setUserRoles(id: $id, roles: $roles) { id roles }
  }
`;

export const SET_USER_ENABLED = gql`
  mutation SetUserEnabled($id: ID!, $enabled: Boolean!) {
    setUserEnabled(id: $id, enabled: $enabled) { id enabled }
  }
`;

const ADMIN_RENTAL_FIELDS = `
  id slug title make model variant year seats fuelType transmission bodyType color description status published
  dailyRate { amount currency }
  deposit { amount currency }
  images { id url altText sortOrder }
  registrationNumber publishedAt createdAt updatedAt
`;

export const ADMIN_RENTALS = gql`
  query AdminRentals($filter: AdminRentalFilter, $page: Int, $size: Int) {
    adminRentalVehicles(filter: $filter, page: $page, size: $size) {
      totalCount page size totalPages
      items { ${ADMIN_RENTAL_FIELDS} }
    }
  }
`;

export const ADMIN_RENTAL = gql`
  query AdminRental($id: ID!) {
    adminRentalVehicle(id: $id) { ${ADMIN_RENTAL_FIELDS} }
  }
`;

export const CREATE_RENTAL = gql`
  mutation CreateRental($input: RentalVehicleInput!) {
    createRentalVehicle(input: $input) { id }
  }
`;

export const UPDATE_RENTAL = gql`
  mutation UpdateRental($id: ID!, $input: RentalVehicleInput!) {
    updateRentalVehicle(id: $id, input: $input) { id }
  }
`;

export const SET_RENTAL_STATUS = gql`
  mutation SetRentalStatus($id: ID!, $status: RentalVehicleStatus!) {
    setRentalVehicleStatus(id: $id, status: $status) { id status }
  }
`;

export const SET_RENTAL_PUBLISHED = gql`
  mutation SetRentalPublished($id: ID!, $published: Boolean!) {
    setRentalVehiclePublished(id: $id, published: $published) { id published }
  }
`;

export const REMOVE_RENTAL_IMAGE = gql`
  mutation RemoveRentalImage($rentalVehicleId: ID!, $imageId: ID!) {
    removeRentalVehicleImage(rentalVehicleId: $rentalVehicleId, imageId: $imageId) { id }
  }
`;

export const REORDER_RENTAL_IMAGES = gql`
  mutation ReorderRentalImages($rentalVehicleId: ID!, $imageIds: [ID!]!) {
    reorderRentalVehicleImages(rentalVehicleId: $rentalVehicleId, imageIds: $imageIds) { id }
  }
`;

export const RESERVATIONS = gql`
  query Reservations($status: ReservationStatus, $page: Int, $size: Int) {
    rentalReservations(status: $status, page: $page, size: $size) {
      totalCount page size totalPages
      items {
        id reference fullName email phone startDate endDate days status notes createdAt
        vehicle { id slug title }
        dailyRate { amount currency }
        total { amount currency }
      }
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
    updateRentalReservation(id: $id, input: $input) { id status }
  }
`;

export const SERVICE_BOOKINGS = gql`
  query ServiceBookings($status: BookingStatus, $page: Int, $size: Int) {
    serviceBookings(status: $status, page: $page, size: $size) {
      totalCount page size totalPages
      items {
        id reference fullName email phone vehicleDescription scheduledStart scheduledEnd status notes createdAt
        service { id slug name category }
      }
    }
  }
`;

export const UPDATE_BOOKING = gql`
  mutation UpdateBooking($id: ID!, $input: UpdateBookingInput!) {
    updateServiceBooking(id: $id, input: $input) { id status }
  }
`;

export const WORKSHOP_CAPACITY = gql`
  query WorkshopCapacity {
    workshopCapacity { maxConcurrentJobs }
  }
`;

export const SET_WORKSHOP_CAPACITY = gql`
  mutation SetWorkshopCapacity($input: CapacityInput!) {
    setWorkshopCapacity(input: $input) { maxConcurrentJobs }
  }
`;

export const QUOTATIONS = gql`
  query Quotations($status: QuotationStatus, $page: Int, $size: Int) {
    quotations(status: $status, page: $page, size: $size) {
      totalCount page size totalPages
      items {
        id reference serviceName fullName email phone workType vehicleDescription description status
        validUntil staffNotes decidedAt createdAt
        quotedAmount { amount currency }
      }
    }
  }
`;

export const PRICE_QUOTATION = gql`
  mutation PriceQuotation($id: ID!, $input: QuoteInput!) {
    priceQuotation(id: $id, input: $input) { id status }
  }
`;

export const CANCEL_QUOTATION = gql`
  mutation CancelQuotation($id: ID!) {
    cancelQuotation(id: $id) { id status }
  }
`;

export const AUDIT_LOGS = gql`
  query AuditLogs($entityType: String, $entityId: String, $page: Int, $size: Int) {
    auditLogs(entityType: $entityType, entityId: $entityId, page: $page, size: $size) {
      totalCount page size totalPages
      items { id action entityType entityId details actorName createdAt }
    }
  }
`;

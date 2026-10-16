import { gql } from 'apollo-angular';

const USER_FIELDS = 'id email fullName phone roles staff';

export const ME = gql`
  query Me {
    me { ${USER_FIELDS} }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) { token expiresAt user { ${USER_FIELDS} } }
  }
`;

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) { token expiresAt user { ${USER_FIELDS} } }
  }
`;

const VEHICLE_CARD = `
  id slug title make model year mileageKm fuelType transmission bodyType condition status
  price { amount currency }
  images { id url altText sortOrder }
`;

export const VEHICLES = gql`
  query Vehicles($filter: VehicleFilter, $page: Int, $size: Int, $sort: VehicleSort) {
    vehicles(filter: $filter, page: $page, size: $size, sort: $sort) {
      totalCount page size totalPages
      items { ${VEHICLE_CARD} }
    }
  }
`;

export const VEHICLE_MAKES = gql`
  query VehicleMakes {
    vehicleMakes
  }
`;

export const VEHICLE_BY_SLUG = gql`
  query VehicleBySlug($slug: String!) {
    vehicleBySlug(slug: $slug) {
      ${VEHICLE_CARD}
      variant color engineCapacityCc description features enquiriesOpen viewingsOpen
    }
  }
`;

export const SUBMIT_VEHICLE_ENQUIRY = gql`
  mutation SubmitVehicleEnquiry($input: VehicleEnquiryInput!) {
    submitVehicleEnquiry(input: $input) { reference message }
  }
`;

const SERVICE_FIELDS = `
  id slug name summary description priceType durationMinutes
  price { amount currency }
  category { id slug name description }
`;

export const SERVICE_CATALOGUE = gql`
  query ServiceCatalogue {
    serviceCategories { id slug name description }
    services { ${SERVICE_FIELDS} }
  }
`;

export const SERVICE_BY_SLUG = gql`
  query ServiceBySlug($slug: String!) {
    serviceBySlug(slug: $slug) { ${SERVICE_FIELDS} }
  }
`;

export const SUBMIT_CONTACT_ENQUIRY = gql`
  mutation SubmitContactEnquiry($input: ContactEnquiryInput!) {
    submitContactEnquiry(input: $input) { reference message }
  }
`;

const RENTAL_CARD = `
  id slug title make model variant year seats fuelType transmission bodyType color
  dailyRate { amount currency }
  deposit { amount currency }
  images { id url altText sortOrder }
`;

export const RENTAL_VEHICLES = gql`
  query RentalVehicles($page: Int, $size: Int) {
    rentalVehicles(page: $page, size: $size) {
      totalCount page size totalPages
      items { ${RENTAL_CARD} }
    }
  }
`;

export const RENTAL_VEHICLE_BY_SLUG = gql`
  query RentalVehicleBySlug($slug: String!) {
    rentalVehicleBySlug(slug: $slug) { ${RENTAL_CARD} description status }
  }
`;

export const RENTAL_AVAILABILITY = gql`
  query RentalAvailability($rentalVehicleId: ID!, $startDate: Date!, $endDate: Date!) {
    rentalAvailability(rentalVehicleId: $rentalVehicleId, startDate: $startDate, endDate: $endDate) {
      available days
      dailyRate { amount currency }
      total { amount currency }
    }
  }
`;

export const REQUEST_RENTAL = gql`
  mutation RequestRental($input: ReservationInput!) {
    requestRental(input: $input) { reference message }
  }
`;

export const MY_RESERVATIONS = gql`
  query MyReservations($page: Int, $size: Int) {
    myRentalReservations(page: $page, size: $size) {
      totalCount
      items {
        id reference startDate endDate days status notes createdAt
        vehicle { id slug title }
        total { amount currency }
      }
    }
  }
`;

export const CANCEL_MY_RESERVATION = gql`
  mutation CancelMyReservation($id: ID!) {
    cancelMyReservation(id: $id) { id status }
  }
`;

export const BOOK_SERVICE = gql`
  mutation BookService($input: BookingInput!) {
    bookService(input: $input) { reference message }
  }
`;

export const MY_BOOKINGS = gql`
  query MyBookings($page: Int, $size: Int) {
    myServiceBookings(page: $page, size: $size) {
      totalCount
      items {
        id reference vehicleDescription scheduledStart scheduledEnd status notes createdAt
        service { id slug name category }
      }
    }
  }
`;

export const CANCEL_MY_BOOKING = gql`
  mutation CancelMyBooking($id: ID!) {
    cancelMyBooking(id: $id) { id status }
  }
`;

export const REQUEST_QUOTATION = gql`
  mutation RequestQuotation($input: QuotationRequestInput!) {
    requestQuotation(input: $input) { reference message }
  }
`;

export const MY_QUOTATIONS = gql`
  query MyQuotations($page: Int, $size: Int) {
    myQuotations(page: $page, size: $size) {
      totalCount
      items {
        id reference serviceName workType vehicleDescription description status validUntil decidedAt createdAt
        quotedAmount { amount currency }
      }
    }
  }
`;

export const DECIDE_QUOTATION = gql`
  mutation DecideQuotation($id: ID!, $accept: Boolean!) {
    decideQuotation(id: $id, accept: $accept) { id status }
  }
`;

export const ACCESSORIES = gql`
  query Accessories($category: String, $page: Int, $size: Int) {
    accessories(category: $category, page: $page, size: $size) {
      totalCount page size totalPages
      items { id sku name category description price { amount currency } stockQuantity inStock }
    }
  }
`;

export const PLACE_ORDER = gql`
  mutation PlaceOrder($input: OrderInput!) {
    placeOrder(input: $input) { reference message }
  }
`;

export const MY_ORDERS = gql`
  query MyOrders($page: Int, $size: Int) {
    myOrders(page: $page, size: $size) {
      totalCount
      items {
        id reference status notes createdAt
        total { amount currency }
        items { id description quantity unitPrice { amount currency } lineTotal { amount currency } }
      }
    }
  }
`;

export const CANCEL_MY_ORDER = gql`
  mutation CancelMyOrder($id: ID!) {
    cancelMyOrder(id: $id) { id status }
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($page: Int, $size: Int) {
    myNotifications(page: $page, size: $size) {
      totalCount
      items { id type title body link read createdAt }
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) { id read }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const MY_INVOICES = gql`
  query MyInvoices($page: Int, $size: Int) {
    myInvoices(page: $page, size: $size) {
      totalCount
      items {
        id reference status dueDate issuedAt paidAt createdAt
        total { amount currency }
        paid { amount currency }
        balance { amount currency }
        items { id description quantity unitPrice { amount currency } lineTotal { amount currency } }
        payments { id amount { amount currency } method reference paidAt }
      }
    }
  }
`;

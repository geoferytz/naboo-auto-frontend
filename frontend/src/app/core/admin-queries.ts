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

export const AUDIT_LOGS = gql`
  query AuditLogs($entityType: String, $entityId: String, $page: Int, $size: Int) {
    auditLogs(entityType: $entityType, entityId: $entityId, page: $page, size: $size) {
      totalCount page size totalPages
      items { id action entityType entityId details actorName createdAt }
    }
  }
`;

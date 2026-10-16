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

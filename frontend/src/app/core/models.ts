export interface Money {
  amount: string;
  currency: string;
}

export type Role =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'SALES_AGENT'
  | 'RENTAL_AGENT'
  | 'SERVICE_ADVISOR'
  | 'MECHANIC'
  | 'INVENTORY_MANAGER'
  | 'FINANCE_OFFICER'
  | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: Role[];
  staff: boolean;
  enabled?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface AuthPayload {
  token: string;
  expiresAt: string;
  user: User;
}

export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' | 'LPG';
export type Transmission = 'MANUAL' | 'AUTOMATIC';
export type BodyType = 'SEDAN' | 'HATCHBACK' | 'SUV' | 'PICKUP' | 'VAN' | 'COUPE' | 'WAGON' | 'OTHER';
export type VehicleCondition = 'NEW' | 'FOREIGN_USED' | 'LOCALLY_USED';
export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'UNAVAILABLE';
export type VehicleSort = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'YEAR_DESC' | 'MILEAGE_ASC';
export type EnquiryType = 'GENERAL' | 'VIEWING';

export interface VehicleImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
}

export interface VehicleCard {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number | null;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  condition: VehicleCondition;
  price: Money;
  status: VehicleStatus;
  images: VehicleImage[];
}

export interface VehicleDetail extends VehicleCard {
  variant: string | null;
  color: string | null;
  engineCapacityCc: number | null;
  description: string | null;
  features: string[];
  enquiriesOpen: boolean;
  viewingsOpen: boolean;
}

export interface Page<T> {
  items: T[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface VehicleFilter {
  search?: string | null;
  make?: string | null;
  minYear?: number | null;
  maxYear?: number | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  maxMileageKm?: number | null;
  fuelType?: FuelType | null;
  transmission?: Transmission | null;
  bodyType?: BodyType | null;
  condition?: VehicleCondition | null;
  includeSold?: boolean | null;
}

export type PriceType = 'FIXED' | 'STARTING_FROM' | 'HOURLY' | 'INSPECTION_REQUIRED' | 'QUOTE_REQUIRED';

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string | null;
  category: ServiceCategory;
  priceType: PriceType;
  price: Money | null;
  durationMinutes: number | null;
}

export interface EnquiryReceipt {
  reference: string;
  message: string;
}

// ------------------------------------------------------------------ staff/admin

export interface VehicleStatusChange {
  fromStatus: VehicleStatus | null;
  toStatus: VehicleStatus;
  changedAt: string;
}

export interface AdminVehicle extends VehicleDetail {
  published: boolean;
  publishedAt: string | null;
  registrationNumber: string | null;
  statusHistory: VehicleStatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminVehicleFilter {
  search?: string | null;
  status?: VehicleStatus | null;
  published?: boolean | null;
}

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'VIEWING_SCHEDULED' | 'CLOSED_WON' | 'CLOSED_LOST';

export interface SalesEnquiry {
  id: string;
  reference: string;
  vehicle: { id: string; slug: string; title: string; status: VehicleStatus };
  type: EnquiryType;
  fullName: string;
  email: string;
  phone: string;
  message: string | null;
  preferredViewingAt: string | null;
  status: EnquiryStatus;
  assignedToUserId: string | null;
  createdAt: string;
}

export type ContactEnquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

export interface ContactEnquiry {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactEnquiryStatus;
  createdAt: string;
}

export interface AdminServiceCategory extends ServiceCategory {
  sortOrder: number;
}

export interface AdminServiceItem extends ServiceItem {
  active: boolean;
  sortOrder: number;
}

export interface DashboardSummary {
  newSalesEnquiries: number;
  openSalesEnquiries: number;
  newContactEnquiries: number;
  vehiclesAvailable: number;
  vehiclesReserved: number;
  vehiclesSold: number;
  vehiclesUnpublished: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  actorUserId: string | null;
  actorName: string;
  createdAt: string;
}

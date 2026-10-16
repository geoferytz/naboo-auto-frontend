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

// ------------------------------------------------------------------ rentals & bookings

export type RentalVehicleStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface RentalVehicle {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  seats: number | null;
  fuelType: FuelType;
  transmission: Transmission;
  bodyType: BodyType;
  color: string | null;
  description: string | null;
  dailyRate: Money;
  deposit: Money | null;
  status: RentalVehicleStatus;
  published?: boolean;
  images: VehicleImage[];
  registrationNumber?: string | null;
}

export interface RentalAvailability {
  available: boolean;
  days: number;
  dailyRate: Money;
  total: Money;
}

export interface Reservation {
  id: string;
  reference: string;
  vehicle: { id: string; slug: string; title: string };
  fullName: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  days: number;
  status: ReservationStatus;
  dailyRate: Money;
  total: Money;
  notes: string | null;
  createdAt: string;
}

export interface AdminRentalFilter {
  search?: string | null;
  status?: RentalVehicleStatus | null;
  published?: boolean | null;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface ServiceBooking {
  id: string;
  reference: string;
  service: { id: string; slug: string; name: string; category: string };
  fullName: string;
  email: string;
  phone: string;
  vehicleDescription: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
}

export type WorkType = 'PAINTING' | 'COLOUR_CHANGE' | 'DETAILING' | 'RESTORATION' | 'REPAIR' | 'MAINTENANCE' | 'ACCESSORIES' | 'OTHER';
export type QuotationStatus = 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export interface Quotation {
  id: string;
  reference: string;
  serviceName: string | null;
  fullName: string;
  email: string;
  phone: string;
  workType: WorkType;
  vehicleDescription: string;
  description: string;
  status: QuotationStatus;
  quotedAmount: Money | null;
  validUntil: string | null;
  staffNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------ workshop jobs, inventory, billing

export type JobStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface WorkshopJob {
  id: string;
  reference: string;
  booking: { id: string; reference: string; serviceName: string } | null;
  vehicleDescription: string;
  description: string;
  status: JobStatus;
  assignedToUserId: string | null;
  scheduledFor: string | null;
  laborNotes: string | null;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type StockReason = 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'ADJUSTMENT' | 'RESTOCK';

export interface Accessory {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  description: string | null;
  price: Money;
  stockQuantity: number;
  active: boolean;
  inStock: boolean;
}

export interface Order {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  status: OrderStatus;
  total: Money;
  notes: string | null;
  items: { id: string; description: string; unitPrice: Money; quantity: number; lineTotal: Money }[];
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MPESA' | 'TIGOPESA' | 'AIRTEL_MONEY';

export interface Invoice {
  id: string;
  reference: string;
  recipientName: string;
  recipientEmail: string;
  status: InvoiceStatus;
  total: Money;
  paid: Money;
  balance: Money;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  items: { id: string; description: string; quantity: number; unitPrice: Money; lineTotal: Money }[];
  payments: { id: string; amount: Money; method: PaymentMethod; reference: string | null; paidAt: string; note: string | null }[];
  createdAt: string;
}

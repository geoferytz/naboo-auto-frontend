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

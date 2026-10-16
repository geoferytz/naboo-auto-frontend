import { Role } from './models';

/**
 * Client-side mirror of the backend permission groups (com.naboo.automotive.auth.Permissions).
 * Used only to hide navigation and controls the user cannot use — the server re-checks every call.
 */
const VEHICLE_MANAGE: readonly Role[] = ['SUPER_ADMIN', 'MANAGER', 'SALES_AGENT'];
const CATALOGUE_MANAGE: readonly Role[] = ['SUPER_ADMIN', 'MANAGER'];
const CONTACT_ENQUIRIES: readonly Role[] = ['SUPER_ADMIN', 'MANAGER', 'SALES_AGENT', 'SERVICE_ADVISOR'];
const USER_MANAGE: readonly Role[] = ['SUPER_ADMIN'];
const AUDIT_VIEW: readonly Role[] = ['SUPER_ADMIN', 'MANAGER'];

export function hasRole(userRoles: readonly Role[] | undefined | null, allowed: readonly Role[]): boolean {
  return !!userRoles?.some((r) => allowed.includes(r));
}

export const can = {
  vehicleManage: (roles: readonly Role[] | undefined | null) => hasRole(roles, VEHICLE_MANAGE),
  catalogueManage: (roles: readonly Role[] | undefined | null) => hasRole(roles, CATALOGUE_MANAGE),
  contactEnquiries: (roles: readonly Role[] | undefined | null) => hasRole(roles, CONTACT_ENQUIRIES),
  userManage: (roles: readonly Role[] | undefined | null) => hasRole(roles, USER_MANAGE),
  auditView: (roles: readonly Role[] | undefined | null) => hasRole(roles, AUDIT_VIEW),
};

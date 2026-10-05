// Pure RBAC logic (no I/O) so it is trivially unit-testable.
export interface CompanyAccess {
  companyId: string;
  companySlug: string;
  companyName: string;
  roleKey: string;
  permissions: ReadonlySet<string>;
}

export interface Access {
  staff: { roleKey: string; permissions: ReadonlySet<string> } | null;
  companies: readonly CompanyAccess[];
  isBuyer: boolean;
}

export interface PermissionScope {
  /** When set, the permission is checked against that company's role only. */
  companyId?: string;
}

export function can(access: Access, permission: string, scope: PermissionScope = {}): boolean {
  if (scope.companyId) {
    const membership = access.companies.find((c) => c.companyId === scope.companyId);
    return membership?.permissions.has(permission) ?? false;
  }
  if (!access.staff) return false;
  return access.staff.roleKey === "super_admin" || access.staff.permissions.has(permission);
}

export function isStaff(access: Access): boolean {
  return access.staff !== null;
}

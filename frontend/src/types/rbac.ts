/**
 * Enterprise RBAC & Capability Types
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  PRODUCTION_ENGINEER = 'PRODUCTION_ENGINEER',
  QUALITY_INSPECTOR = 'QUALITY_INSPECTOR',
  LINE_INSPECTOR = 'LINE_INSPECTOR',
  AUDITOR = 'AUDITOR',
}

export enum Permission {
  // User Management
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',

  // Part Master
  PART_CREATE = 'PART_CREATE',
  PART_READ = 'PART_READ',
  PART_UPDATE = 'PART_UPDATE',
  PART_DELETE = 'PART_DELETE',

  // Inspection Requests
  REQUEST_CREATE = 'REQUEST_CREATE',
  REQUEST_READ = 'REQUEST_READ',
  REQUEST_UPDATE = 'REQUEST_UPDATE',
  REQUEST_REASSIGN = 'REQUEST_REASSIGN',
  REQUEST_DELETE = 'REQUEST_DELETE',

  // Inspection Reports
  REPORT_CREATE = 'REPORT_CREATE',
  REPORT_READ = 'REPORT_READ',
  REPORT_REVISE = 'REPORT_REVISE',
  REPORT_DELETE = 'REPORT_DELETE',

  // Module Capabilities
  INSPECT_HEAT_TREATMENT = 'INSPECT_HEAT_TREATMENT',
  INSPECT_LINE = 'INSPECT_LINE',

  // Compliance
  AUDIT_READ = 'AUDIT_READ',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [Permission.SYSTEM_ADMIN],
  [UserRole.PRODUCTION_ENGINEER]: [
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.REQUEST_UPDATE,
    Permission.REQUEST_REASSIGN,
    Permission.REQUEST_DELETE,
    Permission.PART_CREATE,
    Permission.PART_READ,
    Permission.PART_UPDATE,
    Permission.PART_DELETE,
    Permission.REPORT_READ,
    Permission.REPORT_REVISE,
    Permission.REPORT_DELETE,
    Permission.AUDIT_READ,
  ],
  [UserRole.QUALITY_INSPECTOR]: [
    Permission.REQUEST_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.INSPECT_HEAT_TREATMENT,
    Permission.PART_READ,
  ],
  [UserRole.LINE_INSPECTOR]: [
    Permission.REQUEST_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.INSPECT_LINE,
    Permission.PART_READ,
  ],
  [UserRole.AUDITOR]: [
    Permission.REQUEST_READ,
    Permission.REPORT_READ,
    Permission.PART_READ,
    Permission.AUDIT_READ,
  ],
};

export function hasPermission(
  user: { role?: string; canManageUsers?: boolean; customPermissions?: string[] } | null | undefined,
  requiredPermission: Permission,
): boolean {
  if (!user) return false;

  // Admin has wildcard access
  if (user.role === UserRole.ADMIN) return true;

  // canManageUsers grant
  if (user.canManageUsers && requiredPermission.startsWith('USER_')) return true;

  // Custom permissions override
  if (user.customPermissions && user.customPermissions.includes(requiredPermission)) {
    return true;
  }

  // Role defaults
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] || [];
  return defaults.includes(Permission.SYSTEM_ADMIN) || defaults.includes(requiredPermission);
}


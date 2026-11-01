import { UserRole } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),

  [UserRole.PRODUCTION_ENGINEER]: [
    Permission.USER_READ,
    Permission.PART_CREATE,
    Permission.PART_READ,
    Permission.PART_UPDATE,
    Permission.PART_DELETE,
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.REQUEST_UPDATE,
    Permission.REQUEST_REASSIGN,
    Permission.REQUEST_DELETE,
    Permission.REPORT_READ,
    Permission.AUDIT_READ,
  ],

  [UserRole.QUALITY_INSPECTOR]: [
    Permission.PART_READ,
    Permission.REQUEST_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.REPORT_REVISE,
    Permission.INSPECT_HEAT_TREATMENT,
    Permission.INSPECT_LINE,
  ],

  [UserRole.LINE_INSPECTOR]: [
    Permission.PART_READ,
    Permission.REQUEST_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.INSPECT_LINE,
  ],

  [UserRole.AUDITOR]: [
    Permission.USER_READ,
    Permission.PART_READ,
    Permission.REQUEST_READ,
    Permission.REPORT_READ,
    Permission.AUDIT_READ,
  ],
};

export function resolveUserPermissions(user: {
  role: UserRole;
  canManageUsers?: boolean;
  customPermissions?: string[] | null;
}): Set<Permission | string> {
  const permissions = new Set<Permission | string>(ROLE_PERMISSIONS[user.role] || []);

  // Backwards-compatible canManageUsers toggle for Production Engineers
  if (user.role === UserRole.PRODUCTION_ENGINEER && user.canManageUsers) {
    permissions.add(Permission.USER_CREATE);
    permissions.add(Permission.USER_UPDATE);
    permissions.add(Permission.USER_DELETE);
  }

  // User-specific custom permission overrides
  if (Array.isArray(user.customPermissions)) {
    for (const p of user.customPermissions) {
      if (typeof p === 'string' && p.trim()) {
        permissions.add(p.trim());
      }
    }
  }

  return permissions;
}


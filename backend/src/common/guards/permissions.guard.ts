import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';
import { resolveUserPermissions } from '../constants/role-permissions.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Forbidden: Authentication required');
    }

    const userPermissions = resolveUserPermissions(user);

    // If user has SYSTEM_ADMIN, grant all
    if (userPermissions.has(Permission.SYSTEM_ADMIN)) {
      return true;
    }

    const missing = requiredPermissions.filter((p) => !userPermissions.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Forbidden: Insufficient permissions. Required: [${missing.join(', ')}]`,
      );
    }

    return true;
  }
}


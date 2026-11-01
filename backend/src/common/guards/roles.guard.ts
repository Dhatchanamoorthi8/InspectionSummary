import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Forbidden: Authentication required');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      if (user.role === UserRole.QUALITY_INSPECTOR) {
        throw new ForbiddenException('Forbidden: Quality Inspector cannot perform this action');
      } else {
        throw new ForbiddenException('Forbidden: Production Engineer cannot perform this action');
      }
    }

    return true;
  }
}

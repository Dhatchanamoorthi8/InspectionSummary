import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../enums/role.enum';

@Injectable()
export class UserManagementGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Forbidden: Authentication required');
    }
    if (user.role !== UserRole.PRODUCTION_ENGINEER || !user.canManageUsers) {
      throw new ForbiddenException('Forbidden: User management permission required');
    }
    return true;
  }
}

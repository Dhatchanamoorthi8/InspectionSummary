import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { resolveUserPermissions } from '../common/constants/role-permissions.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'heat-treatment-secret-key-2026',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.id } });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      canManageUsers: user.canManageUsers,
      isActive: user.isActive,
      signatureData: user.signatureData,
      customPermissions: user.customPermissions || [],
      permissions: Array.from(resolveUserPermissions(user)),
    };
  }
}

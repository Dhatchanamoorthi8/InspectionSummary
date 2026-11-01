import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { resolveUserPermissions } from '../common/constants/role-permissions.constant';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username?: string, password?: string) {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }

    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      canManageUsers: user.canManageUsers,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        canManageUsers: user.canManageUsers,
        isActive: user.isActive,
        signatureData: user.signatureData,
        customPermissions: user.customPermissions || [],
        permissions: Array.from(resolveUserPermissions(user)),
      },
    };
  }
}

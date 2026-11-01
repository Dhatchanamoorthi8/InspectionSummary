import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PermissionEntity } from './entities/permission.entity';
import { UserRole } from '../common/enums/role.enum';
import { Permission } from '../common/enums/permission.enum';
import { resolveUserPermissions } from '../common/constants/role-permissions.constant';
import { AuditService } from '../audit/audit.service';

const SYSTEM_PERMISSIONS_SEED = [
  { id: Permission.USER_CREATE, name: 'Create Users', category: 'Users', description: 'Create new production engineer and inspector user accounts' },
  { id: Permission.USER_READ, name: 'View Users', category: 'Users', description: 'View user directory and team assignments' },
  { id: Permission.USER_UPDATE, name: 'Update Users', category: 'Users', description: 'Update profile, active status, and assign user roles' },
  { id: Permission.USER_DELETE, name: 'Delete Users', category: 'Users', description: 'Permanently remove or deactivate staff user accounts' },
  { id: Permission.PART_CREATE, name: 'Create Parts', category: 'Parts', description: 'Create and map master part numbers' },
  { id: Permission.PART_READ, name: 'View Parts', category: 'Parts', description: 'Read active part master records and specifications' },
  { id: Permission.PART_UPDATE, name: 'Update Parts', category: 'Parts', description: 'Edit part numbers and names' },
  { id: Permission.PART_DELETE, name: 'Delete Parts', category: 'Parts', description: 'Deactivate or delete part records' },
  { id: Permission.REQUEST_CREATE, name: 'Create Requests', category: 'Requests', description: 'Initiate inspection requests and assign to inspectors' },
  { id: Permission.REQUEST_READ, name: 'View Requests', category: 'Requests', description: 'View inspection pipeline requests' },
  { id: Permission.REQUEST_UPDATE, name: 'Update Requests', category: 'Requests', description: 'Edit inspection request remarks and parameters' },
  { id: Permission.REQUEST_REASSIGN, name: 'Reassign Requests', category: 'Requests', description: 'Reassign requests to another active quality inspector' },
  { id: Permission.REQUEST_DELETE, name: 'Delete Requests', category: 'Requests', description: 'Safely delete requests and cascade history' },
  { id: Permission.REPORT_CREATE, name: 'Create Reports', category: 'Reports', description: 'Submit official QC inspection reports with digital signature' },
  { id: Permission.REPORT_READ, name: 'View Reports', category: 'Reports', description: 'View completed inspection certificates and download PDFs' },
  { id: Permission.REPORT_REVISE, name: 'Revise Reports', category: 'Reports', description: 'Issue audited revisions with version history tracking' },
  { id: Permission.REPORT_DELETE, name: 'Void/Delete Reports', category: 'Reports', description: 'Void completed reports and return request to In Progress' },
  { id: Permission.INSPECT_HEAT_TREATMENT, name: 'Heat Treatment Inspection', category: 'Modules', description: 'Execute metallurgical BHN, YS, UTS, and elongation testing' },
  { id: Permission.INSPECT_LINE, name: 'Line QC Inspection', category: 'Modules', description: 'Execute line production checks (Torque, Dimension, Visual)' },
  { id: Permission.AUDIT_READ, name: 'View Audit Logs', category: 'System', description: 'Access immutable system audit trail and user activity records' },
  { id: Permission.SYSTEM_ADMIN, name: 'System Administrator', category: 'System', description: 'Superuser access with complete administrative bypass' },
];

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    // Seed standard system permissions if not present
    try {
      for (const item of SYSTEM_PERMISSIONS_SEED) {
        const exists = await this.permRepo.findOne({ where: { id: item.id } });
        if (!exists) {
          const perm = this.permRepo.create({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            isSystem: true,
          });
          await this.permRepo.save(perm);
        }
      }
    } catch (err) {
      console.warn('Permission seeding note:', err.message);
    }
  }

  async getAllPermissions() {
    return this.permRepo.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async createPermission(body: any, authUser: any) {
    let { id, name, description, category } = body || {};

    if (!id || !name) {
      throw new BadRequestException('Permission code (id) and display name are required');
    }

    id = id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (id.length < 3) {
      throw new BadRequestException('Permission code must be at least 3 characters');
    }

    const existing = await this.permRepo.findOne({ where: { id } });
    if (existing) {
      throw new ConflictException(`Permission code '${id}' already exists`);
    }

    const newPerm = this.permRepo.create({
      id,
      name: name.trim(),
      description: description ? description.trim() : null,
      category: category ? category.trim() : 'Custom',
      isSystem: false,
    });

    const saved = await this.permRepo.save(newPerm);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'CREATE_PERMISSION',
      'PERMISSION',
      saved.id,
      null,
      { id: saved.id, name: saved.name, category: saved.category },
    );

    return saved;
  }

  async findInspectors() {
    const inspectors = await this.userRepo.find({
      where: { role: UserRole.QUALITY_INSPECTOR, isActive: true },
      order: { fullName: 'ASC' },
    });
    return inspectors.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      customPermissions: u.customPermissions || [],
      effectivePermissions: Array.from(resolveUserPermissions(u)),
    }));
  }

  async findAll() {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      canManageUsers: u.canManageUsers,
      isActive: u.isActive,
      hasSignature: !!u.signatureData,
      customPermissions: u.customPermissions || [],
      effectivePermissions: Array.from(resolveUserPermissions(u)),
    }));
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(body: any, authUser: any) {
    const { username, password, fullName, role, canManageUsers, isActive, signatureData, customPermissions } = body || {};

    if (!username || !password || !fullName || !role) {
      throw new BadRequestException('Missing required user fields');
    }

    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = this.userRepo.create({
      username,
      passwordHash,
      fullName,
      role,
      canManageUsers: !!canManageUsers,
      isActive: isActive !== false,
      signatureData: signatureData || null,
      customPermissions: Array.isArray(customPermissions) ? customPermissions : [],
    });

    const saved = await this.userRepo.save(newUser);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'CREATE_USER',
      'USER',
      saved.id,
      null,
      { username, role, customPermissions: saved.customPermissions },
    );

    return {
      id: saved.id,
      username: saved.username,
      fullName: saved.fullName,
      role: saved.role,
      canManageUsers: saved.canManageUsers,
      isActive: saved.isActive,
      customPermissions: saved.customPermissions || [],
      effectivePermissions: Array.from(resolveUserPermissions(saved)),
    };
  }

  async update(id: string, body: any, authUser: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const prev = {
      fullName: user.fullName,
      isActive: user.isActive,
      canManageUsers: user.canManageUsers,
      role: user.role,
      customPermissions: user.customPermissions,
    };

    if (body.fullName !== undefined) user.fullName = body.fullName;
    if (body.isActive !== undefined) user.isActive = body.isActive;
    if (body.canManageUsers !== undefined) user.canManageUsers = body.canManageUsers;
    if (body.role !== undefined) user.role = body.role;
    if (body.customPermissions !== undefined && Array.isArray(body.customPermissions)) {
      user.customPermissions = body.customPermissions;
    }

    const saved = await this.userRepo.save(user);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'UPDATE_USER',
      'USER',
      saved.id,
      prev,
      {
        fullName: saved.fullName,
        isActive: saved.isActive,
        canManageUsers: saved.canManageUsers,
        role: saved.role,
        customPermissions: saved.customPermissions,
      },
    );

    return {
      id: saved.id,
      username: saved.username,
      fullName: saved.fullName,
      role: saved.role,
      canManageUsers: saved.canManageUsers,
      isActive: saved.isActive,
      customPermissions: saved.customPermissions || [],
      effectivePermissions: Array.from(resolveUserPermissions(saved)),
    };
  }

  async updateUserPermissions(targetUserId: string, permissions: string[], authUser: any) {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const prevPermissions = user.customPermissions || [];
    const newPermissions = Array.isArray(permissions)
      ? Array.from(new Set(permissions.map((p) => String(p).trim()).filter(Boolean)))
      : [];

    user.customPermissions = newPermissions;
    const saved = await this.userRepo.save(user);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'UPDATE_USER_PERMISSIONS',
      'USER',
      saved.id,
      { customPermissions: prevPermissions },
      { customPermissions: saved.customPermissions },
    );

    return {
      success: true,
      id: saved.id,
      username: saved.username,
      customPermissions: saved.customPermissions,
      effectivePermissions: Array.from(resolveUserPermissions(saved)),
    };
  }

  async updateSignature(targetUserId: string, signatureData: string, authUser: any) {
    if (authUser.id !== targetUserId && authUser.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException('Forbidden: Cannot edit another user signature');
    }

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!signatureData) {
      throw new BadRequestException('signatureData is required');
    }

    user.signatureData = signatureData;
    await this.userRepo.save(user);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'UPDATE_SIGNATURE',
      'USER',
      user.id,
    );

    return { success: true, message: 'Signature updated successfully' };
  }

  async deleteUser(id: string, currentUser: any) {
    if (id === currentUser.id) {
      throw new BadRequestException('Forbidden: Cannot delete currently logged-in user account');
    }

    const targetUser = await this.userRepo.findOne({ where: { id } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Reassign any active assigned requests
    try {
      await this.userRepo.manager.query(
        `UPDATE inspection_requests SET "assignedInspectorId" = NULL, "assignedInspectorName" = NULL, "status" = 'Draft' WHERE "assignedInspectorId" = $1 AND "status" = 'Assigned'`,
        [id],
      );
    } catch {}

    await this.userRepo.remove(targetUser);

    await this.auditService.log(
      currentUser.id,
      currentUser.username,
      'DELETE_USER',
      'USER',
      id,
      { username: targetUser.username, fullName: targetUser.fullName, role: targetUser.role },
      null,
    );

    return { success: true, message: 'User deleted successfully', id };
  }
}

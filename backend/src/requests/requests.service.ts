import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionRequest } from './entities/request.entity';
import { AssignmentHistory } from './entities/reassignment-history.entity';
import { PartMaster } from '../parts/entities/part.entity';
import { User } from '../users/entities/user.entity';
import { RequestStatus } from '../common/enums/request-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RequestsService implements OnModuleInit {
  constructor(
    @InjectRepository(InspectionRequest)
    private readonly requestRepo: Repository<InspectionRequest>,
    @InjectRepository(AssignmentHistory)
    private readonly historyRepo: Repository<AssignmentHistory>,
    @InjectRepository(PartMaster)
    private readonly partRepo: Repository<PartMaster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.initSequence();
  }

  private async initSequence() {
    try {
      await this.requestRepo.query(`
        CREATE SEQUENCE IF NOT EXISTS request_number_seq START WITH 1001;
      `);
      await this.requestRepo.query(`
        SELECT setval(
          'request_number_seq',
          GREATEST((SELECT count(*) FROM inspection_requests) + 1001, 1001)
        );
      `);
    } catch {
      // Graceful fallback if sequence query fails
    }
  }

  private async generateRequestNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    try {
      const res = await this.requestRepo.query(`SELECT nextval('request_number_seq') AS seq;`);
      if (res && res[0] && res[0].seq) {
        return `REQ-${today}-${res[0].seq}`;
      }
    } catch {
      try {
        await this.initSequence();
        const res = await this.requestRepo.query(`SELECT nextval('request_number_seq') AS seq;`);
        if (res && res[0] && res[0].seq) {
          return `REQ-${today}-${res[0].seq}`;
        }
      } catch {
        // Fallback to count + jitter
      }
    }
    const count = await this.requestRepo.count();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${today}-${1001 + count}-${rand}`;
  }

  async findAll(user: any, filters?: {
    status?: string;
    partName?: string;
    inspectorId?: string;
    reportResult?: string;
  }) {
    const query = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.assignmentHistory', 'assignmentHistory')
      .leftJoinAndSelect('request.report', 'report')
      .orderBy('request.createdAt', 'DESC');

    // Quality Inspector sees only tasks assigned to them
    if (user.role === UserRole.QUALITY_INSPECTOR) {
      query.andWhere('request.assignedInspectorId = :inspectorId', {
        inspectorId: user.id,
      });
    }

    if (filters?.status) {
      query.andWhere('request.status = :status', { status: filters.status });
    }

    if (filters?.partName) {
      query.andWhere('request.partName = :partName', { partName: filters.partName });
    }

    if (filters?.inspectorId) {
      query.andWhere('request.assignedInspectorId = :targetInspectorId', {
        targetInspectorId: filters.inspectorId,
      });
    }

    if (filters?.reportResult) {
      query.andWhere('report.overallStatus = :reportResult', {
        reportResult: filters.reportResult,
      });
    }

    const results = await query.getMany();
    return results;
  }

  async create(body: any, authUser: any) {
    if (authUser.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException(
        'Forbidden: Quality Inspector cannot create inspection requests',
      );
    }

    const { partName, partNumber, assignedInspectorId, remarks, moduleType, moduleMetadata } = body || {};

    if (!partName || !partNumber) {
      throw new BadRequestException('Part Name and Part Number are required');
    }

    const partMatch = await this.partRepo.findOne({
      where: { partName, partNumber, isActive: true },
    });
    if (!partMatch) {
      throw new BadRequestException(
        'Selected Part Name and Part Number do not match active master data',
      );
    }

    let inspector: User | null = null;
    if (assignedInspectorId) {
      inspector = await this.userRepo.findOne({
        where: {
          id: assignedInspectorId,
          role: UserRole.QUALITY_INSPECTOR,
          isActive: true,
        },
      });
      if (!inspector) {
        throw new BadRequestException('Assigned inspector is invalid or inactive');
      }
    }

    let saved: InspectionRequest | null = null;
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const requestNumber = await this.generateRequestNumber();
        const today = new Date().toISOString().slice(0, 10);
        const initialStatus = inspector ? RequestStatus.ASSIGNED : RequestStatus.DRAFT;

        const newReq = this.requestRepo.create({
          requestNumber,
          date: today,
          moduleType: moduleType || 'HEAT_TREATMENT',
          moduleMetadata: moduleMetadata || null,
          partId: partMatch.id,
          partName: partMatch.partName,
          partNumber: partMatch.partNumber,
          assignedInspectorId: inspector ? inspector.id : null,
          assignedInspectorName: inspector ? inspector.fullName : null,
          status: initialStatus,
          remarks: remarks || '',
          createdBy: authUser.id,
        });

        saved = await this.requestRepo.save(newReq);
        break;
      } catch (err: any) {
        const isUniqueViolation =
          err?.code === '23505' ||
          err?.driverError?.code === '23505' ||
          (err?.message && err.message.includes('unique constraint'));

        if (isUniqueViolation && attempt < maxRetries) {
          try {
            await this.requestRepo.query(`
              SELECT setval(
                'request_number_seq',
                GREATEST((SELECT count(*) FROM inspection_requests) + 1001 + ${attempt * 5}, 1001)
              );
            `);
          } catch {}
          await new Promise((resolve) =>
            setTimeout(resolve, 15 + Math.floor(Math.random() * 35)),
          );
          continue;
        }
        throw err;
      }
    }

    if (!saved) {
      throw new BadRequestException('Failed to create inspection request after multiple retries');
    }

    if (inspector) {
      const history = this.historyRepo.create({
        requestId: saved.id,
        assignedInspectorId: inspector.id,
        assignedInspectorName: inspector.fullName,
        assignedBy: authUser.username,
        reason: 'Initial assignment',
      });
      await this.historyRepo.save(history);
      saved.assignmentHistory = [history];
    } else {
      saved.assignmentHistory = [];
    }

    await this.auditService.log(
      authUser.id,
      authUser.username,
      'CREATE_REQUEST',
      'REQUEST',
      saved.id,
      null,
      saved,
    );

    return saved;
  }

  async findById(id: string, user: any) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['assignmentHistory', 'report'],
    });

    if (!request) {
      throw new NotFoundException('Inspection request not found');
    }

    if (
      user.role === UserRole.QUALITY_INSPECTOR &&
      request.assignedInspectorId !== user.id
    ) {
      throw new ForbiddenException('Forbidden: Cannot access another inspector task');
    }

    return {
      ...request,
      report: request.report || null,
    };
  }

  async assign(id: string, inspectorId: string, reason: string, authUser: any) {
    if (authUser.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException(
        'Forbidden: Quality Inspector cannot assign or reassign requests',
      );
    }

    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['assignmentHistory'],
    });
    if (!request) {
      throw new NotFoundException('Inspection request not found');
    }

    const newInsp = await this.userRepo.findOne({
      where: { id: inspectorId, role: UserRole.QUALITY_INSPECTOR, isActive: true },
    });
    if (!newInsp) {
      throw new BadRequestException('Invalid or inactive inspector');
    }

    const prev = {
      assignedInspectorId: request.assignedInspectorId,
      assignedInspectorName: request.assignedInspectorName,
    };

    request.assignedInspectorId = newInsp.id;
    request.assignedInspectorName = newInsp.fullName;
    request.status = RequestStatus.ASSIGNED;
    delete (request as any).assignmentHistory;

    const saved = await this.requestRepo.save(request);

    const history = this.historyRepo.create({
      requestId: saved.id,
      assignedInspectorId: newInsp.id,
      assignedInspectorName: newInsp.fullName,
      assignedBy: authUser.username,
      reason: reason || 'Reassigned',
    });
    await this.historyRepo.save(history);

    const allHistory = await this.historyRepo.find({
      where: { requestId: saved.id },
      order: { assignedAt: 'ASC' },
    });
    saved.assignmentHistory = allHistory;

    await this.auditService.log(
      authUser.id,
      authUser.username,
      'REASSIGN_REQUEST',
      'REQUEST',
      saved.id,
      prev,
      { assignedInspectorId: newInsp.id, reason },
    );

    return saved;
  }

  async start(id: string, user: any) {
    if (user.role !== UserRole.QUALITY_INSPECTOR) {
      throw new ForbiddenException(
        'Forbidden: Only Quality Inspector can start an inspection task',
      );
    }

    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['assignmentHistory'],
    });
    if (!request) {
      throw new NotFoundException('Inspection request not found');
    }

    if (request.assignedInspectorId !== user.id) {
      throw new ForbiddenException('Forbidden: Cannot start another inspector task');
    }

    request.status = RequestStatus.IN_PROGRESS;
    const saved = await this.requestRepo.save(request);

    await this.auditService.log(
      user.id,
      user.username,
      'START_INSPECTION',
      'REQUEST',
      saved.id,
    );

    return saved;
  }

  async cancel(id: string, user: any) {
    if (user.role !== UserRole.PRODUCTION_ENGINEER) {
      throw new ForbiddenException(
        'Forbidden: Quality Inspector cannot cancel requests',
      );
    }

    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Inspection request not found');
    }

    request.status = RequestStatus.CANCELLED;
    const saved = await this.requestRepo.save(request);

    await this.auditService.log(
      user.id,
      user.username,
      'CANCEL_REQUEST',
      'REQUEST',
      saved.id,
    );

    return saved;
  }

  async deleteRequest(id: string, user: any) {
    const isPE = user.role === UserRole.PRODUCTION_ENGINEER;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isAdmin && !isPE) {
      throw new ForbiddenException('Forbidden: Insufficient permissions to delete inspection request');
    }

    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['report', 'assignmentHistory'],
    });

    if (!request) {
      throw new NotFoundException('Inspection request not found');
    }

    if (!isAdmin && request.status === RequestStatus.COMPLETED) {
      throw new ForbiddenException('Forbidden: Only Administrators can delete completed inspection requests');
    }

    // Delete associated assignment history
    if (request.assignmentHistory && request.assignmentHistory.length > 0) {
      await this.historyRepo.delete({ requestId: request.id });
    }

    // Delete associated report if exists
    if (request.report) {
      await this.requestRepo.manager.query(
        `DELETE FROM report_revisions WHERE "reportId" = $1`,
        [request.report.id],
      );
      await this.requestRepo.manager.query(
        `DELETE FROM inspection_reports WHERE "id" = $1`,
        [request.report.id],
      );
    }

    // Remove the request
    await this.requestRepo.delete({ id: request.id });

    // Audit log
    await this.auditService.log(
      user.id,
      user.username,
      'DELETE_REQUEST',
      'REQUEST',
      id,
      { requestNumber: request.requestNumber, status: request.status, partNumber: request.partNumber },
      null,
    );

    return { success: true, message: 'Inspection request deleted successfully', id };
  }
}

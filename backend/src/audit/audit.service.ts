import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    username: string,
    action: string,
    entityType: string,
    entityId: string,
    previousValue: any = null,
    newValue: any = null,
  ): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId,
      username,
      action,
      entityType,
      entityId,
      previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
    });
    return this.auditRepo.save(entry);
  }

  async findAll(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
  }): Promise<AuditLog[]> {
    const query = this.auditRepo.createQueryBuilder('audit').orderBy('audit.timestamp', 'DESC');

    if (filters?.entityType) {
      query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
    }
    if (filters?.entityId) {
      query.andWhere('audit.entityId = :entityId', { entityId: filters.entityId });
    }
    if (filters?.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    return query.getMany();
  }
}

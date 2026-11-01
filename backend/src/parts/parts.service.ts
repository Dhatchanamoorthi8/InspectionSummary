import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { PartMaster } from './entities/part.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(PartMaster)
    private readonly partRepo: Repository<PartMaster>,
    private readonly auditService: AuditService,
  ) {}

  getTemplateCsv(): string {
    return 'Part Name,Part Number\nAxle Shaft,AX-9001\nCrankshaft,CR-9002\n';
  }

  async getDistinctNames(): Promise<string[]> {
    const parts = await this.partRepo.find({
      where: { isActive: true },
      select: ['partName'],
    });
    return [...new Set(parts.map((p) => p.partName))];
  }

  async getNumbers(partName?: string): Promise<string[]> {
    const where: any = { isActive: true };
    if (partName) {
      where.partName = partName;
    }
    const parts = await this.partRepo.find({ where, select: ['partNumber'] });
    return parts.map((p) => p.partNumber);
  }

  previewImport(rows: any[]) {
    if (!Array.isArray(rows)) {
      throw new BadRequestException('Expected rows array');
    }

    const validRows: { partName: string; partNumber: string }[] = [];
    const errors: { line: number; message: string }[] = [];

    rows.forEach((row, idx) => {
      const lineNum = idx + 1;
      const partName = row?.partName || row?.['Part Name'];
      const partNumber = row?.partNumber || row?.['Part Number'];

      if (!partName || !partNumber) {
        errors.push({ line: lineNum, message: 'Missing Part Name or Part Number' });
      } else {
        validRows.push({
          partName: String(partName).trim(),
          partNumber: String(partNumber).trim(),
        });
      }
    });

    return {
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      validRows,
      errors,
    };
  }

  async commitImport(validRows: any[], authUser: any) {
    if (!Array.isArray(validRows)) {
      throw new BadRequestException('Expected validRows array');
    }

    let imported = 0;
    for (const item of validRows) {
      const partName = String(item.partName).trim();
      const partNumber = String(item.partNumber).trim();

      const exists = await this.partRepo.findOne({
        where: { partName, partNumber },
      });

      if (!exists) {
        const newPart = this.partRepo.create({
          partName,
          partNumber,
          isActive: true,
          createdByUserId: authUser?.id || null,
        });
        await this.partRepo.save(newPart);
        imported++;
      }
    }

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'BULK_IMPORT_PARTS',
      'PART_MASTER',
      'BULK',
      null,
      { importedCount: imported },
    );

    return { success: true, importedCount: imported };
  }

  async findAll(search?: string): Promise<PartMaster[]> {
    if (search && search.trim()) {
      const s = search.trim();
      return this.partRepo.find({
        where: [
          { partName: ILike(`%${s}%`) },
          { partNumber: ILike(`%${s}%`) },
        ],
        order: { createdAt: 'ASC' },
      });
    }
    return this.partRepo.find({ order: { createdAt: 'ASC' } });
  }

  async create(partName: string, partNumber: string, authUser: any) {
    if (!partName || !partNumber) {
      throw new BadRequestException('partName and partNumber required');
    }

    const trimmedName = partName.trim();
    const trimmedNumber = partNumber.trim();

    const existing = await this.partRepo.findOne({
      where: { partName: trimmedName, partNumber: trimmedNumber },
    });

    if (existing) {
      throw new ConflictException('Part mapping already exists');
    }

    const newPart = this.partRepo.create({
      partName: trimmedName,
      partNumber: trimmedNumber,
      isActive: true,
      createdByUserId: authUser?.id || null,
    });

    const saved = await this.partRepo.save(newPart);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'CREATE_PART',
      'PART',
      saved.id,
      null,
      saved,
    );

    return saved;
  }

  async deactivate(id: string, authUser: any, permanent: boolean = false) {
    const part = await this.partRepo.findOne({ where: { id } });
    if (!part) {
      throw new NotFoundException('Part not found');
    }

    if (permanent) {
      // Check if any requests reference this part
      const requestCount = await this.partRepo.manager.query(
        `SELECT COUNT(*) FROM inspection_requests WHERE "partId" = $1 OR "partNumber" = $2`,
        [part.id, part.partNumber],
      );
      const count = parseInt(requestCount[0]?.count || '0', 10);
      if (count === 0) {
        await this.partRepo.remove(part);
        await this.auditService.log(
          authUser?.id || null,
          authUser?.username || 'system',
          'DELETE_PART',
          'PART',
          id,
          { partName: part.partName, partNumber: part.partNumber },
          null,
        );
        return { success: true, message: 'Part deleted permanently' };
      }
    }

    part.isActive = false;
    await this.partRepo.save(part);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'DEACTIVATE_PART',
      'PART',
      part.id,
    );

    return { success: true, message: 'Part deactivated' };
  }

  async activate(id: string, authUser: any) {
    const part = await this.partRepo.findOne({ where: { id } });
    if (!part) {
      throw new NotFoundException('Part not found');
    }

    part.isActive = true;
    await this.partRepo.save(part);

    await this.auditService.log(
      authUser?.id || null,
      authUser?.username || 'system',
      'ACTIVATE_PART',
      'PART',
      part.id,
      null,
      { partName: part.partName, partNumber: part.partNumber },
    );

    return { success: true, message: 'Part activated' };
  }
}

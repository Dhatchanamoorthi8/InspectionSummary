import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { RequestStatus } from '../../common/enums/request-status.enum';
import { PartMaster } from '../../parts/entities/part.entity';
import { User } from '../../users/entities/user.entity';
import { AssignmentHistory } from './reassignment-history.entity';
import { InspectionReport } from '../../reports/entities/report.entity';

@Entity('inspection_requests')
export class InspectionRequest {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_requests_number')
  @Column({ name: 'request_number', type: 'varchar', length: 50, unique: true })
  requestNumber: string;

  @Index('idx_requests_module_type')
  @Column({ name: 'module_type', type: 'varchar', length: 50, default: 'HEAT_TREATMENT' })
  moduleType: string;

  @Column({ name: 'module_metadata', type: 'jsonb', nullable: true, default: () => "'{}'" })
  moduleMetadata: Record<string, any> | null;

  @Index('idx_requests_date')
  @Column({ type: 'varchar', length: 20, default: () => 'CURRENT_DATE' })
  date: string;

  @Index('idx_requests_part_id')
  @Column({ name: 'part_id', type: 'varchar', length: 100, nullable: true })
  partId: string | null;

  @ManyToOne(() => PartMaster, (part) => part.requests, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'part_id' })
  part: PartMaster | null;

  @Index('idx_requests_part_name')
  @Column({ name: 'part_name', type: 'varchar', length: 255 })
  partName: string;

  @Index('idx_requests_part_number')
  @Column({ name: 'part_number', type: 'varchar', length: 255 })
  partNumber: string;

  @Index('idx_requests_created_by')
  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @Index('idx_requests_assigned_inspector')
  @Column({ name: 'assigned_inspector_id', type: 'varchar', length: 100, nullable: true })
  assignedInspectorId: string | null;

  @Column({ name: 'assigned_inspector_name', type: 'varchar', length: 255, nullable: true })
  assignedInspectorName: string | null;

  @ManyToOne(() => User, (user) => user.assignedRequests, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'assigned_inspector_id' })
  assignedInspector: User | null;

  @Index('idx_requests_status')
  @Column({
    type: 'varchar',
    length: 50,
    default: RequestStatus.DRAFT,
  })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => AssignmentHistory, (hist) => hist.request)
  assignmentHistory: AssignmentHistory[];

  @OneToOne(() => InspectionReport, (report) => report.request)
  report: InspectionReport | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'req-' + randomUUID();
    }
    if (!this.date) {
      this.date = new Date().toISOString().slice(0, 10);
    }
  }
}

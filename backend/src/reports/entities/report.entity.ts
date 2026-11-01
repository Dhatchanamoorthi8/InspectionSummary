import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { InspectionRequest } from '../../requests/entities/request.entity';
import { ReportRevision } from './report-revision.entity';
import { QCStatus } from '../../common/enums/qc-status.enum';
import { User } from '../../users/entities/user.entity';

export const ColumnNumericTransformer = {
  to: (data: number | null): number | null => data,
  from: (data: string | null): number | null => (data !== null ? parseFloat(data) : null),
};

@Entity('inspection_reports')
@Check('chk_reports_non_negative', '"bhn" >= 0 AND "ys" >= 0 AND "uts" >= 0 AND "elongation" >= 0')
export class InspectionReport {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_reports_request_id')
  @Column({ name: 'request_id', type: 'varchar', length: 100, unique: true })
  requestId: string;

  @Index('idx_reports_module_type')
  @Column({ name: 'module_type', type: 'varchar', length: 50, default: 'HEAT_TREATMENT' })
  moduleType: string;

  @Column({ name: 'module_data', type: 'jsonb', nullable: true, default: () => "'{}'" })
  moduleData: Record<string, any> | null;

  @Column({ name: 'evaluation_summary', type: 'jsonb', nullable: true, default: () => "'{}'" })
  evaluationSummary: Record<string, any> | null;

  @OneToOne(() => InspectionRequest, (req) => req.report, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: InspectionRequest;

  @Column({ name: 'request_number', type: 'varchar', length: 100 })
  requestNumber: string;

  @Column({ name: 'part_name', type: 'varchar', length: 255 })
  partName: string;

  @Column({ name: 'part_number', type: 'varchar', length: 255 })
  partNumber: string;

  @Index('idx_reports_report_date')
  @Column({ name: 'report_date', type: 'varchar', length: 20 })
  reportDate: string;

  @Index('idx_reports_batch_number')
  @Column({ name: 'heat_batch_number', type: 'varchar', length: 100 })
  heatBatchNumber: string;

  @Column({ type: 'varchar', length: 100 })
  furnace: string;

  @Column({ name: 'auto_report', type: 'varchar', length: 100 })
  autoReport: string;

  @Column({ name: 'sample_batch_date', type: 'varchar', length: 20 })
  sampleBatchDate: string;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  bhn: number;

  @Column({
    name: 'hardness_status',
    type: 'varchar',
    length: 20,
  })
  hardnessStatus: QCStatus;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  ys: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  uts: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: ColumnNumericTransformer,
  })
  elongation: number;

  @Column({
    name: 'mechanical_status',
    type: 'varchar',
    length: 20,
  })
  mechanicalStatus: QCStatus;

  @Index('idx_reports_overall_status')
  @Column({
    name: 'overall_status',
    type: 'varchar',
    length: 20,
  })
  overallStatus: QCStatus;

  @Column({ name: 'inspector_remarks', type: 'text', nullable: true, default: '' })
  inspectorRemarks: string;

  @Index('idx_reports_inspector_id')
  @Column({ name: 'inspector_id', type: 'varchar', length: 100 })
  inspectorId: string;

  @ManyToOne(() => User, (user) => user.reports, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'inspector_id' })
  inspector: User | null;

  @Column({ name: 'inspector_name', type: 'varchar', length: 255 })
  inspectorName: string;

  @Column({ name: 'inspector_signature_snapshot', type: 'text' })
  inspectorSignatureSnapshot: string;

  @CreateDateColumn({ name: 'submission_timestamp', type: 'timestamptz' })
  submissionTimestamp: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ReportRevision, (revision) => revision.report)
  revisions: ReportRevision[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'rep-' + randomUUID();
    }
  }
}

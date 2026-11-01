import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { InspectionReport } from './report.entity';

@Entity('report_revisions')
@Unique('uq_report_revision', ['reportId', 'revisionNumber'])
export class ReportRevision {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_revisions_report_id')
  @Column({ name: 'report_id', type: 'varchar', length: 100 })
  reportId: string;

  @ManyToOne(() => InspectionReport, (report) => report.revisions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report: InspectionReport;

  @Column({ name: 'revision_number', type: 'int' })
  revisionNumber: number;

  @Column({ name: 'revised_by', type: 'varchar', length: 100 })
  revisedBy: string;

  @CreateDateColumn({ name: 'revised_at', type: 'timestamptz' })
  revisedAt: Date;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'previous_snapshot', type: 'jsonb' })
  previousSnapshot: Record<string, any>;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'rev-' + randomUUID();
    }
  }
}

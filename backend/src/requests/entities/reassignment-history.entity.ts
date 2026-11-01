import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { InspectionRequest } from './request.entity';

@Entity('reassignment_history')
export class AssignmentHistory {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_reassign_request_id')
  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId: string;

  @ManyToOne(() => InspectionRequest, (req) => req.assignmentHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: InspectionRequest;

  @Column({ name: 'assigned_inspector_id', type: 'varchar', length: 100 })
  assignedInspectorId: string;

  @Column({ name: 'assigned_inspector_name', type: 'varchar', length: 255 })
  assignedInspectorName: string;

  @Column({ name: 'assigned_by', type: 'varchar', length: 100 })
  assignedBy: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'previous_inspector_id', type: 'varchar', length: 100, nullable: true })
  previousInspectorId: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'asg-' + randomUUID();
    }
  }
}

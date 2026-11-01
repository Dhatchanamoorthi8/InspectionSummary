import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';

@Entity('audit_logs')
@Index('idx_audit_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_audit_timestamp')
  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;

  @Index('idx_audit_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Index('idx_audit_action')
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId: string;

  @Column({ name: 'previous_value', type: 'jsonb', nullable: true })
  previousValue: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'aud-' + randomUUID();
    }
  }
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserRole } from '../../common/enums/role.enum';
import { PartMaster } from '../../parts/entities/part.entity';
import { InspectionRequest } from '../../requests/entities/request.entity';
import { InspectionReport } from '../../reports/entities/report.entity';

@Entity('users')
@Index('idx_users_active_role', ['isActive', 'role'])
export class User {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_users_username')
  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Index('idx_users_role')
  @Column({
    type: 'varchar',
    length: 50,
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'can_manage_users', type: 'boolean', default: false })
  canManageUsers: boolean;

  @Column({ name: 'custom_permissions', type: 'jsonb', nullable: true, default: () => "'[]'" })
  customPermissions: string[] | null;

  @Column({ name: 'signature_data', type: 'text', nullable: true })
  signatureData: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PartMaster, (part) => part.createdByUser)
  createdParts: PartMaster[];

  @OneToMany(() => InspectionRequest, (req) => req.createdBy)
  createdRequests: InspectionRequest[];

  @OneToMany(() => InspectionRequest, (req) => req.assignedInspector)
  assignedRequests: InspectionRequest[];

  @OneToMany(() => InspectionReport, (report) => report.inspector)
  reports: InspectionReport[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'usr-' + randomUUID();
    }
  }
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../../users/entities/user.entity';
import { InspectionRequest } from '../../requests/entities/request.entity';

@Entity('part_master')
@Unique('uq_part_name_part_number', ['partName', 'partNumber'])
export class PartMaster {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Index('idx_part_master_name')
  @Column({ name: 'part_name', type: 'varchar', length: 255 })
  partName: string;

  @Index('idx_part_master_number')
  @Column({ name: 'part_number', type: 'varchar', length: 255 })
  partNumber: string;

  @Index('idx_part_master_active')
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_user_id', type: 'varchar', length: 100, nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, (user) => user.createdParts, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => InspectionRequest, (req) => req.part)
  requests: InspectionRequest[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = 'prt-' + randomUUID();
    }
  }
}

import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';
import { PartMaster } from '../../parts/entities/part.entity';

const SAMPLE_1X1_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export async function seedDatabase() {
  console.log('--- Initializing Database Connection ---');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log('Database connected successfully.');

  // Synchronize schema (re-creates schema based on entities)
  console.log('Synchronizing schema...');
  await AppDataSource.synchronize(false);
  console.log('Schema synchronized.');

  const userRepo = AppDataSource.getRepository(User);
  const partRepo = AppDataSource.getRepository(PartMaster);

  console.log('--- Seeding Users ---');
  const saltRounds = 10;
  const hashPassword123 = await bcrypt.hash('Password123!', saltRounds);

  const seedUsers = [
    {
      id: 'usr-pe-1',
      username: 'pe_john',
      passwordHash: hashPassword123,
      fullName: 'John Master (PE)',
      role: UserRole.PRODUCTION_ENGINEER,
      canManageUsers: true,
      isActive: true,
      signatureData: SAMPLE_1X1_PNG,
    },
    {
      id: 'usr-pe-2',
      username: 'pe_mary',
      passwordHash: hashPassword123,
      fullName: 'Mary Engineer (PE)',
      role: UserRole.PRODUCTION_ENGINEER,
      canManageUsers: false,
      isActive: true,
      signatureData: null,
    },
    {
      id: 'usr-qi-1',
      username: 'qi_david',
      passwordHash: hashPassword123,
      fullName: 'David Inspector (QI)',
      role: UserRole.QUALITY_INSPECTOR,
      canManageUsers: false,
      isActive: true,
      signatureData: SAMPLE_1X1_PNG,
    },
    {
      id: 'usr-qi-2',
      username: 'qi_sarah',
      passwordHash: hashPassword123,
      fullName: 'Sarah Inspector (QI)',
      role: UserRole.QUALITY_INSPECTOR,
      canManageUsers: false,
      isActive: true,
      signatureData: SAMPLE_1X1_PNG,
    },
    {
      id: 'usr-qi-inactive',
      username: 'qi_inactive',
      passwordHash: hashPassword123,
      fullName: 'Inactive Inspector',
      role: UserRole.QUALITY_INSPECTOR,
      canManageUsers: false,
      isActive: false,
      signatureData: null,
    },
    {
      id: 'usr-pe-admin',
      username: 'pe_admin',
      passwordHash: hashPassword123,
      fullName: 'Production Admin',
      role: UserRole.PRODUCTION_ENGINEER,
      canManageUsers: true,
      isActive: true,
      signatureData: null,
    },
    {
      id: 'usr-pe-user',
      username: 'pe_user',
      passwordHash: hashPassword123,
      fullName: 'Production Engineer User',
      role: UserRole.PRODUCTION_ENGINEER,
      canManageUsers: false,
      isActive: true,
      signatureData: null,
    },
    {
      id: 'usr-qi-alice',
      username: 'inspector_alice',
      passwordHash: hashPassword123,
      fullName: 'Alice Inspector',
      role: UserRole.QUALITY_INSPECTOR,
      canManageUsers: false,
      isActive: true,
      signatureData: SAMPLE_1X1_PNG,
    },
    {
      id: 'usr-qi-bob',
      username: 'inspector_bob',
      passwordHash: hashPassword123,
      fullName: 'Bob Inspector',
      role: UserRole.QUALITY_INSPECTOR,
      canManageUsers: false,
      isActive: true,
      signatureData: SAMPLE_1X1_PNG,
    },
  ];

  for (const u of seedUsers) {
    let existing = await userRepo.findOne({ where: { username: u.username } });
    if (!existing) {
      existing = userRepo.create(u);
      await userRepo.save(existing);
      console.log(`+ Created user: ${u.username} (${u.role}) [${u.id}]`);
    } else {
      existing.id = u.id;
      existing.passwordHash = u.passwordHash;
      existing.fullName = u.fullName;
      existing.role = u.role;
      existing.canManageUsers = u.canManageUsers;
      existing.isActive = u.isActive;
      existing.signatureData = u.signatureData;
      await userRepo.save(existing);
      console.log(`* Updated user: ${u.username}`);
    }
  }

  console.log('--- Seeding Part Master ---');
  const sampleParts = [
    { id: 'prt-1', partName: 'Axle Shaft', partNumber: 'AX-1001' },
    { id: 'prt-2', partName: 'Axle Shaft', partNumber: 'AX-1002' },
    { id: 'prt-3', partName: 'Turbine Blade', partNumber: 'TB-2001' },
    { id: 'prt-4', partName: 'Turbine Blade', partNumber: 'TB-2002' },
    { id: 'prt-5', partName: 'Turbine Blade', partNumber: 'TB-2003' },
    { id: 'prt-6', partName: 'Camshaft', partNumber: 'CS-3001' },
    { id: 'prt-7', partName: 'Main Drive Shaft', partNumber: 'MDS-1001' },
    { id: 'prt-8', partName: 'Main Drive Shaft', partNumber: 'MDS-1002' },
    { id: 'prt-9', partName: 'Pinion Gear', partNumber: 'PG-2001' },
    { id: 'prt-10', partName: 'Pinion Gear', partNumber: 'PG-2002' },
    { id: 'prt-11', partName: 'Heavy Duty Crankshaft', partNumber: 'HDC-4001' },
    { id: 'prt-12', partName: 'Cylinder Liner', partNumber: 'CL-5001' },
  ];

  for (const p of sampleParts) {
    const existing = await partRepo.findOne({
      where: { partName: p.partName, partNumber: p.partNumber },
    });
    if (!existing) {
      const part = partRepo.create({
        id: p.id,
        partName: p.partName,
        partNumber: p.partNumber,
        isActive: true,
      });
      await partRepo.save(part);
      console.log(`+ Created part: ${p.partName} - ${p.partNumber} [${p.id}]`);
    } else {
      console.log(`* Part exists: ${p.partName} - ${p.partNumber}`);
    }
  }

  console.log('--- Seeding Completed Successfully ---');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed with error:', err);
      process.exit(1);
    });
}

process.env.DATABASE_URL = 'file:./dev.db';
import { PrismaClient } from '../client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Roles ─────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: {
          customers: ['read', 'create', 'update', 'delete'],
          billing: ['read', 'create', 'update', 'delete', 'generate'],
          collections: ['read', 'create', 'update', 'approve'],
          accounting: ['read', 'create', 'update', 'delete'],
          hr: ['read', 'create', 'update', 'delete'],
          tickets: ['read', 'create', 'update', 'delete', 'assign'],
          inventory: ['read', 'create', 'update', 'delete'],
          mikrotik: ['read', 'create', 'update', 'delete', 'sync'],
          notifications: ['read', 'create', 'send'],
          reports: ['read', 'export'],
          settings: ['read', 'update'],
          users: ['read', 'create', 'update', 'delete'],
          audit: ['read'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        displayName: 'Admin',
        description: 'Administrative access without system settings',
        isSystem: true,
        permissions: {
          customers: ['read', 'create', 'update', 'delete'],
          billing: ['read', 'create', 'update', 'generate'],
          collections: ['read', 'create', 'update', 'approve'],
          accounting: ['read', 'create', 'update'],
          hr: ['read', 'create', 'update'],
          tickets: ['read', 'create', 'update', 'assign'],
          inventory: ['read', 'create', 'update'],
          mikrotik: ['read', 'create', 'update', 'sync'],
          notifications: ['read', 'create', 'send'],
          reports: ['read', 'export'],
          settings: ['read'],
          users: ['read', 'create', 'update'],
          audit: ['read'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Operational management access',
        isSystem: true,
        permissions: {
          customers: ['read', 'create', 'update'],
          billing: ['read', 'create', 'update', 'generate'],
          collections: ['read', 'approve'],
          accounting: ['read'],
          hr: ['read'],
          tickets: ['read', 'create', 'update', 'assign'],
          inventory: ['read', 'create', 'update'],
          mikrotik: ['read', 'sync'],
          notifications: ['read', 'send'],
          reports: ['read', 'export'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'ACCOUNTANT' },
      update: {},
      create: {
        name: 'ACCOUNTANT',
        displayName: 'Accountant',
        description: 'Financial operations access',
        isSystem: true,
        permissions: {
          customers: ['read'],
          billing: ['read', 'create', 'update'],
          collections: ['read', 'approve'],
          accounting: ['read', 'create', 'update'],
          hr: ['read'],
          reports: ['read', 'export'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'COLLECTOR' },
      update: {},
      create: {
        name: 'COLLECTOR',
        displayName: 'Bill Collector',
        description: 'Field collection access',
        isSystem: true,
        permissions: {
          customers: ['read'],
          billing: ['read'],
          collections: ['read', 'create'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'TECHNICIAN' },
      update: {},
      create: {
        name: 'TECHNICIAN',
        displayName: 'Technician',
        description: 'Technical support access',
        isSystem: true,
        permissions: {
          customers: ['read'],
          tickets: ['read', 'update'],
          inventory: ['read'],
          mikrotik: ['read'],
        },
      },
    }),
    prisma.role.upsert({
      where: { name: 'VIEWER' },
      update: {},
      create: {
        name: 'VIEWER',
        displayName: 'Viewer',
        description: 'Read-only access',
        isSystem: true,
        permissions: {
          customers: ['read'],
          billing: ['read'],
          reports: ['read'],
        },
      },
    }),
  ]);

  console.log(`  ✅ Created ${roles.length} roles`);

  // ─── Create Default Admin User ────────────────
  const adminRole = roles[0]; // SUPER_ADMIN
  const passwordHash = '$2b$10$A0ElNDwLivU9xLKm1KttfeWCXXMe/QvSZ715OOCcHiAaPboKI98gu';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@isp-erp.local' },
    update: {},
    create: {
      email: 'admin@isp-erp.local',
      name: 'System Admin',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log(`  ✅ Created admin user: ${admin.email}`);



  // ─── Create Default Ledger Accounts ───────────
  const ledgers = await Promise.all([
    prisma.ledgerAccount.upsert({
      where: { name: 'Cash' },
      update: {},
      create: { name: 'Cash', code: '1001', type: 'ASSET', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Bank' },
      update: {},
      create: { name: 'Bank', code: '1002', type: 'ASSET', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Accounts Receivable' },
      update: {},
      create: { name: 'Accounts Receivable', code: '1100', type: 'ASSET', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Internet Revenue' },
      update: {},
      create: { name: 'Internet Revenue', code: '4001', type: 'REVENUE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Installation Revenue' },
      update: {},
      create: { name: 'Installation Revenue', code: '4002', type: 'REVENUE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Bandwidth Expense' },
      update: {},
      create: { name: 'Bandwidth Expense', code: '5001', type: 'EXPENSE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Electricity Expense' },
      update: {},
      create: { name: 'Electricity Expense', code: '5002', type: 'EXPENSE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Salary Expense' },
      update: {},
      create: { name: 'Salary Expense', code: '5003', type: 'EXPENSE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Maintenance Expense' },
      update: {},
      create: { name: 'Maintenance Expense', code: '5004', type: 'EXPENSE', isSystem: true },
    }),
    prisma.ledgerAccount.upsert({
      where: { name: 'Vendor Payables' },
      update: {},
      create: { name: 'Vendor Payables', code: '2001', type: 'LIABILITY', isSystem: true },
    }),
  ]);

  console.log(`  ✅ Created ${ledgers.length} ledger accounts`);

  // ─── Create Sequence Counters ─────────────────
  await Promise.all([
    prisma.sequenceCounter.upsert({
      where: { name: 'customer_id' },
      update: {},
      create: { name: 'customer_id', current: 0 },
    }),
    prisma.sequenceCounter.upsert({
      where: { name: 'invoice_number' },
      update: {},
      create: { name: 'invoice_number', current: 0 },
    }),
    prisma.sequenceCounter.upsert({
      where: { name: 'ticket_number' },
      update: {},
      create: { name: 'ticket_number', current: 0 },
    }),
    prisma.sequenceCounter.upsert({
      where: { name: 'receipt_number' },
      update: {},
      create: { name: 'receipt_number', current: 0 },
    }),
    prisma.sequenceCounter.upsert({
      where: { name: 'journal_entry' },
      update: {},
      create: { name: 'journal_entry', current: 0 },
    }),
  ]);

  console.log('  ✅ Created sequence counters');
  console.log('\n🎉 Seeding complete!');
  console.log('   Default admin login: admin@isp-erp.local / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

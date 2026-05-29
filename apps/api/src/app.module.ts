import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AreasModule } from './modules/areas/areas.module';
import { PackagesModule } from './modules/packages/packages.module';
import { MikrotikModule } from './modules/mikrotik/mikrotik.module';
import { BillingModule } from './modules/billing/billing.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LeakageModule } from './modules/leakage/leakage.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { HrModule } from './modules/hr/hr.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CustomersModule,
    AreasModule,
    PackagesModule,
    MikrotikModule,
    BillingModule,
    CollectionsModule,
    AccountingModule,
    DashboardModule,
    LeakageModule,
    TicketsModule,
    InventoryModule,
    HrModule,
    NotificationsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}

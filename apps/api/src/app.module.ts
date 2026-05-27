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
  ],
})
export class AppModule {}

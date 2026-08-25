import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // load .env manually, since the CLI isn't Next.js

import { Invoice } from './app/lib/entities/invoice.entity';
import { Customer } from './app/lib/entities/customer.entity';
import { User } from './app/lib/entities/user.entity';
import { Revenue } from './app/lib/entities/revenue.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.TYPEORM_MIGRATION_URL ?? process.env.POSTGRES_URL,
  synchronize: false,
  entities: [User, Customer, Invoice, Revenue],
  migrations: ['migrations/*.ts'],
});
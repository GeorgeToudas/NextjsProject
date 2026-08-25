import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../typeorm.config';
import { User } from './entities/user.entity';
import { Customer } from './entities/customer.entity';
import { Invoice } from './entities/invoice.entity';
import { Revenue } from './entities/revenue.entity';
import { users, customers, invoices, revenue } from './placeholder-data';

async function seedUsers(manager: EntityManager) {
  const rows = await Promise.all(
    users.map(async (user) => ({
      ...user,
      password: await bcrypt.hash(user.password, 10),
    })),
  );
  await manager.createQueryBuilder().insert().into(User).values(rows).orIgnore().execute();
}

async function seedCustomers(manager: EntityManager) {
  const rows = customers.map(({ id, name, email, image_url }) => ({
    id,
    name,
    email,
    imageUrl: image_url,
  }));
  await manager.createQueryBuilder().insert().into(Customer).values(rows).orIgnore().execute();
}

async function seedInvoices(manager: EntityManager) {
  const rows = invoices.map((invoice) => ({
    customerId: invoice.customer_id,
    amount: invoice.amount,
    status: invoice.status,
    date: invoice.date,
  }));
  await manager.createQueryBuilder().insert().into(Invoice).values(rows).orIgnore().execute();
}

async function seedRevenue(manager: EntityManager) {
  await manager.createQueryBuilder().insert().into(Revenue).values(revenue).orIgnore().execute();
}

async function main() {
  await AppDataSource.initialize();

  await AppDataSource.transaction(async (manager) => {
    await seedUsers(manager);
    await seedCustomers(manager);
    await seedInvoices(manager);
    await seedRevenue(manager);
  });

  console.log('Database seeded successfully');
  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await AppDataSource.destroy();
  process.exit(1);
});

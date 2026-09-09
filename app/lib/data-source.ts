import 'reflect-metadata';
import { DataSource } from 'typeorm';

// TypeORM entities — import yours here as you create them
import { Invoice } from './entities/invoice.entity';
import { Customer } from './entities/customer.entity';
import { User } from './entities/user.entity';
import { Revenue } from './entities/revenue.entity';

// Extend the global type so TS knows about our cached fields
declare global {
  // eslint-disable-next-line no-var
  var __typeorm_dataSource: DataSource | undefined;
  // eslint-disable-next-line no-var
  var __typeorm_initPromise: Promise<DataSource> | undefined;
}

function buildDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: process.env.POSTGRES_URL,
    synchronize: false, // never let TypeORM auto-alter your schema
    logging: process.env.NODE_ENV === 'development',
    entities: [Invoice, Customer, User, Revenue],
    // migrations: [__dirname + '/migrations/*.{ts,js}'], // add if/when you use migrations
  });
}

// Reuse across hot reloads: check globalThis before creating anything new
const dataSource = globalThis.__typeorm_dataSource ?? buildDataSource();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__typeorm_dataSource = dataSource;
}

/**
 * Call this before running any query. Safe to call many times —
 * it only actually initializes once, and concurrent callers await
 * the same in-flight promise instead of racing to initialize twice.
 */
export async function getDataSource(): Promise<DataSource> {
  if (dataSource.isInitialized) {
    return dataSource;
  }

  // Guard against concurrent requests both trying to initialize at once
  if (!globalThis.__typeorm_initPromise) {
    globalThis.__typeorm_initPromise = dataSource.initialize().catch((error) => {
      // Don't cache a failed attempt — let the next call retry from scratch
      globalThis.__typeorm_initPromise = undefined;
      throw error;
    });
  }

  await globalThis.__typeorm_initPromise;
  return dataSource;
}

/**
 * Next.js compiles Route Handlers and Server Components into separate
 * module graphs ("layers"), so this file — and the entity classes it
 * imports — gets a distinct instance per layer even though the cached
 * DataSource (shared via globalThis) was built from just one of them.
 * Passing an entity class straight to getRepository() breaks across
 * layers because TypeORM matches class targets by exact reference.
 * Looking the entity up by its name (a plain string) sidesteps that,
 * since TypeORM also matches metadata by name.
 */
export async function getUserRepository() {
  const ds = await getDataSource();
  return ds.getRepository<User>('User');
}
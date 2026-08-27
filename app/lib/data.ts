import postgres from 'postgres';
import { Invoice } from './entities/invoice.entity';
import { Customer } from './entities/customer.entity';
import { Revenue } from './entities/revenue.entity';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
} from './definitions';
import { formatCurrency } from './utils';
import { getDataSource } from './data-sourse';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const ds = await getDataSource();
    const data = await ds.getRepository(Revenue).find();

    /*const data = await sql<Revenue[]>`SELECT * FROM revenue`;*/

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const ds=await getDataSource();
    const rows= await ds
      .getRepository(Invoice)
      .createQueryBuilder('invoices')
      .innerJoin('invoices.customer','customers')
      .select([
        'invoices.id',
        'invoices.amount',
        'customers.name',
        'customers.imageUrl',
        'customers.email',
      ])
      .orderBy('invoices.date','DESC')
      .limit(5)
      .getRawMany();
      

    
    /*const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;
    */
    const latestInvoices: LatestInvoiceRaw[]=rows.map((row)=>({
      id: row.invoices_id,
      amount: row.invoices_amount,
      name: row.customers_name,
      image_url: row.customers_image_url,
      email: row.customers_email,
    }))

    return latestInvoices.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const ds =await getDataSource();
    const invoiceRepo= ds.getRepository(Invoice);
    const customerRepo=ds.getRepository(Customer);
    
    const invoiceCountPromise = invoiceRepo.count();
    const customerCountPromise = customerRepo.count();
    const invoiceStatusPromise=invoiceRepo
      .createQueryBuilder('invoices')
      .select(
        'SUM(CASE WHEN invoices.status = :paid THEN invoices.amount ELSE 0 END)',
        'paid',
      )
      .addSelect(
        'SUM(CASE WHEN invoices.status = :pending THEN invoices.amount ELSE 0 END)',
        'pending',
      )
      .setParameters({ paid: 'paid', pending: 'pending' })
      .getRawOne();

    const [numberOfInvoices, numberOfCustomers, status] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);
    /*
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);*/
    const totalPaidInvoices = formatCurrency(status.paid ?? '0');
    const totalPendingInvoices = formatCurrency(status.pending ?? '0');
    
    /*
    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');
    */
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;


export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const searchTerm = `%${query}%`;

  try {
    const ds = await getDataSource();
    const rows = await ds
      .getRepository(Invoice)
      .createQueryBuilder('invoices')
      .innerJoin('invoices.customer', 'customers')
      .select([
        'invoices.id',
        'invoices.customerId',
        'invoices.amount',
        'invoices.date',
        'invoices.status',
        'customers.name',
        'customers.email',
        'customers.imageUrl',
      ])
      .where('customers.name ILIKE :search', { search: searchTerm })
      .orWhere('customers.email ILIKE :search', { search: searchTerm })
      .orWhere('CAST(invoices.amount AS TEXT) ILIKE :search', {
        search: searchTerm,
      })
      .orWhere('CAST(invoices.date AS TEXT) ILIKE :search', {
        search: searchTerm,
      })
      .orWhere('invoices.status ILIKE :search', { search: searchTerm })
      .orderBy('invoices.date', 'DESC')
      .limit(ITEMS_PER_PAGE)
      .offset(offset)
      .getRawMany();

    const invoices: InvoicesTable[] = rows.map((row) => ({
      id: row.invoices_id,
      customer_id: row.invoices_customer_id,
      amount: row.invoices_amount,
      date: row.invoices_date,
      status: row.invoices_status,
      name: row.customers_name,
      email: row.customers_email,
      image_url: row.customers_image_url,
    }));
    /*const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;*/

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  const searchTerm = `%${query}%`;
  try {
    const ds = await getDataSource();
    const count = await ds
      .getRepository(Invoice)
      .createQueryBuilder('invoices')
      .innerJoin('invoices.customer', 'customers')
      .where('customers.name ILIKE :search', { search: searchTerm })
      .orWhere('customers.email ILIKE :search', { search: searchTerm })
      .orWhere('CAST(invoices.amount AS TEXT) ILIKE :search', {
        search: searchTerm,
      })
      .orWhere('CAST(invoices.date AS TEXT) ILIKE :search', {
        search: searchTerm,
      })
      .orWhere('invoices.status ILIKE :search', { search: searchTerm })
      .getCount();

    return Math.ceil(count / ITEMS_PER_PAGE);
    
    /*const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;*/
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));
    console.log(invoice);
    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

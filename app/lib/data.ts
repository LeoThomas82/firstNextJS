// import { sql } from '@vercel/postgres';
import connection from './db';

import {
//  CustomerField,
//  CustomersTableType,
//  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
//  LatestInvoice,
//  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
//import { validateHeaderValue } from 'http';

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    //const data = await sql<Revenue>`SELECT * FROM revenue`;
    //return data.rows;
    const data = await connection.query(`SELECT * FROM revenue`);
    return data[0];    // console.log('Data fetch completed after 3 seconds.');
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    //const data = await sql<LatestInvoiceRaw>`
    //  SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //  FROM invoices
    //  JOIN customers ON invoices.customer_id = customers.id
    //  ORDER BY invoices.date DESC
    //  LIMIT 5`;

      const  data = await connection.query(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`);

      //console.log(data[0]);

      const latestInvoices: LatestInvoiceRaw[] = data[0].map((invoice:any)=>({
        amount:invoice.amount,
        name:invoice.name,
        image_url:invoice.image_url,
        email:invoice.email,
        id:invoice.id
      }));

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const formattedInvoices = latestInvoices.map((invoice) => ({
        ...invoice,
        amount: formatCurrency(invoice.amount),
      }));

      console.log(formattedInvoices);

      return formattedInvoices;
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
    //const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    //const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    //const invoiceStatusPromise = sql`SELECT
    //     SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //     SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //     FROM invoices`;

    /*
    const invoiceCountPromise = await connection.query(`SELECT COUNT(*) AS count FROM invoices`);
    const customerCountPromise = await connection.query(`SELECT COUNT(*) AS count FROM customers`);
    const invoiceStatusPromise = await connection.query(`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`);
      const numberOfInvoices = Number(invoiceCountPromise[0][0].count ?? '0');
      const numberOfCustomers = Number(customerCountPromise[0][0].count ?? '0');
      const totalPaidInvoices = formatCurrency(invoiceStatusPromise[0][0].paid ?? '0');
      const totalPendingInvoices = formatCurrency(invoiceStatusPromise[0][0].pending ?? '0');

    */

      await new Promise((resolve) => setTimeout(resolve, 3000));

    const invoiceCountPromise = connection.query(`SELECT COUNT(*) AS count FROM invoices`);
    const customerCountPromise = await connection.query(`SELECT COUNT(*) AS count FROM customers`);
    const invoiceStatusPromise = await connection.query(`SELECT
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
      FROM invoices`);
    
      const data = await Promise.all([
        invoiceCountPromise,
        customerCountPromise,
        invoiceStatusPromise,
      ]);

    const numberOfInvoices = Number(data[0][0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0][0].pending ?? '0');

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

  try {
    //const invoices = await sql<InvoicesTable>`
    const data = await connection.query(`
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
        customers.name LIKE ? OR
        customers.email LIKE ? OR
        CAST(invoices.amount AS CHAR) LIKE ? OR
        CAST(invoices.date AS CHAR) LIKE ? OR
        invoices.status LIKE ? ORDER BY invoices.date DESC LIMIT ? OFFSET ?`, [`%${query}%`, 
        `%${query}%`, 
        `%${query}%`, 
        `%${query}%`, 
        `%${query}%`, 
        ITEMS_PER_PAGE,
        offset
      ]);

    const invoices: InvoicesTable[] = data[0].map((invoice:any)=>({
      id:invoice.id,
      customer_id:invoice.customer_id,
      name:invoice.name,
      email:invoice.email,
      image_url:invoice.image_url,
      date:invoice.date,
      status:invoice.status,
      amount:invoice.amount
    }));

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    //const count = await sql`SELECT COUNT(*)
    const count = await connection.query(`SELECT COUNT(*) as Count
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name LIKE ? OR
      customers.email LIKE ? OR
      CAST(invoices.amount as char) LIKE ? OR
      CAST(invoices.date as char) LIKE ? OR
      invoices.status LIKE ?`, 
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

    console.log(count[0][0].Count);

    const totalPages = Math.ceil(Number(count[0][0].Count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    //const data = await sql<InvoiceForm>`
    const preData = await connection.query(`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `);
    
    const data = preData[0];

    const invoice = data.map((invoice:any) => ({
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
    //const data = await sql<CustomerField>`
    const data = await connection.query(`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `);

    const customers = data[0];
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    //const data = await sql<CustomersTableType>`
    const data = await connection.query(`
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
	  `);



    const customers = data.map((customer:any) => ({
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

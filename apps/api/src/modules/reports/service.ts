import type { EconomyReportQuery } from '@comunidad/shared';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { expenses, invoices } from '../../db/schema';

export interface ReportPeriod {
  from: string;
  to: string;
}

interface ExpenseRow {
  amount: string;
  status: string;
  category: string;
}

interface InvoiceRow {
  amount: string;
  status: string;
}

const cents = (value: string): number => Math.round(Number(value) * 100);
const euros = (value: number): string => (value / 100).toFixed(2);

/** Periodo por defecto: año natural en curso. */
export function resolvePeriod(query: EconomyReportQuery): ReportPeriod {
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: query.from ?? `${new Date().getFullYear()}-01-01`,
    to: query.to ?? today,
  };
}

async function fetchExpenseRows(
  db: Database,
  communityId: string,
  period: ReportPeriod,
): Promise<ExpenseRow[]> {
  return db
    .select({
      amount: expenses.amount,
      status: expenses.status,
      category: expenses.category,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.communityId, communityId),
        gte(expenses.incurredOn, period.from),
        lte(expenses.incurredOn, period.to),
      ),
    )
    .orderBy(asc(expenses.incurredOn));
}

async function fetchInvoiceRows(
  db: Database,
  communityId: string,
  period: ReportPeriod,
): Promise<InvoiceRow[]> {
  return db
    .select({ amount: invoices.amount, status: invoices.status })
    .from(invoices)
    .where(
      and(
        eq(invoices.communityId, communityId),
        gte(invoices.issuedOn, period.from),
        lte(invoices.issuedOn, period.to),
      ),
    )
    .orderBy(asc(invoices.issuedOn));
}

/** Resumen económico agregado (consultas SQL, nunca IA). */
export async function buildEconomyReport(
  db: Database,
  communityId: string,
  query: EconomyReportQuery,
): Promise<{
  period: ReportPeriod;
  report: {
    from: string;
    to: string;
    expenses: {
      count: number;
      total: string;
      paidTotal: string;
      pendingTotal: string;
      byCategory: Array<{ category: string; total: string }>;
    };
    invoices: { count: number; total: string; paidTotal: string };
  };
}> {
  const period = resolvePeriod(query);
  const [expenseRows, invoiceRows] = await Promise.all([
    fetchExpenseRows(db, communityId, period),
    fetchInvoiceRows(db, communityId, period),
  ]);

  let expenseTotal = 0;
  let expensePaid = 0;
  const byCategory = new Map<string, number>();
  for (const row of expenseRows) {
    const value = cents(row.amount);
    expenseTotal += value;
    if (row.status === 'paid') {
      expensePaid += value;
    }
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + value);
  }

  let invoiceTotal = 0;
  let invoicePaid = 0;
  for (const row of invoiceRows) {
    const value = cents(row.amount);
    invoiceTotal += value;
    if (row.status === 'paid') {
      invoicePaid += value;
    }
  }

  return {
    period,
    report: {
      from: period.from,
      to: period.to,
      expenses: {
        count: expenseRows.length,
        total: euros(expenseTotal),
        paidTotal: euros(expensePaid),
        pendingTotal: euros(expenseTotal - expensePaid),
        byCategory: [...byCategory.entries()]
          .map(([category, total]) => ({ category, total: euros(total) }))
          .sort((a, b) => Number(b.total) - Number(a.total)),
      },
      invoices: {
        count: invoiceRows.length,
        total: euros(invoiceTotal),
        paidTotal: euros(invoicePaid),
      },
    },
  };
}

/**
 * Escapa celdas para CSV. Además neutraliza la «inyección de fórmulas»
 * de Excel/Sheets (OWASP): un valor que empiece por =, +, - o @ se
 * interpretaría como fórmula al abrir el archivo; se antepone comilla.
 */
const escapeCsv = (value: string): string => {
  const sanitized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${sanitized.replaceAll('"', '""')}"`;
};

/** CSV del periodo (gastos y facturas) con BOM para Excel. */
export async function buildEconomyCsv(
  db: Database,
  communityId: string,
  query: EconomyReportQuery,
): Promise<string> {
  const period = resolvePeriod(query);
  const [expenseRows, invoiceRows] = await Promise.all([
    db
      .select({
        concept: expenses.concept,
        amount: expenses.amount,
        status: expenses.status,
        category: expenses.category,
        date: expenses.incurredOn,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.communityId, communityId),
          gte(expenses.incurredOn, period.from),
          lte(expenses.incurredOn, period.to),
        ),
      )
      .orderBy(asc(expenses.incurredOn)),
    db
      .select({
        concept: invoices.supplier,
        amount: invoices.amount,
        status: invoices.status,
        category: invoices.number,
        date: invoices.issuedOn,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.communityId, communityId),
          gte(invoices.issuedOn, period.from),
          lte(invoices.issuedOn, period.to),
        ),
      )
      .orderBy(asc(invoices.issuedOn)),
  ]);

  const lines = [
    ['tipo', 'concepto', 'importe', 'fecha', 'estado', 'categoria_o_factura']
      .map(escapeCsv)
      .join(','),
    ...expenseRows.map((row) =>
      ['gasto', row.concept, row.amount, row.date, row.status, row.category]
        .map(escapeCsv)
        .join(','),
    ),
    ...invoiceRows.map((row) =>
      ['factura', row.concept, row.amount, row.date, row.status, row.category]
        .map(escapeCsv)
        .join(','),
    ),
  ];

  // BOM: Excel en español abre bien los acentos con UTF-8 + BOM.
  return `\uFEFF${lines.join('\r\n')}`;
}

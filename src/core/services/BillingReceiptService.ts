/**
 * BillingReceiptService - PDF receipt and monthly statement generation
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 * @tier ENTERPRISE
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary (no direct DB in routes)
 * - jsPDF v4.2.0 for PDF generation
 * - All DECIMAL columns from mariadb parsed via parseFloat in mapRowToStatement
 * - Returns Buffer for Node.js HTTP response compatibility
 */

import { jsPDF } from 'jspdf';
import type { MonthlyStatementRow } from '@core/types/db-rows';
import type { BillingTransaction, MonthlyStatement } from '@core/types/subscription';

// Bizconekt brand orange: RGB(237, 100, 55)
const BRAND_R = 237;
const BRAND_G = 100;
const BRAND_B = 55;

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatMonth(statementMonth: string): string {
  // "2026-03" → "March 2026"
  const [year, month] = statementMonth.split('-');
  if (!year || !month) return statementMonth;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export class BillingReceiptService {
  /**
   * Generate a PDF receipt for a single billing transaction
   */
  generateTransactionReceipt(
    transaction: BillingTransaction,
    userName: string,
    userEmail: string
  ): Buffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background band
    doc.setFillColor(BRAND_R, BRAND_G, BRAND_B);
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Company name
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('BIZCONEKT', pageWidth / 2, 14, { align: 'center' });

    // "RECEIPT" subtitle
    doc.setFontSize(12);
    doc.text('RECEIPT', pageWidth / 2, 24, { align: 'center' });

    // Reset color
    doc.setTextColor(0, 0, 0);

    // Receipt details
    const receiptNumber = transaction.invoiceNumber || `RCP-${transaction.id}`;
    doc.setFontSize(10);
    doc.text(`Receipt #: ${receiptNumber}`, 14, 44);
    doc.text(`Date: ${formatDate(transaction.transactionDate)}`, 14, 52);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 58, pageWidth - 14, 58);

    // Bill to
    doc.setFontSize(11);
    doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
    doc.text('Bill To:', 14, 68);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(userName, 14, 76);
    doc.text(userEmail, 14, 84);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 90, pageWidth - 14, 90);

    // Line items header
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Description', 14, 100);
    doc.text('Amount', pageWidth - 14, 100, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 104, pageWidth - 14, 104);

    // Line item
    doc.setTextColor(0, 0, 0);
    doc.text(transaction.description || 'Service charge', 14, 114);
    doc.text(formatCurrency(transaction.amount), pageWidth - 14, 114, { align: 'right' });

    // Tax
    if (transaction.taxAmount > 0) {
      doc.setTextColor(80, 80, 80);
      doc.text('Tax:', 14, 124);
      doc.text(formatCurrency(transaction.taxAmount), pageWidth - 14, 124, { align: 'right' });
    }

    // Total
    doc.setDrawColor(150, 150, 150);
    doc.line(14, 130, pageWidth - 14, 130);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Total:', 14, 140);
    doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
    doc.text(formatCurrency(transaction.amount + transaction.taxAmount), pageWidth - 14, 140, { align: 'right' });

    // Payment status
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Payment Status: ${transaction.status.toUpperCase()}`, 14, 154);

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 270, pageWidth - 14, 270);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for your business!', pageWidth / 2, 278, { align: 'center' });
    doc.text('Bizconekt - bizconekt.com', pageWidth / 2, 284, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate a monthly statement PDF
   */
  generateMonthlyStatement(
    statement: MonthlyStatement,
    transactions: BillingTransaction[],
    userName: string,
    userEmail: string
  ): Buffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header background band
    doc.setFillColor(BRAND_R, BRAND_G, BRAND_B);
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Company name
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('BIZCONEKT', pageWidth / 2, 14, { align: 'center' });

    // "MONTHLY STATEMENT" subtitle
    doc.setFontSize(11);
    doc.text('MONTHLY STATEMENT', pageWidth / 2, 26, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    // Period
    doc.setFontSize(10);
    doc.text(`Period: ${formatMonth(statement.statementMonth)}`, 14, 48);

    // Bill to section
    doc.setFontSize(11);
    doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
    doc.text('Bill To:', 14, 60);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(userName, 14, 68);
    doc.text(userEmail, 14, 76);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 82, pageWidth - 14, 82);

    // Summary section header
    doc.setFontSize(11);
    doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
    doc.text('Charge Summary', 14, 92);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    let y = 102;
    const rightCol = pageWidth - 14;

    doc.text('Subscription Charges:', 14, y);
    doc.text(formatCurrency(statement.subscriptionCharges), rightCol, y, { align: 'right' });
    y += 9;

    doc.text('Add-on Charges:', 14, y);
    doc.text(formatCurrency(statement.addonCharges), rightCol, y, { align: 'right' });
    y += 9;

    if (statement.campaignBankDeposits > 0) {
      doc.text('Campaign Bank Deposits:', 14, y);
      doc.text(formatCurrency(statement.campaignBankDeposits), rightCol, y, { align: 'right' });
      y += 9;
    }

    if (statement.campaignBankSpend > 0) {
      doc.text('Campaign Bank Spend:', 14, y);
      doc.text(formatCurrency(statement.campaignBankSpend), rightCol, y, { align: 'right' });
      y += 9;
    }

    if (statement.refunds > 0) {
      doc.setTextColor(34, 139, 34);
      doc.text('Refunds:', 14, y);
      doc.text(`-${formatCurrency(statement.refunds)}`, rightCol, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 9;
    }

    if (statement.credits > 0) {
      doc.setTextColor(34, 139, 34);
      doc.text('Credits:', 14, y);
      doc.text(`-${formatCurrency(statement.credits)}`, rightCol, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 9;
    }

    if (statement.adjustments !== 0) {
      doc.text('Adjustments:', 14, y);
      doc.text(formatCurrency(statement.adjustments), rightCol, y, { align: 'right' });
      y += 9;
    }

    // Total divider
    doc.setDrawColor(150, 150, 150);
    doc.line(14, y + 2, pageWidth - 14, y + 2);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Total Charges:', 14, y);
    doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
    doc.text(formatCurrency(statement.totalCharges), rightCol, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;

    // Transaction detail table
    if (transactions.length > 0) {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(BRAND_R, BRAND_G, BRAND_B);
      doc.text('Transaction Detail', 14, y);
      doc.setTextColor(0, 0, 0);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Date', 14, y);
      doc.text('Description', 55, y);
      doc.text('Amount', rightCol, y, { align: 'right' });
      y += 5;

      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;

      doc.setTextColor(0, 0, 0);
      for (const tx of transactions) {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.text(formatDate(tx.transactionDate), 14, y);
        const desc = tx.description.length > 42 ? tx.description.substring(0, 42) + '...' : tx.description;
        doc.text(desc, 55, y);
        doc.text(formatCurrency(tx.amount), rightCol, y, { align: 'right' });
        y += 7;
      }
      y += 4;
    }

    // Balance summary
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text('Amount Paid:', 14, y);
    doc.setTextColor(34, 139, 34);
    doc.text(formatCurrency(statement.amountPaid), rightCol, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 9;

    doc.setFontSize(12);
    doc.text('Amount Due:', 14, y);
    doc.setTextColor(statement.amountDue > 0 ? BRAND_R : 34, statement.amountDue > 0 ? BRAND_G : 139, statement.amountDue > 0 ? BRAND_B : 34);
    doc.text(formatCurrency(statement.amountDue), rightCol, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 11, { align: 'center' });
    doc.text('Bizconekt - bizconekt.com', pageWidth / 2, pageHeight - 5, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Map a DB row to a MonthlyStatement domain object
   * All DECIMAL columns from mariadb are strings — must use parseFloat
   */
  mapRowToStatement(row: MonthlyStatementRow): MonthlyStatement {
    return {
      id: row.id,
      userId: row.user_id,
      statementMonth: row.statement_month,
      subscriptionCharges: parseFloat(row.subscription_charges) || 0,
      addonCharges: parseFloat(row.addon_charges) || 0,
      campaignBankDeposits: parseFloat(row.campaign_bank_deposits) || 0,
      campaignBankSpend: parseFloat(row.campaign_bank_spend) || 0,
      refunds: parseFloat(row.refunds) || 0,
      credits: parseFloat(row.credits) || 0,
      adjustments: parseFloat(row.adjustments) || 0,
      totalCharges: parseFloat(row.total_charges) || 0,
      openingBalance: parseFloat(row.opening_balance) || 0,
      closingBalance: parseFloat(row.closing_balance) || 0,
      amountPaid: parseFloat(row.amount_paid) || 0,
      amountDue: parseFloat(row.amount_due) || 0,
      status: row.status,
      pdfUrl: row.pdf_url,
      pdfGeneratedAt: row.pdf_generated_at ? new Date(row.pdf_generated_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

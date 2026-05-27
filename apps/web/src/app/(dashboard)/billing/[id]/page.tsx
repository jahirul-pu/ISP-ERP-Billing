'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlineArrowLeft,
  HiOutlineNoSymbol,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface InvoiceItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  billingMonth: string;
  subtotal: number;
  tax: number;
  discount: number;
  penalty: number;
  waiver: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  customer: {
    id: string;
    customerId: string;
    name: string;
    phone: string;
    address: string;
    pppoeUsername: string;
  };
  items: InvoiceItem[];
  payments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/billing/invoices/${id}`);
      if (res.data?.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load invoice details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'WAIVED' | 'CANCELLED' | 'PAID') => {
    const actionText = newStatus === 'WAIVED' ? 'waive' : newStatus === 'CANCELLED' ? 'cancel' : 'mark as paid';
    if (!confirm(`Are you sure you want to ${actionText} this invoice? This will adjust the customer's outstanding balance.`)) {
      return;
    }

    setUpdating(true);
    try {
      const res = await api.patch(`/billing/invoices/${id}`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Invoice updated to ${newStatus}`);
        fetchInvoice();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatMonth = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'badge-success';
      case 'UNPAID':
        return 'badge-danger';
      case 'PARTIALLY_PAID':
        return 'badge-primary';
      case 'OVERDUE':
        return 'badge-warning';
      case 'WAIVED':
      case 'CANCELLED':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Invoice not found.
      </div>
    );
  }

  const isResolvable = invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE';

  return (
    <div>
      {/* Header and Controls */}
      <div className="page-header no-print">
        <div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => router.push('/billing')}
          >
            <HiOutlineArrowLeft /> Back to Invoices
          </button>
          <h1 className="page-title">Invoice Detail: {invoice.invoiceNumber}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isResolvable && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--danger-600)', borderColor: 'var(--danger-200)' }}
                onClick={() => handleUpdateStatus('CANCELLED')}
                disabled={updating}
              >
                <HiOutlineNoSymbol /> Cancel
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleUpdateStatus('WAIVED')}
                disabled={updating}
              >
                Waive
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--success-600)', borderColor: 'var(--success-200)' }}
                onClick={() => handleUpdateStatus('PAID')}
                disabled={updating}
              >
                <HiOutlineCheckCircle /> Mark Paid
              </button>
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <HiOutlinePrinter /> Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Receipt Layout */}
      <div className="card invoice-receipt" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'white' }}>
        {/* Top Header branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--neutral-100)', paddingBottom: '24px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '18px'
              }}>
                E
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>ISP ERP BILLING</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Uttara Office: Sector 3, Road 2, Dhaka, Bangladesh<br />
              Support Phone: +880 1711 234567 | Email: billing@isp-erp.local
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${getStatusBadgeClass(invoice.status)}`} style={{ fontSize: '13px', padding: '6px 14px', marginBottom: '10px' }}>
              {invoice.status}
            </span>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Invoice Number:</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{invoice.invoiceNumber}</div>
          </div>
        </div>

        {/* Invoice Metadata Client info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-400)', fontWeight: 600, marginBottom: '6px' }}>Billed To:</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{invoice.customer.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Customer ID: {invoice.customer.customerId}<br />
              PPPoE User: {invoice.customer.pppoeUsername || '—'}<br />
              Phone: {invoice.customer.phone}<br />
              Address: {invoice.customer.address || 'Not Provided'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-400)', fontWeight: 600, marginBottom: '6px' }}>Invoice Details:</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Billing Month: <strong style={{ color: 'var(--text-primary)' }}>{formatMonth(invoice.billingMonth)}</strong><br />
              Date Generated: {new Date(invoice.createdAt).toLocaleDateString()}<br />
              Due Date: <strong style={{ color: 'var(--danger-500)' }}>{new Date(invoice.dueDate).toLocaleDateString()}</strong>
            </div>
          </div>
        </div>

        {/* Invoice Items table */}
        <div style={{ marginBottom: '32px' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--neutral-50)' }}>
                <th style={{ padding: '12px 16px' }}>No.</th>
                <th>Item Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {item.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Recap details and Payments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'start' }}>
          <div>
            {invoice.notes && (
              <div style={{ backgroundColor: 'var(--neutral-50)', padding: '16px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '20px' }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>Notes:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{invoice.notes}</span>
              </div>
            )}

            {invoice.payments.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Associated Payments:</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {invoice.payments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--neutral-200)' }}>
                      <span>Receipt: {p.receiptNumber} ({p.method})</span>
                      <strong>{formatCurrency(p.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VAT / Tax (+)</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            {invoice.penalty > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Penalties (+)</span>
                <span style={{ color: 'var(--danger-500)' }}>{formatCurrency(invoice.penalty)}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount (-)</span>
                <span style={{ color: 'var(--success-600)' }}>{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.waiver > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Waiver (-)</span>
                <span style={{ color: 'var(--success-600)' }}>{formatCurrency(invoice.waiver)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', borderTop: '1px solid var(--neutral-200)', paddingTop: '10px', marginTop: '4px' }}>
              <span>Total Bill</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(invoice.total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-600)' }}>
              <span>Amount Paid</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '15px',
              backgroundColor: invoice.dueAmount > 0 ? 'var(--danger-50)' : 'var(--success-50)',
              color: invoice.dueAmount > 0 ? 'var(--danger-600)' : 'var(--success-600)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginTop: '6px'
            }}>
              <span>Due Amount</span>
              <span>{formatCurrency(invoice.dueAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer info branding */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '60px', borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
          This is a computer generated invoice and does not require a physical signature. Thank you for your business.
        </div>
      </div>

      {/* Styled print rules to override dashboard during printing */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print,
          aside.sidebar,
          header.topbar,
          .breadcrumbs,
          .page-header {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            margin-top: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .invoice-receipt {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

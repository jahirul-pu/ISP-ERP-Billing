'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineFunnel,
  HiOutlineEye,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  billingMonth: string;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  dueDate: string;
  customer: {
    customerId: string;
    name: string;
    phone: string;
    pppoeUsername: string;
  };
}

interface Stats {
  financials: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  counts: {
    total: number;
    paid: number;
    unpaid: number;
    partiallyPaid: number;
    overdue: number;
    waived: number;
    cancelled: number;
  };
}

export default function BillingPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters state
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [billingMonth, setBillingMonth] = useState('');

  // Bulk Billing Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Set default billing month to current YYYY-MM
    const now = new Date();
    const formattedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setBulkMonth(formattedMonth);
    
    // Set default due date to 10th of current month
    const formattedDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
    setBulkDueDate(formattedDueDate);
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, status, billingMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/billing/invoices?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
      if (billingMonth) url += `&billingMonth=${billingMonth}`;

      const [invoicesRes, statsRes] = await Promise.all([
        api.get(url),
        api.get('/billing/invoices/stats'),
      ]);

      if (invoicesRes.data?.success) {
        setInvoices(invoicesRes.data.data);
        setTotalPages(invoicesRes.data.meta.totalPages);
        setTotalItems(invoicesRes.data.meta.totalItems);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load billing information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setBillingMonth('');
    setPage(1);
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMonth || !bulkDueDate) {
      toast.error('Please enter both Billing Month and Due Date');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/billing/invoices/generate', {
        billingMonth: bulkMonth,
        dueDate: new Date(bulkDueDate),
      });

      if (res.data?.success) {
        const stats = res.data.stats;
        toast.success(
          `Billing Run Complete!\nGenerated: ${stats.generated} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`,
          { duration: 6000 }
        );
        setIsBulkOpen(false);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete bulk billing generation');
    } finally {
      setGenerating(false);
    }
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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing &amp; Invoices</h1>
          <p className="page-subtitle">Manage customer invoices, track outstanding balances, and run monthly recurring bill generation.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsBulkOpen(true)}>
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Bulk Billing Run
          </button>
          <Link href="/billing/new" className="btn btn-primary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Create Invoice
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <HiOutlineDocumentText />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalInvoiced)}</div>
            <div className="kpi-card-label">Total Invoiced</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stats.counts.total} Invoices total
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineCurrencyDollar />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalCollected)}</div>
            <div className="kpi-card-label">Collected Payments</div>
            <span className="kpi-card-change positive">
              {stats.financials.totalInvoiced > 0 
                ? `${((stats.financials.totalCollected / stats.financials.totalInvoiced) * 100).toFixed(1)}%` 
                : '0%'
              } rate
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
              <HiOutlineClock />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalOutstanding)}</div>
            <div className="kpi-card-label">Outstanding Dues</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stats.counts.unpaid + stats.counts.partiallyPaid} Pending invoices
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
              <HiOutlineExclamationCircle />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalOverdue)}</div>
            <div className="kpi-card-label">Overdue Bills</div>
            <span className="kpi-card-change negative">
              {stats.counts.overdue} Overdue items
            </span>
          </div>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="card">
        {/* Filter bar */}
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} />
              Invoice List
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {invoices.length} of {totalItems} invoices
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Invoice #, Customer ID, Username or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="WAIVED">Waived</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="month"
              className="form-input"
              value={billingMonth}
              onChange={(e) => {
                setBillingMonth(e.target.value);
                setPage(1);
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {(search || status || billingMonth) && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Data Table */}
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer ID</th>
                <th>Client Name</th>
                <th>PPPoE User</th>
                <th>Billing Month</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Due Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Loading invoices...</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                      <Link href={`/billing/${inv.id}`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td>{inv.customer?.customerId || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{inv.customer?.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{inv.customer?.pppoeUsername || '—'}</td>
                    <td>{formatMonth(inv.billingMonth)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                    <td style={{ fontWeight: 600, color: inv.dueAmount > 0 ? 'var(--danger-500)' : 'var(--text-secondary)' }}>
                      {formatCurrency(inv.dueAmount)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link href={`/billing/${inv.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                        <HiOutlineEye style={{ fontSize: '14px' }} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px 20px' }}>
            <div className="pagination">
              <div>
                Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} invoices)
              </div>
              <div className="pagination-pages">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  &larr;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pagination-btn ${page === p ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Generate Bills Modal */}
      {isBulkOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: '450px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
              Perform Monthly Billing Run
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              This will automatically generate recurring monthly package invoices for all active, warning, and grace period customers. Already-billed customers will be safely skipped.
            </p>

            <form onSubmit={handleBulkGenerate}>
              <div className="form-group">
                <label className="form-label">Billing Month *</label>
                <input
                  type="month"
                  className="form-input"
                  value={bulkMonth}
                  onChange={(e) => setBulkMonth(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsBulkOpen(false)} disabled={generating}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={generating}>
                  {generating ? 'Processing Billing Run...' : 'Run Billing Engine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

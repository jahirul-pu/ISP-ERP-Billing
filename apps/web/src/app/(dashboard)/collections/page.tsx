'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineCurrencyDollar,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineFunnel,
  HiOutlineBookOpen,
  HiOutlineArrowPath,
  HiOutlinePaperClip,
  HiOutlineClock,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Payment {
  id: string;
  receiptNumber: string;
  amount: number;
  method: string;
  collectionStatus: string;
  remarks?: string;
  proofUrl?: string;
  createdAt: string;
  customer: {
    customerId: string;
    name: string;
    phone: string;
    pppoeUsername: string;
  };
  collector?: {
    id: string;
    name: string;
  };
  invoice?: {
    invoiceNumber: string;
  };
}

interface Cashbook {
  id: string;
  collectorId: string;
  date: string;
  totalCollected: number;
  submittedAmount: number;
  pendingCash: number;
  shortage: number;
  excess: number;
  status: string;
  remarks?: string;
  collector: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface Stats {
  financials: {
    totalCollected: number;
    pendingCollected: number;
    totalShortages: number;
  };
  counts: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    pendingCashbooks: number;
  };
  methods: Record<string, number>;
}

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'cashbooks'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Payments Filters
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [paySearch, setPaySearch] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [payMethod, setPayMethod] = useState('');

  // Cashbook Filters
  const [cbStatus, setCbStatus] = useState('');
  const [cbDate, setCbDate] = useState('');

  // Modal States
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentReconcileStatus, setPaymentReconcileStatus] = useState('APPROVED');
  const [paymentReconcileRemarks, setPaymentReconcileRemarks] = useState('');
  const [submittingPaymentReconcile, setSubmittingPaymentReconcile] = useState(false);

  const [selectedCashbook, setSelectedCashbook] = useState<Cashbook | null>(null);
  const [cashbookActualAmount, setCashbookActualAmount] = useState(0);
  const [cashbookReconcileStatus, setCashbookReconcileStatus] = useState('APPROVED');
  const [cashbookReconcileRemarks, setCashbookReconcileRemarks] = useState('');
  const [submittingCashbookReconcile, setSubmittingCashbookReconcile] = useState(false);

  const [isSubmitCashbookOpen, setIsSubmitCashbookOpen] = useState(false);
  const [submitCashbookDate, setSubmitCashbookDate] = useState('');
  const [submitCashbookAmount, setSubmitCashbookAmount] = useState(0);
  const [submitCashbookRemarks, setSubmitCashbookRemarks] = useState('');
  const [submittingCashbook, setSubmittingCashbook] = useState(false);

  useEffect(() => {
    // Default cashbook submit date to today
    const now = new Date();
    setSubmitCashbookDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    } else {
      fetchCashbooks();
    }
    fetchStats();
  }, [activeTab, payPage, payStatus, payMethod, cbStatus, cbDate]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/collections/payments?page=${payPage}&limit=15`;
      if (paySearch.trim()) url += `&search=${encodeURIComponent(paySearch)}`;
      if (payStatus) url += `&status=${payStatus}`;
      if (payMethod) url += `&method=${payMethod}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setPayments(res.data.data);
        setPayTotalPages(res.data.meta.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load collections payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashbooks = async () => {
    setLoading(true);
    try {
      let url = '/collections/cashbooks?';
      if (cbStatus) url += `status=${cbStatus}&`;
      if (cbDate) url += `date=${cbDate}&`;

      const res = await api.get(url);
      if (res.data?.success) {
        setCashbooks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load collector cashbooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/collections/payments/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  };

  const handlePaySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPayPage(1);
    fetchPayments();
  };

  const handleClearPayFilters = () => {
    setPaySearch('');
    setPayStatus('');
    setPayMethod('');
    setPayPage(1);
  };

  const handleReconcilePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setSubmittingPaymentReconcile(true);
    try {
      const res = await api.patch(`/collections/payments/${selectedPayment.id}/reconcile`, {
        status: paymentReconcileStatus,
        remarks: paymentReconcileRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success(`Payment verified and marked as ${paymentReconcileStatus}`);
        setSelectedPayment(null);
        setPaymentReconcileRemarks('');
        fetchPayments();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reconciliation failed');
    } finally {
      setSubmittingPaymentReconcile(false);
    }
  };

  const handleReconcileCashbookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashbook) return;

    setSubmittingCashbookReconcile(true);
    try {
      const res = await api.patch(`/collections/cashbooks/${selectedCashbook.id}/reconcile`, {
        status: cashbookReconcileStatus,
        actualAmount: Number(cashbookActualAmount),
        remarks: cashbookReconcileRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Cashbook reconciled successfully');
        setSelectedCashbook(null);
        setCashbookReconcileRemarks('');
        fetchCashbooks();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reconciliation failed');
    } finally {
      setSubmittingCashbookReconcile(false);
    }
  };

  const handleSubmitCashbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitCashbookDate || submitCashbookAmount < 0) {
      toast.error('Please enter a valid Date and non-negative Amount');
      return;
    }

    setSubmittingCashbook(true);
    try {
      const res = await api.post(`/collections/cashbooks/submit?date=${submitCashbookDate}`, {
        submittedAmount: Number(submitCashbookAmount),
        remarks: submitCashbookRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Daily cashbook submitted for reconciliation!');
        setIsSubmitCashbookOpen(false);
        setSubmitCashbookAmount(0);
        setSubmitCashbookRemarks('');
        if (activeTab === 'cashbooks') fetchCashbooks();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit daily cashbook');
    } finally {
      setSubmittingCashbook(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'badge-success';
      case 'PENDING':
        return 'badge-warning';
      case 'SUBMITTED':
        return 'badge-primary';
      case 'REJECTED':
      case 'FLAGGED':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection Management</h1>
          <p className="page-subtitle">Track collector cashbooks, log payment receipts, and reconcile daily collections.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsSubmitCashbookOpen(true)}>
            <HiOutlineBookOpen style={{ marginRight: '4px' }} /> Submit Cashbook
          </button>
          <Link href="/collections/new" className="btn btn-primary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Log Collection
          </Link>
        </div>
      </div>

      {/* KPI stats section */}
      {stats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <HiOutlineCurrencyDollar />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalCollected)}</div>
            <div className="kpi-card-label">Approved Collections</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stats.counts.approved} Verified payments
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
              <HiOutlineClock className="spin-slow" />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.pendingCollected)}</div>
            <div className="kpi-card-label">Pending Verification</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stats.counts.pending} Cash/Online items
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
              <HiOutlineBookOpen />
            </div>
            <div className="kpi-card-value">{stats.counts.pendingCashbooks}</div>
            <div className="kpi-card-label">Unreconciled Cashbooks</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Submitted daily logs pending
            </span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
              <HiOutlineExclamationCircle />
            </div>
            <div className="kpi-card-value">{formatCurrency(stats.financials.totalShortages)}</div>
            <div className="kpi-card-label">Total Shortages</div>
            <span className="kpi-card-change negative">
              Shortage discrepancies flagged
            </span>
          </div>
        </div>
      )}

      {/* Tabs list bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--neutral-200)', marginBottom: '20px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'payments' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px', fontWeight: 600 }}
          onClick={() => setActiveTab('payments')}
        >
          Daily Collections
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'cashbooks' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: '10px 20px', fontWeight: 600 }}
          onClick={() => setActiveTab('cashbooks')}
        >
          Collector Cashbooks
        </button>
      </div>

      {/* Dynamic Content card */}
      <div className="card">
        {activeTab === 'payments' ? (
          <>
            {/* Payments list filters */}
            <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} />
                  Payments Log
                </span>
              </div>

              <form onSubmit={handlePaySearch} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr auto auto', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search receipt, customer ID, user, name..."
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                />
                <select
                  className="form-input form-select"
                  value={payStatus}
                  onChange={(e) => {
                    setPayStatus(e.target.value);
                    setPayPage(1);
                  }}
                >
                  <option value="">All Verification</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="FLAGGED">Flagged</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select
                  className="form-input form-select"
                  value={payMethod}
                  onChange={(e) => {
                    setPayMethod(e.target.value);
                    setPayPage(1);
                  }}
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="ONLINE">Online</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
                {(paySearch || payStatus || payMethod) && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearPayFilters}>
                    Clear
                  </button>
                )}
              </form>
            </div>

            {/* Payments Data Table */}
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Date Collected</th>
                    <th>Customer Name</th>
                    <th>Invoice No</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Collector</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Reconcile</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Loading payments list...</div>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No payments logged.
                      </td>
                    </tr>
                  ) : (
                    payments.map((pay) => (
                      <tr key={pay.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{pay.receiptNumber}</td>
                        <td>{new Date(pay.createdAt).toLocaleString()}</td>
                        <td style={{ fontWeight: 500 }}>
                          {pay.customer?.name} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({pay.customer?.customerId})</span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{pay.invoice?.invoiceNumber || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(pay.amount)}</td>
                        <td><span className="badge badge-neutral">{pay.method}</span></td>
                        <td>{pay.collector?.name || '—'}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(pay.collectionStatus)}`}>
                            {pay.collectionStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => {
                              setSelectedPayment(pay);
                              setPaymentReconcileStatus(pay.collectionStatus === 'PENDING' ? 'APPROVED' : pay.collectionStatus);
                            }}
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments pagination */}
            {!loading && payTotalPages > 1 && (
              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px 20px' }}>
                <div className="pagination">
                  <div>Page <strong>{payPage}</strong> of <strong>{payTotalPages}</strong></div>
                  <div className="pagination-pages">
                    <button className="pagination-btn" onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1}>&larr;</button>
                    {Array.from({ length: payTotalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} className={`pagination-btn ${payPage === p ? 'active' : ''}`} onClick={() => setPayPage(p)}>{p}</button>
                    ))}
                    <button className="pagination-btn" onClick={() => setPayPage(p => Math.min(payTotalPages, p + 1))} disabled={payPage === payTotalPages}>&rarr;</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Cashbooks list filters */}
            <div className="card-header" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="card-title">Collector Daily Cashbooks</span>
              <select
                className="form-input form-select"
                style={{ width: '180px', height: '36px', fontSize: '13px' }}
                value={cbStatus}
                onChange={(e) => setCbStatus(e.target.value)}
              >
                <option value="">All Cashbooks</option>
                <option value="PENDING">Collecting (Pending)</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved &amp; Cleared</option>
                <option value="FLAGGED">Flagged / Outages</option>
              </select>
              <input
                type="date"
                className="form-input"
                style={{ width: '180px', height: '36px', fontSize: '13px' }}
                value={cbDate}
                onChange={(e) => setCbDate(e.target.value)}
              />
              {(cbStatus || cbDate) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCbStatus('');
                    setCbDate('');
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Cashbooks Data Table */}
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Log</th>
                    <th>Collector Name</th>
                    <th>Total Collected Cash</th>
                    <th>Submitted Cash</th>
                    <th>Discrepancy (Shortage)</th>
                    <th>Discrepancy (Excess)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Verify Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Loading cashbooks...</div>
                      </td>
                    </tr>
                  ) : cashbooks.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No cashbooks recorded.
                      </td>
                    </tr>
                  ) : (
                    cashbooks.map((cb) => (
                      <tr key={cb.id}>
                        <td style={{ fontWeight: 500 }}>{new Date(cb.date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{cb.collector.name}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(cb.totalCollected)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{formatCurrency(cb.submittedAmount)}</td>
                        <td style={{ fontWeight: 600, color: cb.shortage > 0 ? 'var(--danger-500)' : 'inherit' }}>
                          {cb.shortage > 0 ? formatCurrency(cb.shortage) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: cb.excess > 0 ? 'var(--success-600)' : 'inherit' }}>
                          {cb.excess > 0 ? formatCurrency(cb.excess) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(cb.status)}`}>
                            {cb.status === 'PENDING' ? 'COLLECTING' : cb.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => {
                              setSelectedCashbook(cb);
                              setCashbookActualAmount(cb.submittedAmount || cb.totalCollected);
                              setCashbookReconcileStatus(cb.status === 'SUBMITTED' ? 'APPROVED' : cb.status);
                            }}
                            disabled={cb.status === 'PENDING'}
                          >
                            Reconcile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Reconcile Payment Modal */}
      {selectedPayment && (
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
          <div className="card" style={{ width: '500px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
              Reconcile Payment Receipt: {selectedPayment.receiptNumber}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '20px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Customer:</span>
                <p style={{ fontWeight: 600 }}>{selectedPayment.customer.name} ({selectedPayment.customer.customerId})</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Amount Logged:</span>
                <p style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Method:</span>
                <p style={{ fontWeight: 600 }}>{selectedPayment.method}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Logged By:</span>
                <p style={{ fontWeight: 600 }}>{selectedPayment.collector?.name || 'System'}</p>
              </div>
              {selectedPayment.invoice && (
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>For Invoice:</span>
                  <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedPayment.invoice.invoiceNumber}</p>
                </div>
              )}
              {selectedPayment.remarks && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Remarks:</span>
                  <p style={{ fontStyle: 'italic' }}>{selectedPayment.remarks}</p>
                </div>
              )}
              {selectedPayment.proofUrl && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HiOutlinePaperClip style={{ color: 'var(--primary-500)' }} />
                  <a href={selectedPayment.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-600)', fontWeight: 500 }}>
                    View Attached Proof Slip
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleReconcilePaymentSubmit}>
              <div className="form-group">
                <label className="form-label">Verification Outcome *</label>
                <select
                  className="form-input form-select"
                  value={paymentReconcileStatus}
                  onChange={(e) => setPaymentReconcileStatus(e.target.value)}
                  required
                >
                  <option value="APPROVED">Approve &amp; Reconcile</option>
                  <option value="FLAGGED">Flag Discrepancy</option>
                  <option value="REJECTED">Reject &amp; Void (Rollback Balances)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Verification Remarks</label>
                <textarea
                  className="form-input"
                  style={{ height: '70px', padding: '10px', resize: 'vertical' }}
                  placeholder="Enter audit remarks..."
                  value={paymentReconcileRemarks}
                  onChange={(e) => setPaymentReconcileRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedPayment(null)} disabled={submittingPaymentReconcile}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingPaymentReconcile}>
                  {submittingPaymentReconcile ? 'Saving verification...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile Cashbook Modal */}
      {selectedCashbook && (
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
          <div className="card" style={{ width: '480px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
              Reconcile Daily Cashbook: {selectedCashbook.collector.name}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '20px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Log Date:</span>
                <p style={{ fontWeight: 600 }}>{new Date(selectedCashbook.date).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Total Cash Collected:</span>
                <p style={{ fontWeight: 700, color: 'var(--success-600)' }}>{formatCurrency(selectedCashbook.totalCollected)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Collector Declared:</span>
                <p style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{formatCurrency(selectedCashbook.submittedAmount)}</p>
              </div>
              {selectedCashbook.remarks && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Collector Remarks:</span>
                  <p style={{ fontStyle: 'italic' }}>{selectedCashbook.remarks}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleReconcileCashbookSubmit}>
              <div className="form-group">
                <label className="form-label">Actual Verified Cash Received (৳) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={cashbookActualAmount}
                  onChange={(e) => setCashbookActualAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Audit Outcome *</label>
                <select
                  className="form-input form-select"
                  value={cashbookReconcileStatus}
                  onChange={(e) => setCashbookReconcileStatus(e.target.value)}
                  required
                >
                  <option value="APPROVED">Approve &amp; Clear (Discrepancies automatically logged)</option>
                  <option value="FLAGGED">Flag Outages / Discrepancy</option>
                  <option value="REJECTED">Reject Cashbook</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Audit remarks</label>
                <textarea
                  className="form-input"
                  style={{ height: '70px', padding: '10px', resize: 'vertical' }}
                  placeholder="Enter cash discrepancy audit details..."
                  value={cashbookReconcileRemarks}
                  onChange={(e) => setCashbookReconcileRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedCashbook(null)} disabled={submittingCashbookReconcile}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCashbookReconcile}>
                  {submittingCashbookReconcile ? 'Saving audit...' : 'Approve & Close Cashbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collector Submit Daily Cashbook Modal */}
      {isSubmitCashbookOpen && (
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
              Submit Daily Cash Collections
            </h2>

            <form onSubmit={handleSubmitCashbook}>
              <div className="form-group">
                <label className="form-label">Collection Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={submitCashbookDate}
                  onChange={(e) => setSubmitCashbookDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Submitted Cash Amount (৳) *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  placeholder="0.00"
                  value={submitCashbookAmount || ''}
                  onChange={(e) => setSubmitCashbookAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Collector remarks</label>
                <textarea
                  className="form-input"
                  style={{ height: '70px', padding: '10px', resize: 'vertical' }}
                  placeholder="Notes about the submitted amount..."
                  value={submitCashbookRemarks}
                  onChange={(e) => setSubmitCashbookRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsSubmitCashbookOpen(false)} disabled={submittingCashbook}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCashbook}>
                  {submittingCashbook ? 'Submitting cashbook...' : 'Submit Collections'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

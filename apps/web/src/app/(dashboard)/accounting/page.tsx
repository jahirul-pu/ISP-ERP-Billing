'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlinePlus,
  HiOutlineFunnel,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineDocumentText,
  HiOutlineCalendar,
  HiOutlineClipboardDocumentList,
  HiOutlineCreditCard,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LedgerAccount {
  id: string;
  name: string;
  code: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  description: string | null;
  isSystem: boolean;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paidFrom: string;
  receipt: string | null;
}

interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
  account: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string | null;
  referenceType: string | null;
  lines: JournalLine[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface ReportStatement {
  profitAndLoss: {
    revenues: { accountId: string; name: string; code: string; balance: number }[];
    expenses: { accountId: string; name: string; code: string; balance: number }[];
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
  };
  cashFlow: {
    inflows: number;
    outflows: number;
    netCashFlow: number;
    cashAccounts: { id: string; name: string; balance: number }[];
  };
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'ledgers' | 'expenses' | 'journals' | 'reports'>('ledgers');
  
  // Ledgers state
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expenseTotalItems, setExpenseTotalItems] = useState(0);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('');
  
  // Expenses Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('MAINTENANCE');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidFrom, setExpensePaidFrom] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // Journals state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(false);
  const [journalPage, setJournalPage] = useState(1);
  const [journalTotalPages, setJournalTotalPages] = useState(1);
  const [journalTotalItems, setJournalTotalItems] = useState(0);
  const [journalSearch, setJournalSearch] = useState('');
  const [expandedJournals, setExpandedJournals] = useState<Record<string, boolean>>({});

  // Reports state
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportStatement | null>(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Initial dates helper
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setExpenseDate(today);

    // Set report dates for current month
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    setReportStartDate(firstDay);
    setReportEndDate(today);
  }, []);

  // Fetch data depending on active tab
  useEffect(() => {
    if (activeTab === 'ledgers') {
      fetchLedgers();
    } else if (activeTab === 'expenses') {
      fetchExpenses();
      // Fetch ledgers too, to populate paidFrom select dropdown in modal
      if (ledgers.length === 0) {
        fetchLedgers();
      }
    } else if (activeTab === 'journals') {
      fetchJournals();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, expensePage, expenseFilterCategory, journalPage]);

  const fetchLedgers = async () => {
    setLedgersLoading(true);
    try {
      const res = await api.get('/accounting/ledgers');
      if (res.data?.success) {
        setLedgers(res.data.data);
        // Set default paidFrom ledger (first asset matching cash/bank)
        const assets = res.data.data.filter((l: LedgerAccount) => l.type === 'ASSET');
        if (assets.length > 0) {
          const cashBank = assets.find((a: LedgerAccount) => 
            a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')
          );
          setExpensePaidFrom(cashBank ? cashBank.id : assets[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load chart of accounts');
      console.error(err);
    } finally {
      setLedgersLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setExpensesLoading(true);
    try {
      let url = `/accounting/expenses?page=${expensePage}&limit=10`;
      if (expenseFilterCategory) {
        url += `&category=${expenseFilterCategory}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setExpenses(res.data.data);
        setExpenseTotalPages(res.data.meta.totalPages);
        setExpenseTotalItems(res.data.meta.totalItems);
      }
    } catch (err: any) {
      toast.error('Failed to load expenses list');
      console.error(err);
    } finally {
      setExpensesLoading(false);
    }
  };

  const fetchJournals = async () => {
    setJournalsLoading(true);
    try {
      let url = `/accounting/journals?page=${journalPage}&limit=10`;
      if (journalSearch.trim()) {
        url += `&search=${encodeURIComponent(journalSearch)}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setJournals(res.data.data);
        setJournalTotalPages(res.data.meta.totalPages);
        setJournalTotalItems(res.data.meta.totalItems);
      }
    } catch (err: any) {
      toast.error('Failed to load journal entries');
      console.error(err);
    } finally {
      setJournalsLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      let url = '/accounting/reports/statement';
      const params = [];
      if (reportStartDate) params.push(`startDate=${reportStartDate}`);
      if (reportEndDate) params.push(`endDate=${reportEndDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to generate statement report');
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleJournalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setJournalPage(1);
    fetchJournals();
  };

  const toggleJournalExpand = (id: string) => {
    setExpandedJournals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || isNaN(Number(expenseAmount)) || Number(expenseAmount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    if (!expensePaidFrom) {
      toast.error('Please select an asset account to pay from');
      return;
    }

    setSavingExpense(true);
    try {
      const res = await api.post('/accounting/expenses', {
        category: expenseCategory,
        description: expenseDescription,
        amount: Number(expenseAmount),
        paidFrom: expensePaidFrom,
        date: expenseDate ? new Date(expenseDate) : undefined,
        receipt: expenseReceipt || undefined,
      });

      if (res.data?.success) {
        toast.success('Expense logged successfully, corresponding journal entries posted.');
        setIsExpenseModalOpen(false);
        // Clear modal form
        setExpenseDescription('');
        setExpenseAmount('');
        const today = new Date().toISOString().split('T')[0];
        setExpenseDate(today);
        setExpenseReceipt('');
        
        // Refresh tables
        fetchExpenses();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log business expense');
      console.error(err);
    } finally {
      setSavingExpense(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getLedgerTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET': return 'badge-primary';
      case 'LIABILITY': return 'badge-warning';
      case 'EQUITY': return 'badge-neutral';
      case 'REVENUE': return 'badge-success';
      case 'EXPENSE': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const getExpenseCategoryLabel = (cat: string) => {
    return cat.replace('_', ' ');
  };

  // Compute key metrics if reports data exists or ledger balances are fetched
  const netProfit = reportData?.profitAndLoss.netProfit ?? 0;
  const cashInflow = reportData?.cashFlow.inflows ?? 0;
  const cashOutflow = reportData?.cashFlow.outflows ?? 0;
  const netCashFlow = reportData?.cashFlow.netCashFlow ?? 0;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounting &amp; Bookkeeping</h1>
          <p className="page-subtitle">Manage chart of accounts, track manual double-entry journals, view expenses, and review key financial statements.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/accounting/journal/new" className="btn btn-secondary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Manual Journal Entry
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => setIsExpenseModalOpen(true)}>
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Log Expense
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: netProfit >= 0 ? '#ECFDF5' : '#FEF2F2', color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>
            <HiOutlineDocumentText />
          </div>
          <div className="kpi-card-value" style={{ color: netProfit >= 0 ? 'inherit' : 'var(--danger-600)' }}>
            {formatCurrency(netProfit)}
          </div>
          <div className="kpi-card-label">Net Profit (P&amp;L)</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Revenue vs Expenses</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
            <HiOutlineArrowTrendingUp />
          </div>
          <div className="kpi-card-value">{formatCurrency(cashInflow)}</div>
          <div className="kpi-card-label">Cash Inflows</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Received Payments / Income</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <HiOutlineArrowTrendingDown />
          </div>
          <div className="kpi-card-value">{formatCurrency(cashOutflow)}</div>
          <div className="kpi-card-label">Cash Outflows</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged Expenses / Paid Dues</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: netCashFlow >= 0 ? '#ECFDF5' : '#FFFBEB', color: netCashFlow >= 0 ? '#10B981' : '#F59E0B' }}>
            <HiOutlineBanknotes />
          </div>
          <div className="kpi-card-value">{formatCurrency(netCashFlow)}</div>
          <div className="kpi-card-label">Net Cash Flow</div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inflow minus Outflow</span>
        </div>
      </div>

      {/* Tabs System */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)', borderTopLeftRadius: 'var(--card-radius)', borderTopRightRadius: 'var(--card-radius)', overflow: 'hidden' }}>
          {(['ledgers', 'expenses', 'journals', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setJournalPage(1); setExpensePage(1); }}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: 'none',
                background: activeTab === tab ? 'white' : 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--primary-500)' : 'none',
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? 'var(--primary-600)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13.5px',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div>
          {/* TAB 1: Ledgers */}
          {activeTab === 'ledgers' && (
            <div>
              <div className="card-header">
                <span className="card-title">Chart of Accounts (General Ledgers)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ledgers.length} ledger accounts</span>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Code</th>
                      <th>Account Name</th>
                      <th>Account Type</th>
                      <th>Description</th>
                      <th>Classification</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgersLoading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Loading ledgers...
                        </td>
                      </tr>
                    ) : ledgers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No ledger accounts configured in system db.
                        </td>
                      </tr>
                    ) : (
                      ledgers.map((l) => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{l.code || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{l.name}</td>
                          <td>
                            <span className={`badge ${getLedgerTypeBadge(l.type)}`}>
                              {l.type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{l.description || '—'}</td>
                          <td>
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: l.isSystem ? 'var(--primary-50)' : 'var(--neutral-100)', color: l.isSystem ? 'var(--primary-600)' : 'var(--neutral-600)', fontWeight: 600 }}>
                              {l.isSystem ? 'System Account' : 'Manual'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (l.type === 'REVENUE' || l.type === 'ASSET') && l.balance > 0 ? 'var(--success-600)' : 'inherit' }}>
                            {formatCurrency(l.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Expenses */}
          {activeTab === 'expenses' && (
            <div>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">Business Expenses Log</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-input form-select"
                    style={{ width: '160px', height: '32px', padding: '0 8px', fontSize: '12px' }}
                    value={expenseFilterCategory}
                    onChange={(e) => { setExpenseFilterCategory(e.target.value); setExpensePage(1); }}
                  >
                    <option value="">All Categories</option>
                    <option value="BANDWIDTH">Bandwidth</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="SALARY">Salary</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="FUEL">Fuel</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="OFFICE_RENT">Office Rent</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Paid From Account</th>
                      <th>Receipt File</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesLoading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Loading logged expenses...
                        </td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No business expenses logged.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td>
                            <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                              {getExpenseCategoryLabel(e.category)}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{e.description}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{e.paidFrom || '—'}</td>
                          <td>
                            {e.receipt ? (
                              <a href={e.receipt} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>
                                View Receipt
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No upload</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger-600)' }}>
                            {formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expense Pagination */}
              {!expensesLoading && expenseTotalPages > 1 && (
                <div style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px 20px' }}>
                  <div className="pagination">
                    <div>
                      Showing Page <strong>{expensePage}</strong> of <strong>{expenseTotalPages}</strong> ({expenseTotalItems} items)
                    </div>
                    <div className="pagination-pages">
                      <button
                        className="pagination-btn"
                        onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                        disabled={expensePage === 1}
                      >
                        &larr;
                      </button>
                      {Array.from({ length: expenseTotalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`pagination-btn ${expensePage === p ? 'active' : ''}`}
                          onClick={() => setExpensePage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="pagination-btn"
                        onClick={() => setExpensePage(p => Math.min(expenseTotalPages, p + 1))}
                        disabled={expensePage === expenseTotalPages}
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Journals */}
          {activeTab === 'journals' && (
            <div>
              <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="card-title">Manual &amp; Automated Journal Postings</span>
                <form onSubmit={handleJournalSearch} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Journal ID, Reference or Description..."
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    style={{ maxWidth: '400px', height: '32px', fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ height: '32px' }}>
                    Filter
                  </button>
                  {journalSearch && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: '32px' }}
                      onClick={() => { setJournalSearch(''); setJournalPage(1); }}
                    >
                      Clear
                    </button>
                  )}
                </form>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Entry Number</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Ref. Type</th>
                      <th>Reference Code</th>
                      <th>Created By</th>
                      <th style={{ textAlign: 'right' }}>Total Debit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalsLoading ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Loading journal entries...
                        </td>
                      </tr>
                    ) : journals.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No journal entries matched filter conditions.
                        </td>
                      </tr>
                    ) : (
                      journals.map((j) => {
                        const totalLineDebit = j.lines.reduce((sum, l) => sum + l.debit, 0);
                        const isExpanded = !!expandedJournals[j.id];
                        return (
                          <>
                            <tr key={j.id} style={{ background: isExpanded ? 'var(--neutral-50)' : 'inherit', cursor: 'pointer' }} onClick={() => toggleJournalExpand(j.id)}>
                              <td>
                                {isExpanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{j.entryNumber}</td>
                              <td>{new Date(j.date).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 500 }}>{j.description}</td>
                              <td>
                                {j.referenceType ? (
                                  <span className="badge badge-neutral" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                    {j.referenceType}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                )}
                              </td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{j.reference || '—'}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{j.createdBy?.name || '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                {formatCurrency(totalLineDebit)}
                              </td>
                            </tr>
                            
                            {/* Collapsible Detail Lines */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} style={{ padding: '0', background: 'var(--neutral-50)' }}>
                                  <div style={{ padding: '16px 40px', borderBottom: '1px solid var(--neutral-200)', background: '#FAFBFD' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                                      Journal Postings
                                    </h4>
                                    <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                                          <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', color: 'var(--text-muted)' }}>Account Name</th>
                                          <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', color: 'var(--text-muted)' }}>Type</th>
                                          <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', color: 'var(--text-muted)' }}>Memo/Line Desc</th>
                                          <th style={{ textAlign: 'right', padding: '6px 0', background: 'transparent', color: 'var(--text-muted)' }}>Debit</th>
                                          <th style={{ textAlign: 'right', padding: '6px 0', background: 'transparent', color: 'var(--text-muted)' }}>Credit</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {j.lines.map((line) => (
                                          <tr key={line.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                                            <td style={{ padding: '8px 0', fontWeight: 600 }}>{line.account?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400 }}>({line.account?.code})</span></td>
                                            <td style={{ padding: '8px 0' }}><span className={`badge ${getLedgerTypeBadge(line.account?.type)}`} style={{ fontSize: '10px', padding: '1px 4px' }}>{line.account?.type}</span></td>
                                            <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>{line.description || '—'}</td>
                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: line.debit > 0 ? 600 : 400 }}>{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: line.credit > 0 ? 600 : 400 }}>{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Journal Pagination */}
              {!journalsLoading && journalTotalPages > 1 && (
                <div style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px 20px' }}>
                  <div className="pagination">
                    <div>
                      Showing Page <strong>{journalPage}</strong> of <strong>{journalTotalPages}</strong> ({journalTotalItems} items)
                    </div>
                    <div className="pagination-pages">
                      <button
                        className="pagination-btn"
                        onClick={() => setJournalPage(p => Math.max(1, p - 1))}
                        disabled={journalPage === 1}
                      >
                        &larr;
                      </button>
                      {Array.from({ length: journalTotalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`pagination-btn ${journalPage === p ? 'active' : ''}`}
                          onClick={() => setJournalPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="pagination-btn"
                        onClick={() => setJournalPage(p => Math.min(journalTotalPages, p + 1))}
                        disabled={journalPage === journalTotalPages}
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Reports */}
          {activeTab === 'reports' && (
            <div>
              <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                <span className="card-title">Financial Statements Statements Engine</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>From:</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: '150px', height: '32px', padding: '0 8px', fontSize: '13px' }}
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: '150px', height: '32px', padding: '0 8px', fontSize: '13px' }}
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={fetchReports} disabled={reportsLoading} style={{ height: '32px' }}>
                    {reportsLoading ? 'Querying...' : 'Generate Statements'}
                  </button>
                </div>
              </div>

              {reportsLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Calculating double-entry balances and generating sheets...
                </div>
              ) : !reportData ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No data loaded. Enter a date filter range and query statements.
                </div>
              ) : (
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  
                  {/* Profit & Loss Column */}
                  <div>
                    <div style={{ borderBottom: '2px solid var(--neutral-200)', paddingBottom: '8px', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Profit &amp; Loss Statement</span>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>Accrual Basis</span>
                      </h3>
                    </div>

                    {/* Revenue Accounts */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.02em' }}>
                        Revenues
                      </h4>
                      {reportData.profitAndLoss.revenues.length === 0 ? (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '8px' }}>No revenue recorded</p>
                      ) : (
                        reportData.profitAndLoss.revenues.map((rev) => (
                          <div key={rev.accountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 8px', borderBottom: '1px solid var(--neutral-100)' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{rev.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({rev.code})</span></span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(rev.balance)}</span>
                          </div>
                        ))
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 8px', fontWeight: 700, background: 'var(--neutral-50)', marginTop: '6px' }}>
                        <span>Total Revenue</span>
                        <span style={{ color: 'var(--success-600)' }}>{formatCurrency(reportData.profitAndLoss.totalRevenue)}</span>
                      </div>
                    </div>

                    {/* Expense Accounts */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.02em' }}>
                        Expenses
                      </h4>
                      {reportData.profitAndLoss.expenses.length === 0 ? (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '8px' }}>No expense recorded</p>
                      ) : (
                        reportData.profitAndLoss.expenses.map((exp) => (
                          <div key={exp.accountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 8px', borderBottom: '1px solid var(--neutral-100)' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{exp.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({exp.code})</span></span>
                            <span style={{ fontWeight: 600, color: 'var(--danger-500)' }}>{formatCurrency(exp.balance)}</span>
                          </div>
                        ))
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 8px', fontWeight: 700, background: 'var(--neutral-50)', marginTop: '6px' }}>
                        <span>Total Expenses</span>
                        <span style={{ color: 'var(--danger-600)' }}>{formatCurrency(reportData.profitAndLoss.totalExpense)}</span>
                      </div>
                    </div>

                    {/* Net Profit Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '12px 8px', fontWeight: 800, background: reportData.profitAndLoss.netProfit >= 0 ? 'var(--success-50)' : 'var(--danger-50)', borderLeft: `4px solid ${reportData.profitAndLoss.netProfit >= 0 ? 'var(--success-500)' : 'var(--danger-500)'}`, borderRadius: '4px' }}>
                      <span>Net Profit / Loss</span>
                      <span style={{ color: reportData.profitAndLoss.netProfit >= 0 ? 'var(--success-600)' : 'var(--danger-600)' }}>
                        {formatCurrency(reportData.profitAndLoss.netProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Cash Flow Column */}
                  <div>
                    <div style={{ borderBottom: '2px solid var(--neutral-200)', paddingBottom: '8px', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cash Flow Statement</span>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>Direct Method</span>
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--neutral-100)', background: 'var(--neutral-50)' }}>
                        <span style={{ fontWeight: 500 }}>Cash Inflows (Income / Receivables Collected)</span>
                        <span style={{ fontWeight: 700, color: 'var(--success-600)' }}>{formatCurrency(reportData.cashFlow.inflows)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--neutral-100)', background: 'var(--neutral-50)' }}>
                        <span style={{ fontWeight: 500 }}>Cash Outflows (Logged Category Expenses)</span>
                        <span style={{ fontWeight: 700, color: 'var(--danger-600)' }}>{formatCurrency(reportData.cashFlow.outflows)}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 12px', fontWeight: 800, background: reportData.cashFlow.netCashFlow >= 0 ? 'var(--success-50)' : 'var(--warning-50)', borderRadius: '4px', borderLeft: `4px solid ${reportData.cashFlow.netCashFlow >= 0 ? 'var(--success-500)' : 'var(--warning-500)'}` }}>
                        <span>Net Cash Flow Position</span>
                        <span style={{ color: reportData.cashFlow.netCashFlow >= 0 ? 'var(--success-600)' : 'var(--warning-600)' }}>
                          {formatCurrency(reportData.cashFlow.netCashFlow)}
                        </span>
                      </div>
                    </div>

                    {/* Cash / Bank Account Balances */}
                    <div>
                      <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.02em' }}>
                        Liquid Cash &amp; Bank Ledger Accounts
                      </h4>
                      {reportData.cashFlow.cashAccounts.length === 0 ? (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', paddingLeft: '8px' }}>No cash/bank ledgers found</p>
                      ) : (
                        reportData.cashFlow.cashAccounts.map((cashAcct) => (
                          <div key={cashAcct.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 12px', borderBottom: '1px solid var(--neutral-100)', background: 'white' }}>
                            <span style={{ fontWeight: 500 }}>{cashAcct.name}</span>
                            <span style={{ fontWeight: 700 }}>{formatCurrency(cashAcct.balance)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log Expense Modal */}
      {isExpenseModalOpen && (
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
          <div className="card animate-fade-in" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineCreditCard style={{ color: 'var(--primary-500)' }} />
                Log Business Expense
              </span>
              <button
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setIsExpenseModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleLogExpenseSubmit} className="card-body">
              <div className="form-group">
                <label className="form-label">Expense Category *</label>
                <select
                  className="form-input form-select"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  required
                >
                  <option value="BANDWIDTH">Bandwidth</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="SALARY">Salary</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="FUEL">Fuel</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="OFFICE_RENT">Office Rent</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (৳) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5000"
                  step="0.01"
                  min="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Paid From (Asset Ledger Account) *</label>
                <select
                  className="form-input form-select"
                  value={expensePaidFrom}
                  onChange={(e) => setExpensePaidFrom(e.target.value)}
                  required
                >
                  <option value="">-- Select Cash or Bank Account --</option>
                  {ledgers
                    .filter((l) => l.type === 'ASSET')
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} (Code: {l.code || '—'}) - Balance: {formatCurrency(l.balance)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Purpose *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electricity bill for main POP - May 2026"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt File URL (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. https://s3.amazonaws.com/receipt-123.jpg"
                  value={expenseReceipt}
                  onChange={(e) => setExpenseReceipt(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsExpenseModalOpen(false)}
                  disabled={savingExpense}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingExpense}
                >
                  {savingExpense ? 'Logging Expense...' : 'Submit & Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

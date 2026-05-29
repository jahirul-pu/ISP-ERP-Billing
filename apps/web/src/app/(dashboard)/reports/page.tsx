'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  HiOutlineChartBar,
  HiOutlineBanknotes,
  HiOutlineUsers,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineShieldExclamation,
} from 'react-icons/hi2';
import api from '@/lib/api';

const ClientChart = dynamic(() => import('@/components/ClientChart'), { ssr: false });

type TabId = 'finance' | 'customers' | 'leakage';

const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const str = val === null || val === undefined ? '' : String(val);
        const escaped = str.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
          ? `"${escaped}"`
          : escaped;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface LeakageSummary {
  unbilledCount: number;
  inactiveBilledCount: number;
  duplicateCount: number;
  unassignedCount: number;
  totalIssues: number;
  estimatedLeakage: number;
}

interface LeakageItem {
  customerId?: string;
  name?: string;
  phone?: string;
  area?: string;
  issue: string;
  pppoeUsername?: string;
  expectedRevenue?: number;
  billedAmount?: number;
  invoiceNumber?: string;
  amount?: number;
  receiptNumber?: string;
  customerName?: string;
  duplicateCount?: number;
  billingMonth?: string;
  method?: string;
  collector?: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('finance');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Financial insights, customer analytics, and revenue leakage detection</p>
        </div>
        <div className="print-hide">
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--neutral-100)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {([
          { id: 'finance' as TabId, label: 'Finance', icon: <HiOutlineBanknotes /> },
          { id: 'customers' as TabId, label: 'Customers', icon: <HiOutlineUsers /> },
          { id: 'leakage' as TabId, label: 'Revenue Leakage', icon: <HiOutlineShieldExclamation /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'finance' && <FinanceTab />}
      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'leakage' && <LeakageTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// FINANCE TAB
// ═══════════════════════════════════════════════
function FinanceTab() {
  const [trends, setTrends] = useState<Array<{
    label: string; revenue: number; expenses: number; profit: number; collections: number; invoiced: number; due: number;
  }>>([]);
  interface StatementData {
    profitAndLoss: {
      revenues: Array<{ accountId: string; name: string; code: string; balance: number }>;
      expenses: Array<{ accountId: string; name: string; code: string; balance: number }>;
      totalRevenue: number;
      totalExpense: number;
      netProfit: number;
    };
    cashFlow: {
      inflows: number;
      outflows: number;
      netCashFlow: number;
      cashAccounts: Array<{ id: string; name: string; balance: number }>;
    };
  }

  const [statements, setStatements] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [trendRes, stmtRes] = await Promise.all([
          api.get('/dashboard/trends?months=12'),
          api.get('/accounting/reports/statement'),
        ]);
        setTrends(trendRes.data.data);
        setStatements(stmtRes.data.data);
      } catch (err) {
        console.error('Finance fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;

  const revenueVsExpenseOptions = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff', fontSize: 12 },
    },
    legend: {
      data: ['Revenue', 'Expenses', 'Net Profit'],
      bottom: 0,
      textStyle: { color: '#64748B', fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', top: '8%', bottom: '16%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: trends.map((t) => t.label),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } },
      axisLabel: { color: '#94A3B8', fontSize: 11, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}` },
    },
    series: [
      {
        name: 'Revenue', type: 'bar' as const, data: trends.map((t) => t.revenue),
        itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24,
      },
      {
        name: 'Expenses', type: 'bar' as const, data: trends.map((t) => t.expenses),
        itemStyle: { color: '#F59E0B', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24,
      },
      {
        name: 'Net Profit', type: 'line' as const, data: trends.map((t) => t.profit),
        smooth: true, lineStyle: { width: 3, color: '#10B981' }, itemStyle: { color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.15)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ],
          },
        },
      },
    ],
  };

  const collectionVsDueOptions = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      textStyle: { color: '#fff', fontSize: 12 },
    },
    legend: { data: ['Invoiced', 'Collected', 'Outstanding'], bottom: 0, textStyle: { color: '#64748B', fontSize: 11 } },
    grid: { left: '3%', right: '4%', top: '8%', bottom: '16%', containLabel: true },
    xAxis: {
      type: 'category' as const, data: trends.map((t) => t.label),
      axisLine: { lineStyle: { color: '#E2E8F0' } }, axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const, axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } },
      axisLabel: { color: '#94A3B8', fontSize: 11, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}` },
    },
    series: [
      {
        name: 'Invoiced', type: 'line' as const, data: trends.map((t) => t.invoiced),
        smooth: true, lineStyle: { width: 2, color: '#8B5CF6' }, itemStyle: { color: '#8B5CF6' },
      },
      {
        name: 'Collected', type: 'line' as const, data: trends.map((t) => t.collections),
        smooth: true, lineStyle: { width: 2, color: '#10B981' }, itemStyle: { color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.1)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.01)' },
            ],
          },
        },
      },
      {
        name: 'Outstanding', type: 'bar' as const, data: trends.map((t) => t.due),
        itemStyle: { color: 'rgba(239, 68, 68, 0.5)', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 18,
      },
    ],
  };

  const expenseBreakdown = statements?.profitAndLoss?.expenses || [];
  const expensePieOptions = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(15, 23, 42, 0.95)', textStyle: { color: '#fff', fontSize: 12 } },
    legend: { orient: 'vertical' as const, right: 10, top: 'center' as const, textStyle: { color: '#64748B', fontSize: 11 } },
    series: [{
      type: 'pie' as const, radius: ['40%', '70%'], center: ['35%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' as const } },
      data: expenseBreakdown.map((e, i) => ({
        name: e.name,
        value: e.balance,
        itemStyle: { color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B', '#84CC16'][i % 9] },
      })),
    }],
  };

  const handleExportCSV = () => {
    const headers = ['Month/Period', 'Revenue (BDT)', 'Expenses (BDT)', 'Net Profit (BDT)', 'Invoiced (BDT)', 'Collected (BDT)', 'Outstanding (BDT)'];
    const rows = trends.map(t => [
      t.label,
      t.revenue,
      t.expenses,
      t.profit,
      t.invoiced,
      t.collections,
      t.due
    ]);
    downloadCSV('financial_performance_report.csv', headers, rows);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }} className="print-hide">
        <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
          Export Financials (CSV)
        </button>
      </div>
      {/* Summary cards */}
      {statements && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          <SummaryCard label="Total Revenue" value={`৳${(statements.profitAndLoss.totalRevenue || 0).toLocaleString()}`} color="#10B981" />
          <SummaryCard label="Total Expenses" value={`৳${(statements.profitAndLoss.totalExpense || 0).toLocaleString()}`} color="#F59E0B" />
          <SummaryCard label="Net Profit" value={`৳${(statements.profitAndLoss.netProfit || 0).toLocaleString()}`} color="#3B82F6" />
          <SummaryCard label="Cash Flow (Net)" value={`৳${(statements.cashFlow.netCashFlow || 0).toLocaleString()}`} color="#8B5CF6" />
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue vs Expenses</span></div>
          <div className="card-body" style={{ padding: '8px' }}>
            <ClientChart option={revenueVsExpenseOptions} style={{ height: 320 }} notMerge lazyUpdate />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Collection Performance</span></div>
          <div className="card-body" style={{ padding: '8px' }}>
            <ClientChart option={collectionVsDueOptions} style={{ height: 320 }} notMerge lazyUpdate />
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      {expenseBreakdown.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><span className="card-title">Expense Breakdown</span></div>
          <div className="card-body" style={{ padding: '8px' }}>
            <ClientChart option={expensePieOptions} style={{ height: 300 }} notMerge lazyUpdate />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════════════════════
function CustomersTab() {
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number }>>([]);
  const [packageDist, setPackageDist] = useState<Array<{ packageName: string; count: number }>>([]);
  const [areaStats, setAreaStats] = useState<Array<{
    name: string; totalCustomers: number; activeCustomers: number; onlineCustomers: number;
    totalDue: number; expectedRevenue: number; collectionRate: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statusRes, pkgRes, areaRes] = await Promise.all([
          api.get('/dashboard/customer-status'),
          api.get('/dashboard/package-distribution'),
          api.get('/dashboard/area-stats'),
        ]);
        setStatusDist(statusRes.data.data);
        setPackageDist(pkgRes.data.data);
        setAreaStats(areaRes.data.data);
      } catch (err) {
        console.error('Customer report fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;

  const totalCustomers = statusDist.reduce((sum, s) => sum + s.count, 0);
  const activeCount = statusDist.find((s) => s.status === 'ACTIVE')?.count || 0;
  const suspendedCount = statusDist.find((s) => s.status === 'SUSPENDED')?.count || 0;
  const leftCount = (statusDist.find((s) => s.status === 'LEFT_CUSTOMER')?.count || 0)
    + (statusDist.find((s) => s.status === 'DEAD_CONNECTION')?.count || 0);

  const statusLabels: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: '#10B981' },
    DUE_WARNING: { label: 'Due Warning', color: '#F59E0B' },
    GRACE_PERIOD: { label: 'Grace Period', color: '#3B82F6' },
    SUSPENDED: { label: 'Suspended', color: '#EF4444' },
    TEMPORARY_DISCONNECT: { label: 'Temp Disconnect', color: '#8B5CF6' },
    LEFT_CUSTOMER: { label: 'Left', color: '#94A3B8' },
    DEAD_CONNECTION: { label: 'Dead', color: '#64748B' },
    MIGRATED: { label: 'Migrated', color: '#06B6D4' },
  };

  const statusPieOptions = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(15, 23, 42, 0.95)', textStyle: { color: '#fff', fontSize: 12 } },
    legend: { orient: 'vertical' as const, right: 10, top: 'center' as const, textStyle: { color: '#64748B', fontSize: 11 } },
    series: [{
      type: 'pie' as const, radius: ['45%', '75%'], center: ['35%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' as const }, itemStyle: { shadowBlur: 10 } },
      data: statusDist.map((s) => ({
        name: statusLabels[s.status]?.label || s.status,
        value: s.count,
        itemStyle: { color: statusLabels[s.status]?.color || '#94A3B8' },
      })),
    }],
  };

  const pkgBarOptions = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(15, 23, 42, 0.95)', textStyle: { color: '#fff', fontSize: 12 } },
    grid: { left: '3%', right: '10%', top: '8%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'value' as const, axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: {
      type: 'category' as const, data: packageDist.map((p) => p.packageName),
      axisLine: { lineStyle: { color: '#E2E8F0' } }, axisLabel: { color: '#475569', fontSize: 11 },
    },
    series: [{
      type: 'bar' as const, barMaxWidth: 20,
      data: packageDist.map((p, i) => ({
        value: p.count,
        itemStyle: {
          color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444'][i % 6],
          borderRadius: [0, 6, 6, 0],
        },
      })),
      label: { show: true, position: 'right' as const, color: '#64748B', fontSize: 11 },
    }],
  };

  const handleExportCSV = () => {
    const headers = ['Area Name', 'Total Customers', 'Active Customers', 'Online Customers', 'Expected Monthly Revenue (BDT)', 'Total Outstanding Due (BDT)', 'Collection Rate (%)'];
    const rows = areaStats.map(a => [
      a.name,
      a.totalCustomers,
      a.activeCustomers,
      a.onlineCustomers,
      a.expectedRevenue,
      a.totalDue,
      a.collectionRate
    ]);
    downloadCSV('customer_area_performance_report.csv', headers, rows);
  };

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <SummaryCard label="Total Customers" value={totalCustomers.toLocaleString()} color="#3B82F6" />
        <SummaryCard label="Active" value={activeCount.toLocaleString()} color="#10B981" />
        <SummaryCard label="Suspended" value={suspendedCount.toLocaleString()} color="#EF4444" />
        <SummaryCard label="Left / Dead" value={leftCount.toLocaleString()} color="#94A3B8" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Status Distribution</span></div>
          <div className="card-body" style={{ padding: '8px' }}>
            <ClientChart option={statusPieOptions} style={{ height: 300 }} notMerge lazyUpdate />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Package Popularity</span></div>
          <div className="card-body" style={{ padding: '8px' }}>
            <ClientChart option={pkgBarOptions} style={{ height: 300 }} notMerge lazyUpdate />
          </div>
        </div>
      </div>

      {/* Area Stats Table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Area Performance</span>
          <button className="btn btn-secondary btn-sm print-hide" onClick={handleExportCSV}>
            Export Area Data (CSV)
          </button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Total</th>
                <th>Active</th>
                <th>Online</th>
                <th>Expected Revenue</th>
                <th>Total Due</th>
                <th>Collection Rate</th>
              </tr>
            </thead>
            <tbody>
              {areaStats.map((a) => (
                <tr key={a.name}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>{a.totalCustomers}</td>
                  <td><span className="badge badge-success">{a.activeCustomers}</span></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="status-dot online" />
                      {a.onlineCustomers}
                    </span>
                  </td>
                  <td>৳{a.expectedRevenue.toLocaleString()}</td>
                  <td style={{ color: a.totalDue > 0 ? 'var(--danger-600)' : 'var(--text-primary)', fontWeight: 600 }}>
                    ৳{a.totalDue.toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--neutral-100)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, width: `${Math.min(a.collectionRate, 100)}%`,
                          background: a.collectionRate >= 80 ? '#10B981' : a.collectionRate >= 60 ? '#F59E0B' : '#EF4444',
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 36 }}>
                        {a.collectionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// LEAKAGE TAB
// ═══════════════════════════════════════════════
function LeakageTab() {
  const [summary, setSummary] = useState<LeakageSummary | null>(null);
  const [unbilled, setUnbilled] = useState<LeakageItem[]>([]);
  const [inactiveBilled, setInactiveBilled] = useState<LeakageItem[]>([]);
  const [unassigned, setUnassigned] = useState<LeakageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'unbilled' | 'inactive' | 'unassigned'>('unbilled');

  const fetchLeakage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/leakage/report');
      const data = res.data.data;
      setSummary(data.summary);
      setUnbilled(data.unbilledUsers);
      setInactiveBilled(data.inactiveBilled);
      setUnassigned(data.unassignedCollections);
    } catch (err) {
      console.error('Leakage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeakage();
  }, [fetchLeakage]);

  if (loading) return <LoadingState />;

  const handleExportCSV = () => {
    if (subTab === 'unbilled') {
      const headers = ['Customer ID', 'Customer Name', 'PPPoE Username', 'Area Code/Name', 'Expected Package Revenue (BDT)', 'Leakage Status'];
      const rows = unbilled.map(u => [
        u.customerId,
        u.name,
        u.pppoeUsername,
        u.area,
        u.expectedRevenue,
        'Active Unbilled'
      ]);
      downloadCSV('leakage_unbilled_active_users.csv', headers, rows);
    } else if (subTab === 'inactive') {
      const headers = ['Customer ID', 'Customer Name', 'PPPoE Username', 'Area Code/Name', 'Invoice Reference', 'Billed Amount (BDT)', 'Leakage Status'];
      const rows = inactiveBilled.map(u => [
        u.customerId,
        u.name,
        u.pppoeUsername,
        u.area,
        u.invoiceNumber,
        u.billedAmount,
        'Phantom Billing'
      ]);
      downloadCSV('leakage_phantom_billed_users.csv', headers, rows);
    } else if (subTab === 'unassigned') {
      const headers = ['Receipt Number', 'Customer ID', 'Customer Name', 'Area Name', 'Payment Amount (BDT)', 'Method', 'Logged Collector'];
      const rows = unassigned.map(u => [
        u.receiptNumber,
        u.customerId,
        u.customerName || u.name,
        u.area,
        u.amount,
        u.method,
        u.collector
      ]);
      downloadCSV('leakage_unassigned_payments.csv', headers, rows);
    }
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <HiOutlineExclamationTriangle />
          </div>
          <div className="kpi-card-value">{summary?.totalIssues || 0}</div>
          <div className="kpi-card-label">Total Issues</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <HiOutlineShieldExclamation />
          </div>
          <div className="kpi-card-value">৳{(summary?.estimatedLeakage || 0).toLocaleString()}</div>
          <div className="kpi-card-label">Est. Leakage</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', opacity: subTab === 'unbilled' ? 1 : 0.7 }} onClick={() => setSubTab('unbilled')}>
          <div className="kpi-card-value" style={{ color: '#EF4444' }}>{summary?.unbilledCount || 0}</div>
          <div className="kpi-card-label">Unbilled Active Users</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', opacity: subTab === 'inactive' ? 1 : 0.7 }} onClick={() => setSubTab('inactive')}>
          <div className="kpi-card-value" style={{ color: '#F59E0B' }}>{summary?.inactiveBilledCount || 0}</div>
          <div className="kpi-card-label">Inactive but Billed</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', opacity: subTab === 'unassigned' ? 1 : 0.7 }} onClick={() => setSubTab('unassigned')}>
          <div className="kpi-card-value" style={{ color: '#8B5CF6' }}>{summary?.unassignedCount || 0}</div>
          <div className="kpi-card-label">Unassigned Payments</div>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }} className="print-hide">
        <button className={`btn btn-sm ${subTab === 'unbilled' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setSubTab('unbilled')}>
          Unbilled Users ({summary?.unbilledCount || 0})
        </button>
        <button className={`btn btn-sm ${subTab === 'inactive' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSubTab('inactive')}>
          Inactive Billed ({summary?.inactiveBilledCount || 0})
        </button>
        <button className={`btn btn-sm ${subTab === 'unassigned' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSubTab('unassigned')}>
          Unassigned Payments ({summary?.unassignedCount || 0})
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" style={{ marginRight: 8 }} onClick={handleExportCSV}>
          Export Active Tab (CSV)
        </button>
        <button className="btn btn-secondary btn-sm" onClick={fetchLeakage}>
          <HiOutlineArrowPath style={{ fontSize: 14 }} /> Re-scan
        </button>
      </div>

      {/* Unbilled Users */}
      {subTab === 'unbilled' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔴 Active in MikroTik — No Invoice This Month</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>PPPoE</th>
                  <th>Area</th>
                  <th>Package</th>
                  <th>Expected Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {unbilled.length > 0 ? unbilled.map((u, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{u.customerId}</td>
                    <td>{u.name}</td>
                    <td><code style={{ fontSize: 12, background: 'var(--neutral-100)', padding: '2px 6px', borderRadius: 4 }}>{u.pppoeUsername || '—'}</code></td>
                    <td>{u.area || '—'}</td>
                    <td><span className="badge badge-neutral">{u.expectedRevenue ? `${u.expectedRevenue}` : '—'}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--danger-600)' }}>৳{(u.expectedRevenue || 0).toLocaleString()}</td>
                    <td><span className="badge badge-danger">Unbilled</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>✅ No unbilled active users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inactive Billed */}
      {subTab === 'inactive' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🟡 Billed but No Active MikroTik Connection</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>PPPoE</th>
                  <th>Area</th>
                  <th>Invoice</th>
                  <th>Billed Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inactiveBilled.length > 0 ? inactiveBilled.map((u, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{u.customerId}</td>
                    <td>{u.name}</td>
                    <td><code style={{ fontSize: 12, background: 'var(--neutral-100)', padding: '2px 6px', borderRadius: 4 }}>{u.pppoeUsername || 'none'}</code></td>
                    <td>{u.area || '—'}</td>
                    <td>{u.invoiceNumber || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--warning-600)' }}>৳{(u.billedAmount || 0).toLocaleString()}</td>
                    <td><span className="badge badge-warning">Phantom Bill</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>✅ No phantom billing detected</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned Payments */}
      {subTab === 'unassigned' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🟣 Payments Not Linked to Any Invoice</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer ID</th>
                  <th>Customer</th>
                  <th>Area</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Collector</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.length > 0 ? unassigned.map((u, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{u.receiptNumber}</td>
                    <td style={{ color: 'var(--primary-600)' }}>{u.customerId}</td>
                    <td>{u.customerName || u.name}</td>
                    <td>{u.area || '—'}</td>
                    <td style={{ fontWeight: 600 }}>৳{(u.amount || 0).toLocaleString()}</td>
                    <td><span className="badge badge-neutral">{u.method || '—'}</span></td>
                    <td>{u.collector || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>✅ All payments are linked to invoices</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════
function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card" style={{ padding: 20, minHeight: 80 }}>
          <div style={{ background: 'var(--neutral-100)', width: '50%', height: 14, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ background: 'var(--neutral-100)', width: '70%', height: 28, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

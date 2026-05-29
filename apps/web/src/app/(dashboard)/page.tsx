'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
  HiOutlineArrowTrendingUp,
  HiOutlineExclamationTriangle,
  HiOutlineSignal,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';

const ClientChart = dynamic(() => import('@/components/ClientChart'), { ssr: false });


interface KpiData {
  value: number;
  change: number;
  changeLabel: string;
  trend: 'positive' | 'negative';
}

interface TrendData {
  month: string;
  label: string;
  revenue: number;
  collections: number;
  expenses: number;
  profit: number;
  invoiced: number;
  due: number;
}

interface ActivityItem {
  type: string;
  text: string;
  time: string;
  timeAgo: string;
}

interface DueCustomer {
  customerId: string;
  name: string;
  phone: string;
  totalDue: number;
  status: string;
  area?: { name: string };
  package?: { name: string };
}

interface StatusItem {
  status: string;
  count: number;
}

interface PackageItem {
  packageName: string;
  count: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `৳${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `৳${(amount / 1000).toFixed(1)}K`;
  return `৳${amount.toLocaleString()}`;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Record<string, KpiData> | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dueCustomers, setDueCustomers] = useState<DueCustomer[]>([]);
  const [statusDist, setStatusDist] = useState<StatusItem[]>([]);
  const [packageDist, setPackageDist] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState(12);

  const fetchData = useCallback(async () => {
    try {
      const [kpiRes, trendRes, activityRes, dueRes, statusRes, pkgRes] = await Promise.all([
        api.get('/dashboard/executive'),
        api.get(`/dashboard/trends?months=${trendPeriod}`),
        api.get('/dashboard/recent-activity?limit=8'),
        api.get('/dashboard/due-customers?limit=8'),
        api.get('/dashboard/customer-status'),
        api.get('/dashboard/package-distribution'),
      ]);
      setKpis(kpiRes.data.data);
      setTrends(trendRes.data.data);
      setActivity(activityRes.data.data);
      setDueCustomers(dueRes.data.data);
      setStatusDist(statusRes.data.data);
      setPackageDist(pkgRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [trendPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── KPI card definitions ──────────────────────
  const kpiCards = kpis
    ? [
        {
          key: 'totalCustomers',
          label: 'Total Customers',
          value: kpis.totalCustomers?.value?.toLocaleString() || '0',
          change: kpis.totalCustomers?.changeLabel || '+0',
          trend: kpis.totalCustomers?.trend || 'positive',
          icon: <HiOutlineUsers />,
          color: '#3B82F6',
          bg: '#EFF6FF',
        },
        {
          key: 'monthlyRevenue',
          label: 'Monthly Revenue',
          value: formatCurrency(kpis.monthlyRevenue?.value || 0),
          change: kpis.monthlyRevenue?.changeLabel || '0%',
          trend: kpis.monthlyRevenue?.trend || 'positive',
          icon: <HiOutlineCurrencyDollar />,
          color: '#10B981',
          bg: '#ECFDF5',
        },
        {
          key: 'collectionRate',
          label: 'Collection Rate',
          value: `${kpis.collectionRate?.value || 0}%`,
          change: kpis.collectionRate?.changeLabel || '0%',
          trend: kpis.collectionRate?.trend || 'positive',
          icon: <HiOutlineArrowTrendingUp />,
          color: '#8B5CF6',
          bg: '#F5F3FF',
        },
        {
          key: 'totalDue',
          label: 'Total Due',
          value: formatCurrency(kpis.totalDue?.value || 0),
          change: kpis.totalDue?.changeLabel || '0%',
          trend: kpis.totalDue?.trend || 'positive',
          icon: <HiOutlineExclamationTriangle />,
          color: '#F59E0B',
          bg: '#FFFBEB',
        },
        {
          key: 'onlineNow',
          label: 'Online Now',
          value: (kpis.onlineNow?.value || 0).toLocaleString(),
          change: kpis.onlineNow?.changeLabel || '0%',
          trend: kpis.onlineNow?.trend || 'positive',
          icon: <HiOutlineSignal />,
          color: '#06B6D4',
          bg: '#ECFEFF',
        },
        {
          key: 'churnRate',
          label: 'Churn Rate',
          value: `${kpis.churnRate?.value || 0}%`,
          change: kpis.churnRate?.changeLabel || '0%',
          trend: kpis.churnRate?.trend || 'negative',
          icon: <HiOutlineArrowTrendingDown />,
          color: '#EF4444',
          bg: '#FEF2F2',
        },
      ]
    : [];

  // ─── Revenue Trend Chart Options ──────────────
  const revenueTrendOptions = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff', fontSize: 12 },
      axisPointer: { type: 'cross' as const, crossStyle: { color: '#94A3B8' } },
      formatter: (params: Array<{ seriesName: string; value: number; axisValueLabel: string; color: string }>) => {
        if (!params.length) return '';
        let html = `<div style="font-weight:600;margin-bottom:6px">${params[0].axisValueLabel}</div>`;
        params.forEach((p) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}: ৳${p.value?.toLocaleString() || 0}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: ['Revenue', 'Expenses', 'Profit'],
      bottom: 0,
      textStyle: { color: '#64748B', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 20,
    },
    grid: { left: '3%', right: '4%', top: '8%', bottom: '16%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: trends.map((t) => t.label),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 11,
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`,
      },
    },
    series: [
      {
        name: 'Revenue',
        type: 'line' as const,
        data: trends.map((t) => t.revenue),
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 3, color: '#3B82F6' },
        itemStyle: { color: '#3B82F6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ],
          },
        },
      },
      {
        name: 'Expenses',
        type: 'line' as const,
        data: trends.map((t) => t.expenses),
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2, color: '#F59E0B', type: 'dashed' as const },
        itemStyle: { color: '#F59E0B' },
      },
      {
        name: 'Profit',
        type: 'bar' as const,
        data: trends.map((t) => t.profit),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.6)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.15)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 24,
      },
    ],
  };

  // ─── Customer Status Chart ────────────────────
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

  const statusChartOptions = {
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff', fontSize: 12 },
      formatter: (params: { name: string; value: number; percent: number }) =>
        `<b>${params.name}</b><br/>Count: ${params.value}<br/>Share: ${params.percent}%`,
    },
    legend: {
      orient: 'vertical' as const,
      right: 10,
      top: 'center' as const,
      textStyle: { color: '#64748B', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' as const },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.15)' },
        },
        data: statusDist.map((s) => ({
          name: statusLabels[s.status]?.label || s.status,
          value: s.count,
          itemStyle: { color: statusLabels[s.status]?.color || '#94A3B8' },
        })),
      },
    ],
  };

  // ─── Package Distribution Chart ───────────────
  const pkgChartOptions = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: { left: '3%', right: '10%', top: '8%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: {
      type: 'category' as const,
      data: packageDist.map((p) => p.packageName),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#475569', fontSize: 11 },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        data: packageDist.map((p, i) => ({
          value: p.count,
          itemStyle: {
            color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444', '#EC4899'][i % 7],
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barMaxWidth: 20,
        label: { show: true, position: 'right' as const, color: '#64748B', fontSize: 11 },
      },
    ],
  };

  // ─── Activity icon ────────────────────────────
  const activityIcon = (type: string) => {
    const colors: Record<string, string> = {
      payment: '#10B981',
      customer: '#3B82F6',
      ticket: '#F59E0B',
      sync: '#8B5CF6',
      billing: '#06B6D4',
      alert: '#EF4444',
    };
    return (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colors[type] || '#94A3B8',
          display: 'inline-block',
          flexShrink: 0,
          marginTop: 6,
        }}
      />
    );
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading your ISP overview...</p>
          </div>
        </div>
        <div className="kpi-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kpi-card" style={{ minHeight: 140 }}>
              <div style={{ background: 'var(--neutral-100)', width: 40, height: 40, borderRadius: 10, marginBottom: 12 }} />
              <div style={{ background: 'var(--neutral-100)', width: '60%', height: 28, borderRadius: 6, marginBottom: 8 }} />
              <div style={{ background: 'var(--neutral-100)', width: '40%', height: 14, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, Admin. Here&apos;s your ISP overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} title="Refresh data">
            <HiOutlineArrowPath style={{ fontSize: 14 }} /> Refresh
          </button>
          <a href="/customers/new" className="btn btn-primary btn-sm">+ Add Customer</a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiCards.map((kpi) => (
          <div key={kpi.key} className="kpi-card">
            <div
              className="kpi-card-icon"
              style={{ backgroundColor: kpi.bg, color: kpi.color }}
            >
              {kpi.icon}
            </div>
            <div className="kpi-card-value">{kpi.value}</div>
            <div className="kpi-card-label">{kpi.label}</div>
            <span className={`kpi-card-change ${kpi.trend}`}>
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Revenue Trend Chart */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <span className="card-title">Revenue & Profit Trend</span>
            <select
              className="form-input form-select"
              style={{ width: 'auto', height: '32px', fontSize: '12px' }}
              value={trendPeriod}
              onChange={(e) => setTrendPeriod(Number(e.target.value))}
            >
              <option value={12}>Last 12 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={3}>Last 3 Months</option>
            </select>
          </div>
          <div className="card-body" style={{ padding: '12px 8px' }}>
            {trends.length > 0 ? (
              <ClientChart
                option={revenueTrendOptions}
                style={{ height: 300 }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-state" style={{ height: 300 }}>
                <HiOutlineArrowTrendingUp style={{ fontSize: 36, color: 'var(--neutral-300)' }} />
                <p className="empty-state-text">No trend data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <button className="btn btn-ghost btn-sm" onClick={fetchData}>Refresh</button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {activity.length > 0 ? (
              activity.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 20px',
                    borderBottom: i < activity.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  {activityIcon(item.type)}
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4', flex: 1 }}>
                    {item.text}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {item.timeAgo}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '40px' }}>
                <p className="empty-state-text">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Customer Status + Package Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 16 }}>
        {/* Customer Status */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Customer Status Distribution</span>
          </div>
          <div className="card-body" style={{ padding: '8px' }}>
            {statusDist.length > 0 ? (
              <ClientChart
                option={statusChartOptions}
                style={{ height: 280 }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-state" style={{ height: 280 }}>
                <p className="empty-state-text">No customer data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Package Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Package Distribution</span>
          </div>
          <div className="card-body" style={{ padding: '8px' }}>
            {packageDist.length > 0 ? (
              <ClientChart
                option={pkgChartOptions}
                style={{ height: 280 }}
                notMerge
                lazyUpdate
              />
            ) : (
              <div className="empty-state" style={{ height: 280 }}>
                <p className="empty-state-text">No package data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Customers Table */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header">
          <span className="card-title">Due Customers</span>
          <a href="/customers" className="btn btn-ghost btn-sm">View All →</a>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Area</th>
                <th>Package</th>
                <th>Due Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dueCustomers.length > 0 ? (
                dueCustomers.map((c) => (
                  <tr key={c.customerId}>
                    <td>
                      <a href={`/customers/${c.customerId}`} style={{ fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none' }}>
                        {c.customerId}
                      </a>
                    </td>
                    <td>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td>{c.area?.name || '—'}</td>
                    <td><span className="badge badge-neutral">{c.package?.name || '—'}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--danger-600)' }}>
                      ৳{c.totalDue.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        c.status === 'DUE_WARNING' ? 'badge-warning' :
                        c.status === 'GRACE_PERIOD' ? 'badge-primary' :
                        c.status === 'SUSPENDED' ? 'badge-danger' :
                        'badge-neutral'
                      }`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    🎉 No customers with outstanding dues
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

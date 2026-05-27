import {
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
  HiOutlineArrowTrendingUp,
  HiOutlineExclamationTriangle,
  HiOutlineSignal,
  HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';

export default function DashboardPage() {
  // Sample KPI data — will be replaced with real API calls
  const kpis = [
    {
      label: 'Total Customers',
      value: '12,458',
      change: '+124',
      trend: 'positive',
      icon: <HiOutlineUsers />,
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    {
      label: 'Monthly Revenue',
      value: '৳18.5L',
      change: '+8.2%',
      trend: 'positive',
      icon: <HiOutlineCurrencyDollar />,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      label: 'Collection Rate',
      value: '87.3%',
      change: '+2.1%',
      trend: 'positive',
      icon: <HiOutlineArrowTrendingUp />,
      color: '#8B5CF6',
      bg: '#F5F3FF',
    },
    {
      label: 'Total Due',
      value: '৳4.2L',
      change: '-3.4%',
      trend: 'positive',
      icon: <HiOutlineExclamationTriangle />,
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    {
      label: 'Online Now',
      value: '9,847',
      change: '79%',
      trend: 'positive',
      icon: <HiOutlineSignal />,
      color: '#06B6D4',
      bg: '#ECFEFF',
    },
    {
      label: 'Churn Rate',
      value: '2.1%',
      change: '+0.3%',
      trend: 'negative',
      icon: <HiOutlineArrowTrendingDown />,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
  ];

  const recentActivity = [
    { type: 'payment', text: 'Payment received from ISP-04521 — ৳1,200', time: '2 min ago' },
    { type: 'customer', text: 'New customer registered: Karim Uddin (Uttara S1)', time: '8 min ago' },
    { type: 'ticket', text: 'Ticket #TK-0891 resolved by Rahim (Technician)', time: '15 min ago' },
    { type: 'sync', text: 'MikroTik sync completed — 12,458 users synced', time: '30 min ago' },
    { type: 'billing', text: 'Monthly bills generated for May 2026 — 12,102 invoices', time: '1 hr ago' },
    { type: 'alert', text: 'Revenue leakage detected: 23 unbilled active users', time: '2 hr ago' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, Admin. Here&apos;s your ISP overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm">Export Report</button>
          <button className="btn btn-primary btn-sm">+ Add Customer</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
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

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Revenue Chart Placeholder */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <span className="card-title">Revenue Trend</span>
            <select className="form-input form-select" style={{ width: 'auto', height: '32px', fontSize: '12px' }}>
              <option>Last 12 Months</option>
              <option>Last 6 Months</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="card-body" style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state" style={{ padding: '20px' }}>
              <HiOutlineArrowTrendingUp style={{ fontSize: '36px', color: 'var(--neutral-300)', marginBottom: '8px' }} />
              <p className="empty-state-text">Revenue chart will be rendered here with ECharts</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <button className="btn btn-ghost btn-sm">View All</button>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 20px',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {item.text}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Overview Table */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header">
          <span className="card-title">Due Customers</span>
          <button className="btn btn-ghost btn-sm">View All →</button>
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
              {[
                { id: 'ISP-00142', name: 'Rafiq Hasan', phone: '01711234567', area: 'Uttara S1', pkg: '20 Mbps', due: '৳2,400', status: 'DUE_WARNING' },
                { id: 'ISP-00287', name: 'Nusrat Jahan', phone: '01819876543', area: 'Mirpur S10', pkg: '10 Mbps', due: '৳1,600', status: 'GRACE_PERIOD' },
                { id: 'ISP-00491', name: 'Kamal Corp.', phone: '01512345678', area: 'Uttara S3', pkg: '50 Mbps Corp', due: '৳6,000', status: 'SUSPENDED' },
                { id: 'ISP-00103', name: 'Ayesha Begum', phone: '01912345678', area: 'Uttara S1', pkg: '10 Mbps', due: '৳800', status: 'DUE_WARNING' },
                { id: 'ISP-00567', name: 'Tanvir Ahmed', phone: '01612345678', area: 'Mirpur S10', pkg: '30 Mbps', due: '৳3,000', status: 'SUSPENDED' },
              ].map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{c.id}</td>
                  <td>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                  <td>{c.area}</td>
                  <td><span className="badge badge-neutral">{c.pkg}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--danger-600)' }}>{c.due}</td>
                  <td>
                    <span className={`badge ${
                      c.status === 'DUE_WARNING' ? 'badge-warning' :
                      c.status === 'GRACE_PERIOD' ? 'badge-primary' :
                      'badge-danger'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
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

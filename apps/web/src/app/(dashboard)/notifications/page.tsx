'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import {
  HiOutlineBell,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineEnvelope,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineMegaphone,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CustomerOption {
  id: string;
  customerId: string;
  name: string;
  phone: string;
}

interface AreaOption {
  id: string;
  name: string;
}

interface PackageOption {
  id: string;
  name: string;
}

interface NotificationLog {
  id: string;
  type: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  recipientId?: string;
  recipient: string;
  subject?: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
  customer?: {
    customerId: string;
    name: string;
  } | null;
}

interface NotificationStats {
  total: number;
  sms: number;
  whatsapp: number;
  email: number;
  successRate: number;
  failed: number;
}

const TEMPLATES = [
  {
    name: 'None (Blank)',
    value: '',
  },
  {
    name: 'Internet Bill Due Warning',
    value: 'Dear {{name}}, your internet bill of ৳{{amount}} is due. Please pay by the due date to avoid service disruption. Thank you!',
  },
  {
    name: 'Scheduled Maintenance Notice',
    value: 'Dear Client, scheduled fiber maintenance will take place in your area tomorrow between 2:00 AM and 5:00 AM. Expect temporary outages.',
  },
  {
    name: 'Payment Confirmation Receipt',
    value: 'Dear {{name}}, we have successfully received your payment of ৳{{amount}}. Your account balance has been updated. Receipt No: {{receipt}}.',
  },
  {
    name: 'Welcome Message & ID',
    value: 'Welcome to our network! Dear {{name}}, your installation is complete. Your Customer ID is {{customerId}}. Keep this ID for references.',
  },
];

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dropdown options
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Modals States
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeLog, setActiveLog] = useState<NotificationLog | null>(null);

  // Single Compose States
  const [composeRecipientType, setComposeRecipientType] = useState<'customer' | 'loose'>('customer');
  const [composeCustomerId, setComposeCustomerId] = useState('');
  const [composeLooseRecipient, setComposeLooseRecipient] = useState('');
  const [composeChannel, setComposeChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [composeType, setComposeType] = useState('CUSTOM');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeTemplate, setComposeTemplate] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Bulk Campaign States
  const [campaignTargetType, setCampaignTargetType] = useState<'ALL' | 'AREA' | 'PACKAGE' | 'STATUS'>('ALL');
  const [campaignTargetValue, setCampaignTargetValue] = useState('');
  const [campaignChannel, setCampaignChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignTemplate, setCampaignTemplate] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, channelFilter, statusFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/notifications/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchOptions = async () => {
    try {
      const [custRes, areaRes, pkgRes] = await Promise.all([
        api.get('/customers?limit=200'),
        api.get('/areas'),
        api.get('/packages'),
      ]);

      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (areaRes.data?.success) setAreas(areaRes.data.data);
      if (pkgRes.data?.success) setPackages(pkgRes.data.data);
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/notifications?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (channelFilter) url += `&channel=${channelFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotalItems(res.data.meta.total);
      }
    } catch (err) {
      toast.error('Failed to load notifications history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearch('');
    setChannelFilter('');
    setStatusFilter('');
    setPage(1);
    fetchLogs();
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (composeRecipientType === 'customer' && !composeCustomerId) {
      toast.error('Please select a recipient customer');
      return;
    }
    if (composeRecipientType === 'loose' && !composeLooseRecipient.trim()) {
      toast.error('Please enter a custom phone number or email address');
      return;
    }
    if (!composeMessage.trim()) {
      toast.error('Please enter the message body');
      return;
    }

    setSubmittingSingle(true);
    try {
      const payload: any = {
        channel: composeChannel,
        type: composeType,
        message: composeMessage,
        subject: composeSubject.trim() || undefined,
      };

      if (composeRecipientType === 'customer') {
        payload.recipientId = composeCustomerId;
      } else {
        payload.recipient = composeLooseRecipient.trim();
      }

      const res = await api.post('/notifications', payload);
      if (res.data?.success) {
        toast.success('Notification queued for simulated delivery!');
        setShowSingleModal(false);
        // Reset form
        setComposeCustomerId('');
        setComposeLooseRecipient('');
        setComposeMessage('');
        setComposeSubject('');
        setComposeTemplate('');
        // Refresh
        fetchLogs();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger alert dispatch');
      console.error(err);
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignTargetType !== 'ALL' && !campaignTargetValue) {
      toast.error('Please select the targeting parameter value');
      return;
    }
    if (!campaignMessage.trim()) {
      toast.error('Please write the campaign alert message body');
      return;
    }

    setSubmittingBulk(true);
    try {
      const res = await api.post('/notifications/campaign', {
        channel: campaignChannel,
        subject: campaignSubject.trim() || undefined,
        message: campaignMessage,
        targetType: campaignTargetType,
        targetValue: campaignTargetValue || undefined,
      });

      if (res.data?.success) {
        const count = res.data.count ?? 0;
        toast.success(`Success! Campaign launched, queued ${count} alerts for dispatch!`);
        setShowBulkModal(false);
        // Reset fields
        setCampaignTargetValue('');
        setCampaignMessage('');
        setCampaignSubject('');
        setCampaignTemplate('');
        // Refresh
        fetchLogs();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run bulk campaign');
      console.error(err);
    } finally {
      setSubmittingBulk(false);
    }
  };

  const applyTemplate = (tplVal: string, type: 'single' | 'bulk') => {
    let finalMessage = tplVal;
    if (type === 'single') {
      setComposeTemplate(tplVal);
      // Pre-fill some defaults if blank
      if (composeRecipientType === 'customer' && tplVal) {
        const selected = customers.find(c => c.id === composeCustomerId);
        if (selected) {
          finalMessage = finalMessage
            .replace(/{{name}}/g, selected.name)
            .replace(/{{customerId}}/g, selected.customerId)
            .replace(/{{amount}}/g, '1,200')
            .replace(/{{receipt}}/g, 'REC-00912');
        }
      }
      setComposeMessage(finalMessage);
    } else {
      setCampaignTemplate(tplVal);
      setCampaignMessage(finalMessage);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <HiOutlineEnvelope style={{ color: '#3B82F6' }} />;
      case 'WHATSAPP':
        return <HiOutlineChatBubbleOvalLeftEllipsis style={{ color: '#10B981' }} />;
      case 'SMS':
        return <HiOutlineBell style={{ color: '#8B5CF6' }} />;
      default:
        return <HiOutlineBell />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'badge-success';
      case 'FAILED':
        return 'badge-danger';
      case 'PENDING':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineBell /> Notification Center
          </h1>
          <p className="page-subtitle">Send alerts, monitor communication statuses, and run bulk information campaigns.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchStats(); fetchLogs(); }}>
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(true)}>
            <HiOutlineMegaphone style={{ marginRight: '4px' }} /> Bulk Campaign
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSingleModal(true)}>
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Compose Alert
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <HiOutlineBell />
            </div>
            <div className="kpi-card-value">{stats.total}</div>
            <div className="kpi-card-label">Total Logs</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sent &amp; failed total</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineCheckCircle />
            </div>
            <div className="kpi-card-value">{stats.successRate}%</div>
            <div className="kpi-card-label">Delivery Success</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated success rate</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
              <HiOutlineBell style={{ transform: 'rotate(15deg)' }} />
            </div>
            <div className="kpi-card-value">{stats.sms}</div>
            <div className="kpi-card-label">SMS Alerts</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Short message service</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
              <HiOutlineEnvelope />
            </div>
            <div className="kpi-card-value">{stats.email}</div>
            <div className="kpi-card-label">Emails</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Electronic notices</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
              <HiOutlineChatBubbleOvalLeftEllipsis />
            </div>
            <div className="kpi-card-value">{stats.whatsapp}</div>
            <div className="kpi-card-label">WhatsApp</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WhatsApp logs count</span>
          </div>
        </div>
      )}

      {/* Main Filter and Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} /> Alert Logs Directory
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {logs.length} of {totalItems} logs
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search recipient address/phone, message text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input form-select"
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Channels</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>
            <select
              className="form-input form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {(search || channelFilter || statusFilter) && (
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
                <th>Created Date</th>
                <th>Channel</th>
                <th>Linked Client</th>
                <th>Recipient Destination</th>
                <th>Subject</th>
                <th>Message Excerpt</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading notification logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No communication logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                        {getChannelIcon(log.channel)} {log.channel}
                      </span>
                    </td>
                    <td>
                      {log.customer ? (
                        <Link href={`/customers/${log.recipientId}`} style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                          {log.customer.name} ({log.customer.customerId})
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Loose Address</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.recipient}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.subject || '—'}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                      {log.message}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          setActiveLog(log);
                          setShowDetailModal(true);
                        }}
                      >
                        Inspect
                      </button>
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
              <div>Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} logs)</div>
              <div className="pagination-pages">
                <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&larr;</button>
                <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&rarr;</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: COMPOSE SINGLE ALERT ───────────────────────── */}
      {showSingleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Compose Single Alert</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSingleModal(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            <form onSubmit={handleSingleSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Recipient Type</label>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={composeRecipientType === 'customer'} onChange={() => setComposeRecipientType('customer')} />
                      Registered Customer
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="radio" checked={composeRecipientType === 'loose'} onChange={() => setComposeRecipientType('loose')} />
                      Custom Phone / Email
                    </label>
                  </div>
                </div>

                {composeRecipientType === 'customer' ? (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Customer</label>
                    <select
                      className="form-input form-select"
                      required
                      value={composeCustomerId}
                      onChange={(e) => setComposeCustomerId(e.target.value)}
                    >
                      <option value="">Choose client...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.customerId} · {c.phone})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Recipient Destination</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. +8801700000000 or client@domain.com"
                      value={composeLooseRecipient}
                      onChange={(e) => setComposeLooseRecipient(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Channel</label>
                    <select
                      className="form-input form-select"
                      value={composeChannel}
                      onChange={(e) => setComposeChannel(e.target.value as any)}
                    >
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Template Helper</label>
                    <select
                      className="form-input form-select"
                      value={composeTemplate}
                      onChange={(e) => applyTemplate(e.target.value, 'single')}
                    >
                      {TEMPLATES.map((t, idx) => (
                        <option key={idx} value={t.value}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {composeChannel === 'EMAIL' && (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Email Subject Header"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Message Body *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    required
                    placeholder="Enter message body text..."
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSingleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingSingle}>
                  {submittingSingle ? 'Sending...' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: BULK CAMPAIGN WIZARD ───────────────────────── */}
      {showBulkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Launch Bulk Campaign</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkModal(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            <form onSubmit={handleBulkSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Target Cohort</label>
                    <select
                      className="form-input form-select"
                      value={campaignTargetType}
                      onChange={(e) => {
                        setCampaignTargetType(e.target.value as any);
                        setCampaignTargetValue('');
                      }}
                    >
                      <option value="ALL">All Active Clients</option>
                      <option value="AREA">Specific Area</option>
                      <option value="PACKAGE">Specific Package</option>
                      <option value="STATUS">Specific Status</option>
                    </select>
                  </div>

                  {campaignTargetType !== 'ALL' && (
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Target Value</label>
                      {campaignTargetType === 'AREA' && (
                        <select
                          className="form-input form-select"
                          required
                          value={campaignTargetValue}
                          onChange={(e) => setCampaignTargetValue(e.target.value)}
                        >
                          <option value="">Select Area...</option>
                          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      )}
                      {campaignTargetType === 'PACKAGE' && (
                        <select
                          className="form-input form-select"
                          required
                          value={campaignTargetValue}
                          onChange={(e) => setCampaignTargetValue(e.target.value)}
                        >
                          <option value="">Select Package...</option>
                          {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      {campaignTargetType === 'STATUS' && (
                        <select
                          className="form-input form-select"
                          required
                          value={campaignTargetValue}
                          onChange={(e) => setCampaignTargetValue(e.target.value)}
                        >
                          <option value="">Select Status...</option>
                          <option value="ACTIVE">Active</option>
                          <option value="DUE_WARNING">Due Warning</option>
                          <option value="GRACE_PERIOD">Grace Period</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="TEMPORARY_DISCONNECT">Temp Disconnected</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Channel</label>
                    <select
                      className="form-input form-select"
                      value={campaignChannel}
                      onChange={(e) => setCampaignChannel(e.target.value as any)}
                    >
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Template Helper</label>
                    <select
                      className="form-input form-select"
                      value={campaignTemplate}
                      onChange={(e) => applyTemplate(e.target.value, 'bulk')}
                    >
                      {TEMPLATES.map((t, idx) => (
                        <option key={idx} value={t.value}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {campaignChannel === 'EMAIL' && (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Campaign Subject Header"
                      value={campaignSubject}
                      onChange={(e) => setCampaignSubject(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Campaign Message *</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    required
                    placeholder="E.g. Dear {{name}}, fiber work is ongoing..."
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    💡 Use tags <strong>{"{{name}}"}</strong> and <strong>{"{{customerId}}"}</strong> for dynamic user merges.
                  </span>
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingBulk}>
                  {submittingBulk ? 'Launching Campaign...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: LOG INSPECTOR DETAIL ───────────────────────── */}
      {showDetailModal && activeLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Inspect Log Details</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetailModal(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created At:</span>
                <strong>{new Date(activeLog.createdAt).toLocaleString()}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Channel / Type:</span>
                <span>{activeLog.channel} / {activeLog.type}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Linked Client:</span>
                <span>{activeLog.customer ? `${activeLog.customer.name} (${activeLog.customer.customerId})` : '—'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recipient Destination:</span>
                <strong>{activeLog.recipient}</strong>
              </div>

              {activeLog.subject && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email Subject:</span>
                  <span>{activeLog.subject}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery Status:</span>
                <div>
                  <span className={`badge ${getStatusBadgeClass(activeLog.status)}`}>{activeLog.status}</span>
                </div>
              </div>

              {activeLog.sentAt && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sent Timestamp:</span>
                  <span>{new Date(activeLog.sentAt).toLocaleString()}</span>
                </div>
              )}

              {activeLog.errorMessage && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', color: 'var(--danger-600)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Failure Details:</span>
                  <strong style={{ fontSize: '12px' }}>⚠️ {activeLog.errorMessage}</strong>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Message Body:</span>
                <div style={{
                  background: 'var(--neutral-50)', padding: '12px', borderRadius: '6px',
                  whiteSpace: 'pre-wrap', lineHeight: '1.4', fontFamily: 'monospace', fontSize: '12.5px',
                  color: 'var(--text-primary)', border: '1px solid var(--neutral-200)'
                }}>
                  {activeLog.message}
                </div>
              </div>
            </div>
            <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'flex-end', padding: '12px 20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

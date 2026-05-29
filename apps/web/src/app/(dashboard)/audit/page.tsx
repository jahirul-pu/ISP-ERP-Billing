'use client';

import { useState, useEffect } from 'react';
import {
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | string;
  entity: string;
  entityId: string | null;
  oldValues: any | null;
  newValues: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role?: {
      displayName: string;
    };
  } | null;
}

interface AuditStats {
  total: number;
  mutations: number;
  security: number;
  activeUsers: number;
  activeIps: number;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Inspector Modal
  const [showInspector, setShowInspector] = useState(false);
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/audit-logs/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit-logs?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (entityFilter) url += `&entity=${entityFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotalItems(res.data.meta.total);
      }
    } catch (err) {
      toast.error('Failed to load audit trail history');
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
    setActionFilter('');
    setEntityFilter('');
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'badge-success';
      case 'UPDATE':
        return 'badge-info';
      case 'DELETE':
        return 'badge-danger';
      case 'LOGIN':
        return 'badge-primary';
      case 'LOGIN_FAILED':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <HiOutlineDocumentText style={{ color: '#10B981' }} />;
      case 'UPDATE':
        return <HiOutlineDocumentText style={{ color: '#3B82F6' }} />;
      case 'DELETE':
        return <HiOutlineExclamationCircle style={{ color: '#EF4444' }} />;
      case 'LOGIN':
        return <HiOutlineLockOpen style={{ color: '#8B5CF6' }} />;
      case 'LOGIN_FAILED':
        return <HiOutlineLockClosed style={{ color: '#F59E0B' }} />;
      default:
        return <HiOutlineShieldCheck style={{ color: '#6B7280' }} />;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineShieldCheck /> Audit Log Explorer
          </h1>
          <p className="page-subtitle">Monitor administrative changes, security alerts, and full database transaction history.</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchStats(); fetchLogs(); }}>
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh Trail
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
              <HiOutlineShieldCheck />
            </div>
            <div className="kpi-card-value">{stats.total}</div>
            <div className="kpi-card-label">Total Logs</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>All events logged</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
              <HiOutlineDocumentText />
            </div>
            <div className="kpi-card-value">{stats.mutations}</div>
            <div className="kpi-card-label">Write Mutations</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CREATE, UPDATE, DELETE</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
              <HiOutlineLockOpen />
            </div>
            <div className="kpi-card-value">{stats.security}</div>
            <div className="kpi-card-label">Logins Audited</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Successful authentications</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineUser />
            </div>
            <div className="kpi-card-value">{stats.activeUsers}</div>
            <div className="kpi-card-label">Operators Active</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distinct users today</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
              <HiOutlineLockClosed />
            </div>
            <div className="kpi-card-value">{stats.activeIps}</div>
            <div className="kpi-card-label">Unique IPs Today</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distinct client networks</span>
          </div>
        </div>
      )}

      {/* Main Filter and Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} /> Filters & Audit Logs
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {logs.length} of {totalItems} events
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search user email/name, IP, entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input form-select"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            </select>
            <select
              className="form-input form-select"
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Entities</option>
              <option value="customers">Customers</option>
              <option value="billing">Billing (Invoices)</option>
              <option value="collections">Collections (Payments)</option>
              <option value="users">Users</option>
              <option value="roles">Roles</option>
              <option value="hr">HR / Staff</option>
              <option value="inventory">Inventory</option>
              <option value="tickets">Support Tickets</option>
              <option value="notifications">Notifications</option>
              <option value="areas">Geography / Areas</option>
              <option value="packages">Internet Packages</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {(search || actionFilter || entityFilter) && (
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
                <th>Timestamp</th>
                <th>Action</th>
                <th>Operator</th>
                <th>Role</th>
                <th>Entity Target</th>
                <th>Entity Target ID</th>
                <th>IP Address</th>
                <th style={{ textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No audit trail logs found matching search criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {getActionIcon(log.action)} {log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {log.user ? (
                        <span>{log.user.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({log.user.email})</span></span>
                      ) : log.newValues?.email ? (
                        <span>System <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>({log.newValues.email})</span></span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>System / Automated</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {log.user?.role?.displayName || '—'}
                    </td>
                    <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {log.entity}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {log.entityId || '—'}
                    </td>
                    <td>
                      {log.ipAddress || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          setActiveLog(log);
                          setShowInspector(true);
                        }}
                      >
                        Inspect Payload
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

      {/* ─── MODAL: PAYLOAD INSPECTOR ───────────────────────── */}
      {showInspector && activeLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', margin: '20px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineShieldCheck /> Audit Log Inspector
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {activeLog.id}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInspector(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            
            <div className="card-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              
              {/* Meta information row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--neutral-50)', padding: '12px', borderRadius: '6px', border: '1px solid var(--neutral-200)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Timestamp</span>
                  <strong>{new Date(activeLog.createdAt).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Operator</span>
                  <strong>{activeLog.user?.name || 'System / Seed'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>IP Address</span>
                  <strong>{activeLog.ipAddress || 'Unknown'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Action &amp; Entity</span>
                  <span className={`badge ${getActionBadgeClass(activeLog.action)}`}>
                    {activeLog.action} · {activeLog.entity}
                  </span>
                </div>
              </div>

              {activeLog.userAgent && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Client User-Agent:</span>
                  <div style={{ background: 'var(--neutral-100)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid var(--neutral-200)' }}>
                    {activeLog.userAgent}
                  </div>
                </div>
              )}

              {/* Payloads side-by-side or stacked */}
              <div style={{ display: 'grid', gridTemplateColumns: activeLog.oldValues ? '1fr 1fr' : '1fr', gap: '16px' }}>
                {activeLog.oldValues && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      🔴 Old Values (Pre-mutation)
                    </span>
                    <pre style={{
                      background: '#FFF5F5', padding: '12px', borderRadius: '6px',
                      whiteSpace: 'pre-wrap', lineHeight: '1.4', fontFamily: 'monospace', fontSize: '12px',
                      color: '#C53030', border: '1px solid #FEB2B2', overflowX: 'auto', maxHeight: '350px'
                    }}>
                      {JSON.stringify(activeLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    {activeLog.oldValues ? '🟢 New Values (Post-mutation)' : '📋 Event Payload / Parameters'}
                  </span>
                  <pre style={{
                    background: activeLog.oldValues ? '#F0FDF4' : 'var(--neutral-50)', padding: '12px', borderRadius: '6px',
                    whiteSpace: 'pre-wrap', lineHeight: '1.4', fontFamily: 'monospace', fontSize: '12px',
                    color: activeLog.oldValues ? '#15803D' : 'var(--text-primary)',
                    border: activeLog.oldValues ? '1px solid #BBF7D0' : '1px solid var(--neutral-200)',
                    overflowX: 'auto', maxHeight: '350px'
                  }}>
                    {JSON.stringify(activeLog.newValues || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'flex-end', padding: '12px 20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowInspector(false)}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

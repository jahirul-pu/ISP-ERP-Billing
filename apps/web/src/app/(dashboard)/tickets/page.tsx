'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineTicket,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  customer: {
    customerId: string;
    name: string;
    phone: string;
  };
  assignedTo?: {
    name: string;
  };
}

interface Stats {
  status: {
    OPEN: number;
    ASSIGNED: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  priority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  type: {
    TECHNICAL: number;
    BILLING: number;
    SERVICE_REQUEST: number;
  };
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters state
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    fetchData();
  }, [page, status, priority, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/tickets?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
      if (priority) url += `&priority=${priority}`;
      if (type) url += `&type=${type}`;

      const [ticketsRes, statsRes] = await Promise.all([
        api.get(url),
        api.get('/tickets/stats'),
      ]);

      if (ticketsRes.data?.success) {
        setTickets(ticketsRes.data.data);
        setTotalPages(ticketsRes.data.meta.totalPages);
        setTotalItems(ticketsRes.data.meta.total);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load support tickets');
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
    setPriority('');
    setType('');
    setPage(1);
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'badge-danger';
      case 'HIGH':
        return 'badge-warning';
      case 'MEDIUM':
        return 'badge-primary';
      case 'LOW':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'OPEN':
        return 'badge-danger';
      case 'ASSIGNED':
        return 'badge-primary';
      case 'IN_PROGRESS':
        return 'badge-warning';
      case 'RESOLVED':
        return 'badge-success';
      case 'CLOSED':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getTicketTypeLabel = (t: string) => {
    switch (t) {
      case 'TECHNICAL':
        return 'Technical';
      case 'BILLING':
        return 'Billing';
      case 'SERVICE_REQUEST':
        return 'Service Request';
      default:
        return t;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Track, assign, and resolve support requests and customer complaints.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} title="Refresh lists">
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh
          </button>
          <Link href="/tickets/new" className="btn btn-primary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> File Ticket
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              <HiOutlineExclamationCircle />
            </div>
            <div className="kpi-card-value">{stats.status.OPEN}</div>
            <div className="kpi-card-label">Open Tickets</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requires assignment</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <HiOutlineTicket />
            </div>
            <div className="kpi-card-value">{stats.status.ASSIGNED + stats.status.IN_PROGRESS}</div>
            <div className="kpi-card-label">Active Support</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned &amp; In Progress</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineCheckCircle />
            </div>
            <div className="kpi-card-value">{stats.status.RESOLVED}</div>
            <div className="kpi-card-label">Resolved Tickets</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting confirmation</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              <HiOutlineClock />
            </div>
            <div className="kpi-card-value">{stats.status.CLOSED}</div>
            <div className="kpi-card-label">Closed Archive</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total tickets archived</span>
          </div>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} />
              All Tickets
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {tickets.length} of {totalItems} tickets
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto auto', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search subject, ticket #, customer name/ID..."
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
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              className="form-input form-select"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select
              className="form-input form-select"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option value="TECHNICAL">Technical</option>
              <option value="BILLING">Billing</option>
              <option value="SERVICE_REQUEST">Service Request</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {(search || status || priority || type) && (
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
                <th>Ticket No.</th>
                <th>Subject</th>
                <th>Client Name</th>
                <th>Client ID</th>
                <th>Assigned Tech</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Filed Date</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Loading support tickets...</div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No support tickets found matching your filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                      <Link href={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.subject}>
                      {t.subject}
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.customer?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.customer?.customerId || '—'}</td>
                    <td>
                      {t.assignedTo ? (
                        <span style={{ fontWeight: 500 }}>{t.assignedTo.name}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {getTicketTypeLabel(t.type)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link href={`/tickets/${t.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
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
                Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} tickets)
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
    </div>
  );
}

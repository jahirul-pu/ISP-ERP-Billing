'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineChevronLeft,
  HiOutlineUser,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineWrenchScrewdriver,
  HiOutlineArchiveBox,
  HiOutlineLockClosed,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  area?: { name: string };
  zone?: { name: string };
  package?: { name: string; bandwidth: string };
}

interface User {
  id: string;
  name: string;
  role?: { displayName: string };
}

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  authorId?: string;
  authorName: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  resolution?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  customer: Customer;
  assignedTo?: User;
  comments: Comment[];
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // Form states
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [showResolutionBox, setShowResolutionBox] = useState(false);

  useEffect(() => {
    fetchTicketData();
    fetchUsersList();
  }, [id]);

  const fetchTicketData = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      if (res.data?.success) {
        setTicket(res.data.data);
        if (res.data.data.resolution) {
          setResolutionText(res.data.data.resolution);
        }
      }
    } catch (err) {
      toast.error('Failed to load support ticket details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await api.get('/users?limit=100');
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignChange = async (userId: string) => {
    setUpdatingTicket(true);
    try {
      const res = await api.patch(`/tickets/${id}`, {
        assignedToId: userId || null,
        // If ticket was open, it transitions to ASSIGNED when assigned to someone
        status: ticket?.status === 'OPEN' && userId ? 'ASSIGNED' : undefined,
      });

      if (res.data?.success) {
        toast.success(userId ? 'Ticket assigned successfully' : 'Ticket unassigned');
        fetchTicketData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ticket assignment');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (status === 'RESOLVED' && !showResolutionBox && !ticket?.resolution) {
      setShowResolutionBox(true);
      return;
    }

    setUpdatingTicket(true);
    try {
      const payload: any = { status };
      if (status === 'RESOLVED' && resolutionText.trim()) {
        payload.resolution = resolutionText.trim();
      }

      const res = await api.patch(`/tickets/${id}`, payload);

      if (res.data?.success) {
        toast.success(`Ticket status updated to ${status}`);
        setShowResolutionBox(false);
        fetchTicketData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/tickets/${id}/comments`, {
        content: newComment.trim(),
        isInternal,
      });

      if (res.data?.success) {
        setNewComment('');
        setIsInternal(false);
        fetchTicketData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPriorityBadgeClass = (p?: string) => {
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

  const getStatusBadgeClass = (s?: string) => {
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

  if (loading) {
    return (
      <div style={{ padding: '40px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px', marginBottom: '24px' }}></div>
        <div className="skeleton" style={{ height: '350px', borderRadius: '12px' }}></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Support ticket not found</h2>
        <Link href="/tickets" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/tickets">Tickets</Link>
        <span className="separator">/</span>
        <span>{ticket.ticketNumber}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
            <HiOutlineChevronLeft style={{ fontSize: '20px' }} />
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {ticket.ticketNumber}: {ticket.subject}
              <span className={`badge ${getStatusBadgeClass(ticket.status)}`} style={{ fontSize: '12px' }}>
                {ticket.status.replace('_', ' ')}
              </span>
            </h1>
            <p className="page-subtitle">
              Category: {ticket.type} | Priority:{' '}
              <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`} style={{ display: 'inline', padding: '2px 6px', fontSize: '11px' }}>
                {ticket.priority}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Main Conversation & Resolution panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Description */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Issue Description
            </h3>
            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
              {ticket.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
            </p>
          </div>

          {/* Resolution Input Box (Toggled on Resolving) */}
          {showResolutionBox && (
            <div className="card" style={{ padding: '20px', border: '1px solid var(--success-500)', background: '#F0FDF4' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success-700)', marginBottom: '12px' }}>
                Provide Resolution Details
              </h3>
              <textarea
                className="form-input"
                placeholder="Explain what steps were taken to resolve this customer complaint..."
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                style={{ height: '90px', padding: '10px', background: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowResolutionBox(false)}>
                  Cancel
                </button>
                <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate('RESOLVED')} disabled={updatingTicket}>
                  Mark Resolved
                </button>
              </div>
            </div>
          )}

          {/* Existing Resolution Display */}
          {ticket.status === 'RESOLVED' && ticket.resolution && (
            <div className="card" style={{ padding: '20px', border: '1px solid var(--success-300)', background: 'var(--neutral-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-600)', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                <HiOutlineCheckCircle /> Ticket Resolution Details
              </div>
              <p style={{ fontSize: '13.5px', margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.resolution}</p>
              {ticket.resolvedAt && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                  Resolved at: {new Date(ticket.resolvedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Comments timeline */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '10px' }}>
              <HiOutlineChatBubbleLeftRight /> Conversation &amp; Staff Notes
            </h3>

            {/* Conversation Log list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {ticket.comments.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  No comments or logs filed for this ticket yet.
                </p>
              ) : (
                ticket.comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: c.isInternal ? '#FFFBEB' : 'var(--neutral-50)',
                      borderLeft: c.isInternal ? '3px solid var(--warning-500)' : '3px solid var(--primary-500)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      alignSelf: 'stretch',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: c.isInternal ? 'var(--warning-700)' : 'var(--primary-700)' }}>
                        {c.authorName} {c.isInternal ? '(Internal Note)' : '(Customer Reply)'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment creation form */}
            {ticket.status !== 'CLOSED' ? (
              <form onSubmit={handleAddComment} style={{ marginTop: '10px', borderTop: '1px solid var(--neutral-100)', paddingTop: '16px' }}>
                <div className="form-group">
                  <textarea
                    className="form-input"
                    placeholder="Type your response or internal technician notes..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{ height: '70px', padding: '10px', resize: 'none' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Mark as Internal Technical Note (Staff only)
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submittingComment}>
                    {submittingComment ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                🗃️ This ticket is archived/closed. New comments cannot be added.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Workflow & Status Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '8px' }}>
              Ticket State
            </h3>

            {/* Status updates */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Current Status</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {ticket.status !== 'CLOSED' ? (
                  <>
                    {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                        onClick={() => handleStatusUpdate('IN_PROGRESS')}
                        disabled={updatingTicket}
                      >
                        <HiOutlineWrenchScrewdriver /> Start Work
                      </button>
                    )}
                    {ticket.status !== 'RESOLVED' && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                        onClick={() => handleStatusUpdate('RESOLVED')}
                        disabled={updatingTicket}
                      >
                        <HiOutlineCheckCircle /> Resolve Issue
                      </button>
                    )}
                    <button
                      className="btn btn-neutral btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                      onClick={() => handleStatusUpdate('CLOSED')}
                      disabled={updatingTicket}
                    >
                      <HiOutlineLockClosed /> Archive / Close
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HiOutlineArchiveBox /> Archived on {ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
            </div>

            {/* Assignee selection */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Assign Technician</label>
              <select
                className="form-input form-select"
                style={{ fontSize: '12px', height: '32px', marginTop: '4px' }}
                value={ticket.assignedTo?.id || ''}
                onChange={(e) => handleAssignChange(e.target.value)}
                disabled={updatingTicket || ticket.status === 'CLOSED'}
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.displayName || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Timestamps */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div>Filed: {new Date(ticket.createdAt).toLocaleString()}</div>
              {ticket.resolvedAt && <div>Resolved: {new Date(ticket.resolvedAt).toLocaleString()}</div>}
              {ticket.closedAt && <div>Closed: {new Date(ticket.closedAt).toLocaleString()}</div>}
            </div>
          </div>

          {/* Customer Summary Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '8px' }}>
              Customer Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Client Name</span>
                <span style={{ fontWeight: 600 }}>{ticket.customer.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer ID</span>
                <span style={{ fontFamily: 'monospace' }}>{ticket.customer.customerId}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Phone</span>
                <span>{ticket.customer.phone}</span>
              </div>
              {ticket.customer.area && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Area</span>
                  <span>{ticket.customer.area.name}</span>
                </div>
              )}
              {ticket.customer.package && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Internet Package</span>
                  <span className="badge badge-neutral" style={{ width: 'fit-content', marginTop: '2px' }}>
                    {ticket.customer.package.name} ({ticket.customer.package.bandwidth})
                  </span>
                </div>
              )}
              <Link href={`/customers/${ticket.customer.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '10px', textAlign: 'center', display: 'block' }}>
                <HiOutlineUser style={{ marginRight: '4px' }} /> View Full Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

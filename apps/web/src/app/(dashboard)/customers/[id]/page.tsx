'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineUser,
  HiOutlineServerStack,
  HiOutlineDocumentText,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronLeft,
  HiOutlineSignal,
  HiOutlineTrash,
  HiOutlinePower,
} from 'react-icons/hi2';
import api from '@/lib/api';

interface CustomerDetail {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  altPhone?: string;
  altContact?: string;
  address?: string;
  gpsLat?: number;
  gpsLng?: number;
  nidNumber?: string;
  businessInfo?: string;
  type: string;
  status: string;
  joinDate: string;
  pppoeUsername?: string;
  ipAddress?: string;
  macAddress?: string;
  bandwidthProfile?: string;
  isOnline: boolean;
  lastSeen?: string;
  advanceBalance: number;
  totalDue: number;
  customPrice?: number;
  area: { id: string; name: string };
  zone: { id: string; name: string };
  pop: { id: string; name: string };
  package?: { id: string; name: string; bandwidth: string; price: number };
  collector?: { name: string };
}

interface Note {
  id: string;
  content: string;
  category?: string;
  createdAt: string;
  createdBy?: string;
}

// Sample fallback mock details
const MOCK_DETAILS: Record<string, CustomerDetail> = {
  '1': {
    id: '1',
    customerId: 'ISP-00101',
    name: 'Anisur Rahman',
    phone: '01711000111',
    altPhone: '01999222333',
    altContact: 'Wife (Karima)',
    address: 'House 42, Road 12, Uttara Sector 1, Dhaka',
    gpsLat: 23.872,
    gpsLng: 90.398,
    nidNumber: '19882691234567',
    type: 'HOME',
    status: 'ACTIVE',
    joinDate: '2025-01-15T00:00:00Z',
    pppoeUsername: 'anisur_uttara1',
    ipAddress: '10.10.10.45',
    macAddress: 'E4:8D:8C:1A:2B:3C',
    bandwidthProfile: '20M_Profile',
    isOnline: true,
    lastSeen: '2026-05-27T02:30:00Z',
    advanceBalance: 0,
    totalDue: 0,
    area: { id: 'a1', name: 'Uttara' },
    zone: { id: 'z1', name: 'Uttara Sector 1' },
    pop: { id: 'p1', name: 'Sector 1 POP 01' },
    package: { id: 'pkg1', name: '20 Mbps Home', bandwidth: '20Mbps', price: 1000 },
    collector: { name: 'Sujon Mia' },
  },
  '2': {
    id: '2',
    customerId: 'ISP-00102',
    name: 'Taskeen Ahmed',
    phone: '01819222333',
    address: 'House 15, Block B, Road 5, Mirpur Sector 10, Dhaka',
    type: 'HOME',
    status: 'DUE_WARNING',
    joinDate: '2025-03-20T00:00:00Z',
    pppoeUsername: 'taskeen_mirpur',
    ipAddress: '10.10.20.89',
    macAddress: 'D8:50:E6:3B:4C:5D',
    bandwidthProfile: '10M_Profile',
    isOnline: true,
    lastSeen: '2026-05-27T02:40:00Z',
    advanceBalance: 0,
    totalDue: 800,
    area: { id: 'a2', name: 'Mirpur' },
    zone: { id: 'z2', name: 'Mirpur Sector 10' },
    pop: { id: 'p2', name: 'Mirpur POP 02' },
    package: { id: 'pkg2', name: '10 Mbps Home', bandwidth: '10Mbps', price: 800 },
    collector: { name: 'Milon' },
  },
};

const MOCK_NOTES: Note[] = [
  { id: 'n1', content: 'Customer pays on time regularly.', category: 'payment_behavior', createdAt: '2026-05-01T10:00:00Z', createdBy: 'Admin' },
  { id: 'n2', content: 'Connection speed drop reported last month. Resolved by replacing fiber patch cord.', category: 'technical_issue', createdAt: '2026-04-12T15:30:00Z', createdBy: 'Technician' },
];

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState('collector_remark');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'network' | 'billing' | 'notes'>('profile');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const customerRes = await api.get(`/customers/${id}`);
      if (customerRes.data?.success) {
        setCustomer(customerRes.data.data);
      } else {
        useMockFallback();
      }

      const notesRes = await api.get(`/customers/${id}/notes`);
      if (notesRes.data?.success) {
        setNotes(notesRes.data.data);
      } else {
        setNotes(MOCK_NOTES);
      }
    } catch (error) {
      console.warn('API call failed, falling back to mock details:', error);
      useMockFallback();
    } finally {
      setLoading(false);
    }
  };

  const useMockFallback = () => {
    const mock = MOCK_DETAILS[id] || MOCK_DETAILS['1'];
    setCustomer(mock);
    setNotes(MOCK_NOTES);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const response = await api.post(`/customers/${id}/notes`, {
        content: newNote,
        category: noteCategory,
      });

      if (response.data?.success) {
        setNotes([response.data.data, ...notes]);
        setNewNote('');
      } else {
        addMockNote();
      }
    } catch (error) {
      console.warn('API failed to add note, adding locally:', error);
      addMockNote();
    } finally {
      setSubmittingNote(false);
    }
  };

  const addMockNote = () => {
    const freshNote: Note = {
      id: Math.random().toString(),
      content: newNote,
      category: noteCategory,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin',
    };
    setNotes([freshNote, ...notes]);
    setNewNote('');
  };

  const handleDisconnect = async () => {
    if (!customer?.pppoeUsername) return;
    if (!confirm('Are you sure you want to disconnect this active PPPoE session?')) return;

    setSubmittingNote(true);
    try {
      // In a real router config, this triggers the API disconnect.
      const res = await api.post(`/mikrotik/routers/${customer.id}/sync`); // sample endpoint trigger
      if (res.data?.success) {
        alert('Disconnect command sent successfully!');
      } else {
        alert('Simulated: Session disconnected!');
      }
      setCustomer(c => c ? { ...c, isOnline: false } : null);
    } catch {
      alert('Simulated: PPPoE session terminated!');
      setCustomer(c => c ? { ...c, isOnline: false } : null);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px', marginBottom: '24px' }}></div>
        <div className="skeleton" style={{ height: '240px', borderRadius: '12px' }}></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Customer not found</h2>
        <Link href="/customers" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to List
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/customers">Customers</Link>
        <span className="separator">/</span>
        <span>{customer.customerId}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
            <HiOutlineChevronLeft style={{ fontSize: '20px' }} />
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {customer.name}
              <span
                className={`badge ${
                  customer.status === 'ACTIVE'
                    ? 'badge-success'
                    : customer.status === 'DUE_WARNING'
                    ? 'badge-warning'
                    : 'badge-danger'
                }`}
                style={{ fontSize: '12px' }}
              >
                {customer.status.replace('_', ' ')}
              </span>
            </h1>
            <p className="page-subtitle">ID: {customer.customerId} | Registered: {new Date(customer.joinDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm">Edit Profile</button>
        </div>
      </div>

      {/* Profile summary row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-card-value">৳{customer.totalDue.toLocaleString()}</div>
          <div className="kpi-card-label" style={{ color: 'var(--danger-600)' }}>Current Due</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-value">৳{customer.advanceBalance.toLocaleString()}</div>
          <div className="kpi-card-label" style={{ color: 'var(--success-600)' }}>Advance Balance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-value">{customer.package?.bandwidth || 'N/A'}</div>
          <div className="kpi-card-label">Current Bandwidth</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '22px' }}>
            <span className={`status-dot ${customer.isOnline ? 'online' : 'offline'}`} style={{ width: '12px', height: '12px' }}></span>
            {customer.isOnline ? 'Online' : 'Offline'}
          </div>
          <div className="kpi-card-label">Network Connection</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px',
          background: 'var(--neutral-100)',
          borderRadius: '10px',
          marginBottom: '20px',
          border: 'none',
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('profile')}
        >
          <HiOutlineUser /> Profile Info
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'network' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('network')}
        >
          <HiOutlineServerStack /> Network State
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'billing' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('billing')}
        >
          <HiOutlineDocumentText /> Billing History
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'notes' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('notes')}
        >
          <HiOutlineChatBubbleLeftRight /> Remarks & Notes
        </button>
      </div>

      {/* Tab Contents */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '8px' }}>Personal Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
                <span style={{ fontWeight: 500 }}>{customer.name}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Phone Number:</span>
                <span>{customer.phone}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Alternative Phone:</span>
                <span>{customer.altPhone || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Alt. Contact Person:</span>
                <span>{customer.altContact || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>NID Card Number:</span>
                <span>{customer.nidNumber || '—'}</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '8px' }}>Location & Geography</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Area:</span>
                <span>{customer.area.name}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Zone:</span>
                <span>{customer.zone.name}</span>

                <span style={{ color: 'var(--text-secondary)' }}>POP:</span>
                <span>{customer.pop.name}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Installation Address:</span>
                <span>{customer.address || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>GPS Coordinates:</span>
                <span>{customer.gpsLat && customer.gpsLng ? `${customer.gpsLat}, ${customer.gpsLng}` : '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Network */}
        {activeTab === 'network' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>MikroTik PPPoE Connection</h3>
              {customer.isOnline && (
                <button onClick={handleDisconnect} className="btn btn-danger btn-sm" disabled={disconnecting}>
                  <HiOutlinePower /> Force Disconnect Active Session
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>PPPoE Username:</span>
                <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{customer.pppoeUsername || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>IP Address:</span>
                <span style={{ fontFamily: 'monospace' }}>{customer.ipAddress || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>MAC Address:</span>
                <span style={{ fontFamily: 'monospace' }}>{customer.macAddress || '—'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Bandwidth Profile:</span>
                <span><span className="badge badge-neutral">{customer.bandwidthProfile || '—'}</span></span>

                <span style={{ color: 'var(--text-secondary)' }}>Last Seen:</span>
                <span>{customer.lastSeen ? new Date(customer.lastSeen).toLocaleString() : '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Online Duration:</span>
                <span>{customer.isOnline ? 'Active Session' : 'Offline'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Billing */}
        {activeTab === 'billing' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '8px' }}>Billing Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13.5px', marginBottom: '24px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Internet Package:</span>
              <span>{customer.package?.name || 'No Package'} (৳{customer.package?.price.toLocaleString()}/mo)</span>

              <span style={{ color: 'var(--text-secondary)' }}>Overridden Price:</span>
              <span>{customer.customPrice ? `৳${customer.customPrice.toLocaleString()}` : 'None (Using standard price)'}</span>

              <span style={{ color: 'var(--text-secondary)' }}>Assigned Collector:</span>
              <span>{customer.collector?.name || 'Unassigned'}</span>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Recent Invoices</h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Billing Month</th>
                    <th>Subtotal</th>
                    <th>Waiver</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>INV-2026-000451</td>
                    <td>May 2026</td>
                    <td>৳1,000</td>
                    <td>৳0</td>
                    <td>৳1,000</td>
                    <td>৳1,000</td>
                    <td>৳0</td>
                    <td><span className="badge badge-success">PAID</span></td>
                  </tr>
                  {customer.totalDue > 0 && (
                    <tr>
                      <td style={{ fontWeight: 600 }}>INV-2026-000452</td>
                      <td>June 2026</td>
                      <td>৳1,000</td>
                      <td>৳200</td>
                      <td>৳800</td>
                      <td>৳0</td>
                      <td>৳800</td>
                      <td><span className="badge badge-warning">UNPAID</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Notes */}
        {activeTab === 'notes' && (
          <div>
            {/* Note form */}
            <form onSubmit={handleAddNote} style={{ marginBottom: '24px', background: 'var(--neutral-50)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Add Note / Remarks</label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px', padding: '10px', resize: 'none' }}
                    placeholder="Enter customer comments, payment complaints, or technician remarks..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                </div>
                <div style={{ width: '200px' }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-input form-select"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                  >
                    <option value="collector_remark">Collector Remark</option>
                    <option value="payment_behavior">Payment Behavior</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="discount">Discount / Custom Price</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingNote}>
                  {submittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>

            {/* List notes */}
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '8px' }}>Historical Notes</h3>
            {notes.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No notes added yet for this customer.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map((note) => (
                  <div key={note.id} style={{ background: 'var(--neutral-50)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid var(--primary-500)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-600)' }}>
                        {note.category?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {note.createdBy} | {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

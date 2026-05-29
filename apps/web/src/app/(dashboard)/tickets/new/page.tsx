'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineChevronLeft } from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  pppoeUsername?: string;
}

interface User {
  id: string;
  name: string;
  role: {
    displayName: string;
  };
}

export default function NewTicketPage() {
  const router = useRouter();

  // Form states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [type, setType] = useState('TECHNICAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // Dropdown customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [customersRes, usersRes] = await Promise.all([
        api.get('/customers?limit=10'),
        api.get('/users?limit=100'),
      ]);

      if (customersRes.data?.success) {
        setCustomers(customersRes.data.data);
      }
      if (usersRes.data?.success) {
        setUsers(usersRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleCustomerSearch = async (val: string) => {
    setCustomerSearch(val);
    if (!val.trim()) return;

    setCustomerLoading(true);
    try {
      const res = await api.get(`/customers?limit=10&search=${encodeURIComponent(val)}`);
      if (res.data?.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a ticket subject.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customerId: selectedCustomerId,
        type,
        priority,
        subject,
        description: description.trim() || undefined,
      };

      if (assignedToId) {
        payload.assignedToId = assignedToId;
      }

      const res = await api.post('/tickets', payload);

      if (res.data?.success) {
        toast.success(`Ticket ${res.data.data.ticketNumber} created successfully!`);
        router.push('/tickets');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create support ticket');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/tickets">Tickets</Link>
        <span className="separator">/</span>
        <span>File New Ticket</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
            <HiOutlineChevronLeft style={{ fontSize: '20px' }} />
          </button>
          <div>
            <h1 className="page-title">File Support Ticket</h1>
            <p className="page-subtitle">Register a technical, billing, or general request for a client connection.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          {/* Customer Selection */}
          <div className="form-group">
            <label className="form-label">Client / Customer *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type customer name, phone, customer ID to search..."
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <select
                className="form-input form-select"
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const selected = customers.find(c => c.id === e.target.value);
                  if (selected) {
                    setCustomerSearch(selected.name);
                  }
                }}
                required
              >
                <option value="">-- Select Client from Search Results --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerId}) {c.pppoeUsername ? `| PPPoE: ${c.pppoeUsername}` : ''} | {c.phone}
                  </option>
                ))}
              </select>
              {customerLoading && (
                <span style={{ position: 'absolute', right: '35px', top: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Searching...
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Category / Type */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="TECHNICAL">Technical Issue</option>
                <option value="BILLING">Billing Issue</option>
                <option value="SERVICE_REQUEST">Service Request</option>
              </select>
            </div>

            {/* Priority */}
            <div className="form-group">
              <label className="form-label">Priority *</label>
              <select
                className="form-input form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label">Subject / Issue Summary *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Speed drop in evening, ONU optical power warning, Billing dispute"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Detailed Description</label>
            <textarea
              className="form-input"
              placeholder="Provide exact details of the complaint, router log readings, physical conditions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ height: '120px', padding: '10px' }}
            />
          </div>

          {/* Initial Technician Assignment */}
          <div className="form-group">
            <label className="form-label">Assign Technician (Optional)</label>
            <select
              className="form-input form-select"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">-- Leave Unassigned (Will state as OPEN) --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.displayName || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
            <Link href="/tickets" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting Ticket...' : 'File Support Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

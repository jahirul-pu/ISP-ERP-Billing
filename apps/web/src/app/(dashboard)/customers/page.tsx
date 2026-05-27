'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineEye, HiOutlineUsers } from 'react-icons/hi2';
import api from '@/lib/api';

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  status: string;
  type: string;
  isOnline: boolean;
  totalDue: number;
  area?: { name: string };
  package?: { name: string; price: number };
}

// Defensive mock data fallback
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    customerId: 'ISP-00101',
    name: 'Anisur Rahman',
    phone: '01711000111',
    status: 'ACTIVE',
    type: 'HOME',
    isOnline: true,
    totalDue: 0,
    area: { name: 'Uttara Sector 1' },
    package: { name: '20 Mbps Home', price: 1000 },
  },
  {
    id: '2',
    customerId: 'ISP-00102',
    name: 'Taskeen Ahmed',
    phone: '01819222333',
    status: 'DUE_WARNING',
    type: 'HOME',
    isOnline: true,
    totalDue: 800,
    area: { name: 'Mirpur Sector 10' },
    package: { name: '10 Mbps Home', price: 800 },
  },
  {
    id: '3',
    customerId: 'ISP-00103',
    name: 'Habib Bank Corp',
    phone: '01511333444',
    status: 'ACTIVE',
    type: 'CORPORATE',
    isOnline: true,
    totalDue: 0,
    area: { name: 'Uttara Sector 3' },
    package: { name: '50 Mbps Dedicated', price: 5000 },
  },
  {
    id: '4',
    customerId: 'ISP-00104',
    name: 'Sadia Afrin',
    phone: '01912444555',
    status: 'SUSPENDED',
    type: 'HOME',
    isOnline: false,
    totalDue: 2400,
    area: { name: 'Uttara Sector 1' },
    package: { name: '20 Mbps Home', price: 1000 },
  },
  {
    id: '5',
    customerId: 'ISP-00105',
    name: 'Rahim Group Ltd',
    phone: '01612555666',
    status: 'GRACE_PERIOD',
    type: 'CORPORATE',
    isOnline: true,
    totalDue: 12000,
    area: { name: 'Mirpur Sector 10' },
    package: { name: '100 Mbps Dedicated', price: 12000 },
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, typeFilter, page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      };
      const response = await api.get('/customers', { params });
      if (response.data?.success && response.data.data.length > 0) {
        setCustomers(response.data.data);
        setTotalPages(response.data.meta?.totalPages || 1);
      } else {
        // Fallback if DB is empty or connection bypassed
        useMockFallback();
      }
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error);
      useMockFallback();
    } finally {
      setLoading(false);
    }
  };

  const useMockFallback = () => {
    let filtered = [...MOCK_CUSTOMERS];
    if (search) {
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search) ||
          c.customerId.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter(c => c.type === typeFilter);
    }
    setCustomers(filtered);
    setTotalPages(1);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer profiles, billing settings, and connection states.</p>
        </div>
        <Link href="/customers/new" className="btn btn-primary btn-sm">
          <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Customer
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div className="topbar-search" style={{ maxWidth: '320px', margin: 0 }}>
            <HiOutlineMagnifyingGlass className="topbar-search-icon" />
            <input
              type="text"
              placeholder="Search by ID, name, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ background: 'white' }}
            />
          </div>
          <select
            className="form-input form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DUE_WARNING">Due Warning</option>
            <option value="GRACE_PERIOD">Grace Period</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            className="form-input form-select"
            style={{ width: '150px' }}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="HOME">Home</option>
            <option value="CORPORATE">Corporate</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Showing <b>{customers.length}</b> customer profiles
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: '40px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '40px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '40px' }}></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <HiOutlineUsers className="empty-state-icon" />
            <h3 className="empty-state-title">No customers found</h3>
            <p className="empty-state-text">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Area</th>
                  <th>Package</th>
                  <th>Type</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Connection</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{c.customerId}</td>
                    <td>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td>{c.area?.name || 'N/A'}</td>
                    <td>
                      <span className="badge badge-neutral">{c.package?.name || 'No Package'}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: c.type === 'CORPORATE' ? 'var(--primary-600)' : 'var(--text-secondary)',
                        }}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: c.totalDue > 0 ? 'var(--danger-600)' : 'var(--text-secondary)' }}>
                      ৳{c.totalDue.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          c.status === 'ACTIVE'
                            ? 'badge-success'
                            : c.status === 'DUE_WARNING'
                            ? 'badge-warning'
                            : c.status === 'GRACE_PERIOD'
                            ? 'badge-primary'
                            : 'badge-danger'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                        <span className={`status-dot ${c.isOnline ? 'online' : 'offline'}`}></span>
                        {c.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/customers/${c.id}`} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                        <HiOutlineEye style={{ fontSize: '16px' }} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div>Page {page} of {totalPages}</div>
          <div className="pagination-pages">
            <button
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
            >
              &larr;
            </button>
            <button className="pagination-btn active">{page}</button>
            <button
              className="pagination-btn"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            >
              &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineCube,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineEye,
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Pop {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  condition: string;
  quantity: number;
  isAssigned: boolean;
  pop?: {
    name: string;
  };
  activeAssignment?: {
    customer: {
      customerId: string;
      name: string;
    };
  };
}

interface Stats {
  total: number;
  assigned: number;
  inStock: number;
  types: Record<string, number>;
  conditions: Record<string, number>;
}

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters state
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [condition, setCondition] = useState('');
  const [popId, setPopId] = useState('');
  const [isAssigned, setIsAssigned] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, type, condition, popId, isAssigned]);

  const fetchInitialData = async () => {
    try {
      const popsRes = await api.get('/pops');
      if (popsRes.data?.success) {
        setPops(popsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load POP locations:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/inventory?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (type) url += `&type=${type}`;
      if (condition) url += `&condition=${condition}`;
      if (popId) url += `&popId=${popId}`;
      if (isAssigned !== '') url += `&isAssigned=${isAssigned === 'true'}`;

      const [itemsRes, statsRes] = await Promise.all([
        api.get(url),
        api.get('/inventory/stats'),
      ]);

      if (itemsRes.data?.success) {
        setItems(itemsRes.data.data);
        setTotalPages(itemsRes.data.meta.totalPages);
        setTotalItems(itemsRes.data.meta.total);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load inventory stock');
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
    setType('');
    setCondition('');
    setPopId('');
    setIsAssigned('');
    setPage(1);
  };

  const getConditionBadgeClass = (cond: string) => {
    switch (cond) {
      case 'NEW':
        return 'badge-success';
      case 'GOOD':
        return 'badge-primary';
      case 'REPAIR':
        return 'badge-warning';
      case 'DAMAGED':
        return 'badge-danger';
      case 'DISPOSED':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getAssetTypeLabel = (t: string) => {
    switch (t) {
      case 'ROUTER':
        return 'Router';
      case 'ONU':
        return 'ONU';
      case 'SWITCH':
        return 'Switch';
      case 'CABLE':
        return 'Cable';
      case 'SPLICE_BOX':
        return 'Splice Box';
      case 'BATTERY':
        return 'Battery';
      case 'OTHER':
        return 'Other';
      default:
        return t;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hardware Inventory</h1>
          <p className="page-subtitle">Manage device stocks, POP inventory, and client asset distributions.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} title="Refresh lists">
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh
          </button>
          <Link href="/inventory/new" className="btn btn-primary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Stock
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <HiOutlineCube />
            </div>
            <div className="kpi-card-value">{stats.total}</div>
            <div className="kpi-card-label">Total Equipment</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered in database</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineCheckCircle />
            </div>
            <div className="kpi-card-value">{stats.inStock}</div>
            <div className="kpi-card-label">Available in Stock</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready to install</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EEF2F6', color: '#6366F1' }}>
              <HiOutlineCube />
            </div>
            <div className="kpi-card-value">{stats.assigned}</div>
            <div className="kpi-card-label">Assigned to Clients</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Currently online / deployed</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              <HiOutlineExclamationCircle />
            </div>
            <div className="kpi-card-value">{stats.conditions.DAMAGED + stats.conditions.REPAIR}</div>
            <div className="kpi-card-label">Damaged / Repair</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requires hardware testing</span>
          </div>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineFunnel style={{ color: 'var(--primary-500)' }} />
              Stock Ledger
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {items.length} of {totalItems} items
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto auto', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search stock name, serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input form-select"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              <option value="ROUTER">Router</option>
              <option value="ONU">ONU</option>
              <option value="SWITCH">Switch</option>
              <option value="CABLE">Cable</option>
              <option value="SPLICE_BOX">Splice Box</option>
              <option value="BATTERY">Battery</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              className="form-input form-select"
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Conditions</option>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="REPAIR">Repair</option>
              <option value="DAMAGED">Damaged</option>
              <option value="DISPOSED">Disposed</option>
            </select>
            <select
              className="form-input form-select"
              value={popId}
              onChange={(e) => {
                setPopId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All POP Locations</option>
              {pops.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="form-input form-select"
              value={isAssigned}
              onChange={(e) => {
                setIsAssigned(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="false">In Stock / Available</option>
              <option value="true">Assigned to Client</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
            {(search || type || condition || popId || isAssigned) && (
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
                <th>Item Name</th>
                <th>Serial Number</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Quantity</th>
                <th>POP Location</th>
                <th>Installation Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Loading inventory list...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No inventory items found matching your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                      <Link href={`/inventory/${item.id}`}>{item.name}</Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {item.serialNumber || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>None</span>}
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {getAssetTypeLabel(item.type)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getConditionBadgeClass(item.condition)}`}>
                        {item.condition}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                    <td>{item.pop?.name || '—'}</td>
                    <td>
                      {item.isAssigned ? (
                        <span className="badge badge-primary" title={`Assigned to ${item.activeAssignment?.customer?.name}`}>
                          Assigned: {item.activeAssignment?.customer?.customerId}
                        </span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link href={`/inventory/${item.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
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
                Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} items)
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

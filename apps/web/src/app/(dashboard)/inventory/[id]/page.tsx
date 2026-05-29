'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HiOutlineChevronLeft,
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Pop {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
}

interface CustomerAsset {
  id: string;
  customerId: string;
  assignedAt: string;
  condition: string;
  remarks?: string;
  customer: Customer;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  remarks?: string;
  performedBy?: string;
  createdAt: string;
}

interface InventoryItemDetail {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  condition: string;
  quantity: number;
  supplier?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  popId?: string;
  isAssigned: boolean;
  pop?: Pop;
  movements: StockMovement[];
  activeAssignment?: CustomerAsset;
}

export default function InventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Customer Assignment form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  // Return asset form state
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);

  // Stock Adjustment form state
  const [adjustType, setAdjustType] = useState('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustRemarks, setAdjustRemarks] = useState('');
  const [showAdjustBox, setShowAdjustBox] = useState(false);

  useEffect(() => {
    fetchItemData();
    fetchInitialCustomers();
  }, [id]);

  const fetchItemData = async () => {
    try {
      const res = await api.get(`/inventory/${id}`);
      if (res.data?.success) {
        setItem(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load inventory item specifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialCustomers = async () => {
    try {
      const res = await api.get('/customers?limit=10');
      if (res.data?.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error(err);
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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer for assignment.');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.post(`/inventory/${id}/assign`, {
        customerId: selectedCustomerId,
        remarks: assignRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Hardware item assigned to client successfully!');
        setSelectedCustomerId('');
        setCustomerSearch('');
        setAssignRemarks('');
        fetchItemData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign hardware');
    } finally {
      setUpdating(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item?.activeAssignment?.id) return;

    setUpdating(true);
    try {
      const res = await api.post(`/inventory/assignments/${item.activeAssignment.id}/return`, {
        condition: returnCondition,
        remarks: returnRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Hardware returned to stock ledger successfully!');
        setShowReturnBox(false);
        setReturnRemarks('');
        setReturnCondition('GOOD');
        fetchItemData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to return hardware');
    } finally {
      setUpdating(false);
    }
  };

  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustQty < 1) {
      toast.error('Quantity must be at least 1.');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.post(`/inventory/${id}/move`, {
        type: adjustType,
        quantity: Number(adjustQty),
        remarks: adjustRemarks.trim() || undefined,
      });

      if (res.data?.success) {
        toast.success('Stock ledger adjusted successfully!');
        setShowAdjustBox(false);
        setAdjustQty(1);
        setAdjustRemarks('');
        fetchItemData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock level');
    } finally {
      setUpdating(false);
    }
  };

  const getConditionBadgeClass = (cond?: string) => {
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

  const getMovementTypeClass = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
      case 'REPAIRED':
      case 'RETURNED':
        return 'positive';
      case 'STOCK_OUT':
      case 'DAMAGED':
      case 'ASSIGNED':
        return 'negative';
      default:
        return '';
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
      case 'REPAIRED':
      case 'RETURNED':
        return <HiOutlineArrowTrendingUp style={{ color: 'var(--success-600)' }} />;
      default:
        return <HiOutlineArrowTrendingDown style={{ color: 'var(--danger-600)' }} />;
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

  if (!item) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Inventory stock item not found</h2>
        <Link href="/inventory" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Stock Ledger
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/inventory">Inventory</Link>
        <span className="separator">/</span>
        <span>{item.name}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
            <HiOutlineChevronLeft style={{ fontSize: '20px' }} />
          </button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {item.name}
              <span className={`badge ${item.isAssigned ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '12px' }}>
                {item.isAssigned ? 'Deployed' : 'In Stock'}
              </span>
            </h1>
            <p className="page-subtitle">
              S/N: {item.serialNumber || 'No Serial Number'} | Category: {item.type} | Condition:{' '}
              <span className={`badge ${getConditionBadgeClass(item.condition)}`} style={{ display: 'inline', padding: '2px 6px', fontSize: '11px' }}>
                {item.condition}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjustBox(true)}>
            <HiOutlineWrenchScrewdriver style={{ marginRight: '4px' }} /> Adjust Stock / Condition
          </button>
        </div>
      </div>

      {/* Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Main Details and History Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stock Adjustment Form (Toggled) */}
          {showAdjustBox && (
            <div className="card" style={{ padding: '20px', border: '1px solid var(--primary-500)', background: 'var(--neutral-50)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Stock Adjustment Entry</h3>
              <form onSubmit={handleStockAdjustSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Adjustment Type *</label>
                  <select className="form-input form-select" value={adjustType} onChange={(e) => setAdjustType(e.target.value)} required>
                    <option value="STOCK_IN">Stock In (+)</option>
                    <option value="STOCK_OUT">Stock Out (-)</option>
                    <option value="DAMAGED">Mark Damaged</option>
                    <option value="REPAIRED">Mark Repaired</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Quantity *</label>
                  <input type="number" min={1} className="form-input" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Remarks</label>
                  <input type="text" placeholder="Reason for stock correction..." className="form-input" value={adjustRemarks} onChange={(e) => setAdjustRemarks(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdjustBox(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={updating}>Save</button>
                </div>
              </form>
            </div>
          )}

          {/* Return hardware section (Toggled) */}
          {showReturnBox && item.activeAssignment && (
            <div className="card" style={{ padding: '20px', border: '1px solid var(--warning-500)', background: '#FFFDF5' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--warning-700)', marginBottom: '12px' }}>
                Return Equipment from Customer
              </h3>
              <form onSubmit={handleReturnSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Return Condition *</label>
                    <select className="form-input form-select" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} required>
                      <option value="GOOD">Good / Reusable</option>
                      <option value="REPAIR">Needs Repair</option>
                      <option value="DAMAGED">Damaged / Scrap</option>
                      <option value="NEW">Unused / New</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Return Remarks</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Connection terminated, replaced with custom router"
                      value={returnRemarks}
                      onChange={(e) => setReturnRemarks(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowReturnBox(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning btn-sm" disabled={updating}>
                    Process Return
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Specifications Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '8px' }}>
              Equipment Specifications &amp; Purchase
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Item Name:</span>
                <span style={{ fontWeight: 500 }}>{item.name}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                <span>{item.type}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Serial Number:</span>
                <span style={{ fontFamily: 'monospace' }}>{item.serialNumber || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>POP Location:</span>
                <span>{item.pop?.name || 'General Storage'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Supplier Vendor:</span>
                <span>{item.supplier || '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Purchase Date:</span>
                <span>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Purchase Cost:</span>
                <span>{item.purchasePrice ? `৳${item.purchasePrice.toLocaleString()}` : '—'}</span>

                <span style={{ color: 'var(--text-secondary)' }}>Stock Quantity:</span>
                <span style={{ fontWeight: 600 }}>{item.quantity}</span>
              </div>
            </div>
          </div>

          {/* Chronological movements timeline */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '10px' }}>
              Stock Movements Log
            </h3>
            <div className="data-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Operator</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {item.movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        No stock movement records found.
                      </td>
                    </tr>
                  ) : (
                    item.movements.map((move) => (
                      <tr key={move.id}>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(move.createdAt).toLocaleString()}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }} className={getMovementTypeClass(move.type)}>
                            {getMovementIcon(move.type)} {move.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{move.quantity}</td>
                        <td style={{ fontWeight: 500 }}>{move.performedBy || 'System'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{move.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Status/Assignment panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Assignment Status Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '8px' }}>
              Hardware Assignment
            </h3>

            {item.isAssigned && item.activeAssignment ? (
              /* Already Assigned Profile */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--neutral-50)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer Name</span>
                    <span style={{ fontWeight: 600 }}>{item.activeAssignment.customer.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Customer ID</span>
                    <span style={{ fontFamily: 'monospace' }}>{item.activeAssignment.customer.customerId}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Phone</span>
                    <span>{item.activeAssignment.customer.phone}</span>
                  </div>
                  {item.activeAssignment.remarks && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Installation Note</span>
                      <span style={{ fontStyle: 'italic', fontSize: '12px' }}>{item.activeAssignment.remarks}</span>
                    </div>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Assigned: {new Date(item.activeAssignment.assignedAt).toLocaleDateString()}
                  </span>
                </div>

                <Link href={`/customers/${item.activeAssignment.customerId}`} className="btn btn-ghost btn-sm" style={{ textAlign: 'center' }}>
                  <HiOutlineUser style={{ marginRight: '4px' }} /> View Client Profile
                </Link>

                <button className="btn btn-warning btn-sm" style={{ marginTop: '4px' }} onClick={() => setShowReturnBox(true)}>
                  Return to Inventory
                </button>
              </div>
            ) : (
              /* Form to Assign to customer */
              <form onSubmit={handleAssignSubmit}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Assign this hardware unit directly to an active customer connection.
                </p>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Search Customer *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '12px', height: '32px' }}
                    placeholder="Search name, phone, or client ID..."
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                  />
                  <select
                    className="form-input form-select"
                    style={{ fontSize: '12px', height: '32px', marginTop: '6px' }}
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
                    <option value="">-- Select Client --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerId}) | {c.phone}
                      </option>
                    ))}
                  </select>
                  {customerLoading && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Loading...</span>}
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Installation Note</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '12px', height: '32px' }}
                    placeholder="e.g. Set up in living room, optical level -21dBm"
                    value={assignRemarks}
                    onChange={(e) => setAssignRemarks(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '12px' }} disabled={updating || item.quantity <= 0}>
                  {item.quantity <= 0 ? 'Out of Stock' : 'Assign to Customer'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

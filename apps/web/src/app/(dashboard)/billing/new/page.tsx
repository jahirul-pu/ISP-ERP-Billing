'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineUser,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowLeft,
  HiOutlineCalculator,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CustomerOption {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  pppoeUsername: string;
  customPrice?: number;
  advanceBalance?: number;
  totalDue?: number;
  package?: {
    id: string;
    name: string;
    price: number;
  };
}

interface InvoiceItemForm {
  type: string;
  description: string;
  amount: number;
  quantity: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Customer search autocomplete state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Form states
  const [billingMonth, setBillingMonth] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { type: 'INTERNET_PACKAGE', description: '', amount: 0, quantity: 1 }
  ]);

  useEffect(() => {
    // Default billing month: current YYYY-MM
    const now = new Date();
    setBillingMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    // Default due date: 10 days from now
    const due = new Date();
    due.setDate(due.getDate() + 10);
    setDueDate(due.toISOString().split('T')[0]);
  }, []);

  // Search customers when search input changes
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await api.get(`/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
        if (res.data?.success) {
          setCustomerOptions(res.data.data);
        }
      } catch (err) {
        console.error('Customer search failed:', err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} (${customer.customerId})`);
    setShowDropdown(false);

    // Prepopulate first invoice item with customer package details if available
    if (customer.package) {
      const packagePrice = customer.customPrice ?? customer.package.price;
      setItems([
        {
          type: 'INTERNET_PACKAGE',
          description: `${customer.package.name} (Recurring Monthly Bill)`,
          amount: packagePrice,
          quantity: 1
        }
      ]);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { type: 'ONE_TIME', description: '', amount: 0, quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemForm, value: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    }));
  };

  // Calculations
  const calculateInvoiceTotals = () => {
    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    let penalty = 0;
    let waiver = 0;

    items.forEach(item => {
      const total = item.amount * item.quantity;
      if (item.type === 'VAT_TAX') tax += total;
      else if (item.type === 'DISCOUNT') discount += total;
      else if (item.type === 'PENALTY') penalty += total;
      else if (item.type === 'WAIVER') waiver += total;
      else subtotal += total;
    });

    const total = Math.max(0, subtotal + tax + penalty - discount - waiver);

    return { subtotal, tax, discount, penalty, waiver, total };
  };

  const totals = calculateInvoiceTotals();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }

    if (items.some(item => !item.description.trim() || item.amount < 0)) {
      toast.error('All items must have a valid description and a positive amount.');
      return;
    }

    setLoading(true);
    try {
      // Form month to date start
      const [year, month] = billingMonth.split('-').map(Number);
      const startOfBillingMonth = new Date(Date.UTC(year, month - 1, 1));

      const payload = {
        customerId: selectedCustomer.id,
        billingMonth: startOfBillingMonth,
        dueDate: new Date(dueDate),
        notes: notes.trim() || undefined,
        items: items.map(item => ({
          type: item.type,
          description: item.description.trim(),
          amount: Number(item.amount),
          quantity: Number(item.quantity),
        })),
      };

      const res = await api.post('/billing/invoices', payload);
      if (res.data?.success) {
        toast.success(`Invoice ${res.data.data.invoiceNumber} created successfully!`);
        router.push('/billing');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      {/* Breadcrumb Header */}
      <div className="breadcrumbs">
        <Link href="/billing">Invoices</Link>
        <span className="separator">/</span>
        <span>New Invoice</span>
      </div>

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => router.push('/billing')}>
              <HiOutlineArrowLeft style={{ fontSize: '18px' }} />
            </button>
            Create Customer Invoice
          </h1>
          <p className="page-subtitle">Draft and issue a manual invoice, setup fees, or custom charges for an individual customer.</p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: '20px', alignItems: 'start' }}>
        {/* Main Content card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Client select & details */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineUser style={{ color: 'var(--primary-500)' }} />
                Select Customer
              </span>
            </div>
            <div className="card-body" style={{ position: 'relative' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Search Customer *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type Customer ID, Name, or PPPoE username..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedCustomer) setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  required
                />

                {/* Autocomplete Dropdown */}
                {showDropdown && customerOptions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% - 10px)',
                      left: '20px',
                      right: '20px',
                      background: 'white',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 10,
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}
                  >
                    {customerOptions.map(c => (
                      <div
                        key={c.id}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--neutral-100)',
                          fontSize: '13px'
                        }}
                        onClick={() => handleSelectCustomer(c)}
                        className="sidebar-link-hover-class"
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                          <span>ID: {c.customerId}</span>
                          <span>PPPoE: {c.pppoeUsername || '—'}</span>
                          <span>Phone: {c.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && customerSearch && customerOptions.length === 0 && !searchingCustomer && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% - 10px)',
                      left: '20px',
                      right: '20px',
                      background: 'white',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: '8px',
                      padding: '14px',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 10
                    }}
                  >
                    No customers found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Items details table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineCalculator style={{ color: 'var(--primary-500)' }} />
                Invoice Items
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Line
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Item Type</th>
                      <th style={{ width: '40%' }}>Description *</th>
                      <th style={{ width: '15%' }}>Price *</th>
                      <th style={{ width: '10%' }}>Qty *</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-input form-select"
                            style={{ height: '36px', padding: '0 10px', fontSize: '13px' }}
                            value={item.type}
                            onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                          >
                            <option value="INTERNET_PACKAGE">Internet Package</option>
                            <option value="INSTALLATION_FEE">Installation Fee</option>
                            <option value="ONU_INSTALLMENT">ONU Installment</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="ONE_TIME">One Time Charge</option>
                            <option value="PENALTY">Penalty</option>
                            <option value="VAT_TAX">VAT / Tax</option>
                            <option value="DISCOUNT">Discount</option>
                            <option value="WAIVER">Waiver</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '36px' }}
                            placeholder="e.g. Month recurring bandwidth fee"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: '36px' }}
                            min="0"
                            placeholder="0.00"
                            value={item.amount || ''}
                            onChange={(e) => handleItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: '36px' }}
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                          {formatCurrency(item.amount * item.quantity)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: 'var(--danger-500)' }}
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                          >
                            <HiOutlineTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls and Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Billing parameters */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Billing Parameters</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Billing Month *</label>
                <input
                  type="month"
                  className="form-input"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  style={{ height: '70px', padding: '10px', resize: 'vertical' }}
                  placeholder="Additional invoice remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="card" style={{ borderLeft: '4px solid var(--primary-500)' }}>
            <div className="card-header">
              <span className="card-title">Invoice Summary</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>VAT / Tax (+)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
              )}
              {totals.penalty > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Penalties (+)</span>
                  <span style={{ color: 'var(--danger-500)' }}>{formatCurrency(totals.penalty)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Discount (-)</span>
                  <span style={{ color: 'var(--success-600)' }}>{formatCurrency(totals.discount)}</span>
                </div>
              )}
              {totals.waiver > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Waivers (-)</span>
                  <span style={{ color: 'var(--success-600)' }}>{formatCurrency(totals.waiver)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '15px',
                  borderTop: '1px solid var(--neutral-200)',
                  paddingTop: '12px',
                  marginTop: '4px'
                }}
              >
                <span>Total Invoice Value</span>
                <span style={{ color: 'var(--primary-600)' }}>{formatCurrency(totals.total)}</span>
              </div>

              {selectedCustomer && selectedCustomer.advanceBalance! > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--success-50)',
                    color: 'var(--success-600)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    marginTop: '8px',
                    fontWeight: 500
                  }}
                >
                  Client advance balance ({formatCurrency(selectedCustomer.advanceBalance!)}) will be applied automatically.
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px' }}
                disabled={loading || !selectedCustomer}
              >
                {loading ? 'Creating Invoice...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Dropdown styling hover fix */}
      <style jsx global>{`
        .sidebar-link-hover-class:hover {
          background-color: var(--neutral-100);
        }
      `}</style>
    </div>
  );
}

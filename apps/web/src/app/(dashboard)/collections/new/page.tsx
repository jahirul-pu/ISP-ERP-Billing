'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineArrowLeft as HiOutlineArrowLeft2,
  HiOutlineUser as HiOutlineUser2,
  HiOutlineDocumentText as HiOutlineDocumentText2,
  HiOutlineCreditCard as HiOutlineCreditCard2,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CustomerOption {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  pppoeUsername: string;
  advanceBalance?: number;
  totalDue?: number;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  total: number;
  dueAmount: number;
  billingMonth: string;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Customer search autocomplete
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Unpaid invoices state
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form states
  const [applyMethod, setApplyMethod] = useState<'FIFO' | 'SPECIFIC'>('FIFO');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('CASH');
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  // Search customers
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

  // Fetch customer unpaid invoices when selected
  useEffect(() => {
    if (!selectedCustomer) {
      setUnpaidInvoices([]);
      setSelectedInvoiceId('');
      return;
    }

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await api.get(`/billing/invoices?customerId=${selectedCustomer.id}&status=UNPAID&limit=100`);
        if (res.data?.success) {
          setUnpaidInvoices(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch client unpaid invoices', err);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [selectedCustomer]);

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.name} (${customer.customerId})`);
    setShowDropdown(false);
  };

  const handleInvoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invId = e.target.value;
    setSelectedInvoiceId(invId);

    // Autofill amount if paying a specific invoice
    if (invId) {
      const selectedInv = unpaidInvoices.find(inv => inv.id === invId);
      if (selectedInv) {
        setAmount(selectedInv.dueAmount);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }

    if (applyMethod === 'SPECIFIC' && !selectedInvoiceId) {
      toast.error('Please select the specific invoice you want to apply this payment to');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        invoiceId: applyMethod === 'SPECIFIC' ? selectedInvoiceId : undefined,
        amount: Number(amount),
        method,
        remarks: remarks.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
      };

      const res = await api.post('/collections/payments', payload);
      if (res.data?.success) {
        toast.success(`Payment Receipt ${res.data.data.receiptNumber} logged successfully!`);
        router.push('/collections');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatMonth = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/collections">Collections</Link>
        <span className="separator">/</span>
        <span>Log Collection</span>
      </div>

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => router.push('/collections')}>
              <HiOutlineArrowLeft2 style={{ fontSize: '18px' }} />
            </button>
            Log Payment Collection
          </h1>
          <p className="page-subtitle">Log a field cash collection, mobile banking payment, or bank transfer transaction from a customer.</p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left main card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Select Customer */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineUser2 style={{ color: 'var(--primary-500)' }} />
                Select Customer
              </span>
            </div>
            <div className="card-body" style={{ position: 'relative' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Search Customer *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type Customer ID, Name, Phone or PPPoE Username..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedCustomer) setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  required
                />

                {/* Dropdown list */}
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

          {/* Allocation settings */}
          {selectedCustomer && (
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineDocumentText2 style={{ color: 'var(--primary-500)' }} />
                  Payment Allocation
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="applyMethod"
                      checked={applyMethod === 'FIFO'}
                      onChange={() => {
                        setApplyMethod('FIFO');
                        setSelectedInvoiceId('');
                      }}
                    />
                    <span>FIFO (Apply automatically to oldest dues)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="applyMethod"
                      checked={applyMethod === 'SPECIFIC'}
                      onChange={() => setApplyMethod('SPECIFIC')}
                      disabled={unpaidInvoices.length === 0}
                    />
                    <span>Pay specific invoice ({unpaidInvoices.length} unpaid)</span>
                  </label>
                </div>

                {applyMethod === 'SPECIFIC' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Unpaid Invoice *</label>
                    <select
                      className="form-input form-select"
                      value={selectedInvoiceId}
                      onChange={handleInvoiceSelectChange}
                      required
                    >
                      <option value="">-- Choose Invoice --</option>
                      {unpaidInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {formatMonth(inv.billingMonth)} (Due: {formatCurrency(inv.dueAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {unpaidInvoices.length === 0 && !loadingInvoices && (
                  <div style={{ fontSize: '13px', color: 'var(--success-600)', backgroundColor: 'var(--success-50)', padding: '10px 14px', borderRadius: '6px' }}>
                    This customer has no unpaid invoices. This payment will be fully credited to their advance balance.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment parameters */}
          {selectedCustomer && (
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineCreditCard2 style={{ color: 'var(--primary-500)' }} />
                  Payment Details
                </span>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Amount Received (৳) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter collected amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-input form-select"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="ONLINE">Online Portal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Payment Slip / Proof URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Reference URL or transaction proof path..."
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                  <label className="form-label">Remarks / Description</label>
                  <textarea
                    className="form-input"
                    style={{ height: '70px', padding: '10px', resize: 'vertical' }}
                    placeholder="Collector or transaction details notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar client details card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedCustomer ? (
            <div className="card" style={{ borderLeft: '4px solid var(--primary-500)' }}>
              <div className="card-header">
                <span className="card-title">Client Account Info</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Customer ID:</span>
                  <p style={{ fontWeight: 600 }}>{selectedCustomer.customerId}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>PPPoE Username:</span>
                  <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedCustomer.pppoeUsername || '—'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Outstanding Dues:</span>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--danger-500)' }}>
                    {formatCurrency(selectedCustomer.totalDue ?? 0)}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Advance / Prepaid Balance:</span>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--success-600)' }}>
                    {formatCurrency(selectedCustomer.advanceBalance ?? 0)}
                  </p>
                </div>

                {method === 'CASH' && (
                  <div style={{
                    backgroundColor: 'var(--warning-50)',
                    color: 'var(--warning-600)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    fontWeight: 500
                  }}>
                    CASH collections will be logged in your daily cashbook logs.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={loading}
                >
                  {loading ? 'Submitting payment...' : 'Log Collection'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Select a customer to view account totals and record payment.
            </div>
          )}
        </div>
      </form>

      {/* Hover style fixer */}
      <style jsx global>{`
        .sidebar-link-hover-class:hover {
          background-color: var(--neutral-100);
        }
      `}</style>
    </div>
  );
}

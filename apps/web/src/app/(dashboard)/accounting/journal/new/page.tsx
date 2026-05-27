'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheck,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface LedgerAccount {
  id: string;
  name: string;
  code: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
}

interface JournalLineInput {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  
  // Ledgers for selection
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);

  // Form state
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [lines, setLines] = useState<JournalLineInput[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    setLoadingLedgers(true);
    try {
      const res = await api.get('/accounting/ledgers');
      if (res.data?.success) {
        setLedgers(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load chart of accounts for line items');
      console.error(err);
    } finally {
      setLoadingLedgers(false);
    }
  };

  const handleAddLine = () => {
    setLines(prev => [...prev, { accountId: '', debit: '', credit: '', description: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('A double-entry journal requires at least two transaction lines');
      return;
    }
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof JournalLineInput, value: string) => {
    setLines(prev => {
      const copy = [...prev];
      
      // If setting debit, clear credit on that line (usually a line is either debit or credit)
      if (field === 'debit' && value !== '') {
        copy[index] = { ...copy[index], debit: value, credit: '' };
      } else if (field === 'credit' && value !== '') {
        copy[index] = { ...copy[index], credit: value, debit: '' };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      
      return copy;
    });
  };

  // Live validation calculations
  const totalDebits = lines.reduce((sum, line) => {
    const val = parseFloat(line.debit);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalCredits = lines.reduce((sum, line) => {
    const val = parseFloat(line.credit);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const difference = Math.abs(totalDebits - totalCredits);
  const isOutOfBalance = difference > 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!description.trim()) {
      toast.error('Please enter a description for the journal entry');
      return;
    }
    if (isOutOfBalance) {
      toast.error(`Out of balance! Total debits (${totalDebits}) must equal total credits (${totalCredits}).`);
      return;
    }
    
    // Check line counts and values
    const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('Please complete at least 2 lines with a selected account and non-zero debit or credit amount');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description,
        reference: reference || undefined,
        date: date ? new Date(date) : undefined,
        lines: validLines.map(l => ({
          accountId: l.accountId,
          debit: l.debit ? parseFloat(l.debit) : 0,
          credit: l.credit ? parseFloat(l.credit) : 0,
          description: l.description || undefined,
        })),
      };

      const res = await api.post('/accounting/journals', payload);
      if (res.data?.success) {
        toast.success(`Journal entry ${res.data.data.entryNumber} created successfully!`);
        router.push('/accounting');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit journal adjustments');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `৳${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/accounting">Accounting</Link>
        <span className="separator">/</span>
        <span>New Journal Entry</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/accounting" style={{ color: 'var(--text-secondary)' }}>
              <HiOutlineArrowLeft style={{ fontSize: '20px' }} />
            </Link>
            New Journal Adjustment Entry
          </h1>
          <p className="page-subtitle">Log a manual general ledger balanced transaction. Standard double-entry rules apply.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* General Meta Section */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Journal Header Details</span>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Journal Description / Memo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Month-end depreciation adjustment for POP assets"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Slip No.</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. JV-99882"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Lines Section */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Journal Lines (Debits and Credits)</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddLine}
            >
              <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Row
            </button>
          </div>

          <div className="data-table-wrapper" style={{ overflow: 'visible' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Account *</th>
                  <th style={{ width: '15%' }}>Debit (৳)</th>
                  <th style={{ width: '15%' }}>Credit (৳)</th>
                  <th style={{ width: '35%' }}>Line Memo / Description</th>
                  <th style={{ width: '5%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-input form-select"
                        style={{ height: '36px', fontSize: '13px' }}
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        required
                      >
                        <option value="">-- Choose Account --</option>
                        {loadingLedgers ? (
                          <option disabled>Loading accounts...</option>
                        ) : (
                          ledgers.map((l) => (
                            <option key={l.id} value={l.id}>
                              [{l.code || 'N/A'}] {l.name} ({l.type})
                            </option>
                          ))
                        )}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{ height: '36px' }}
                        value={line.debit}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        disabled={line.credit !== '' && parseFloat(line.credit) > 0}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{ height: '36px' }}
                        value={line.credit}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        disabled={line.debit !== '' && parseFloat(line.debit) > 0}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Line-specific remark (optional)"
                        style={{ height: '36px' }}
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--danger-500)', cursor: 'pointer', fontSize: '16px' }}
                        onClick={() => handleRemoveLine(idx)}
                        title="Delete line"
                      >
                        <HiOutlineTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Summary Footer */}
          <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', background: 'var(--neutral-50)', display: 'flex', justifyContent: 'flex-end', gap: '30px', padding: '16px 24px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Debits:</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalDebits)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Credits:</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalCredits)}</div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--neutral-200)', paddingLeft: '30px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Discrepancy:</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: isOutOfBalance ? 'var(--danger-600)' : 'var(--success-600)' }}>
                {formatCurrency(difference)}
              </div>
            </div>
          </div>
        </div>

        {/* Live Warnings and Submit Actions */}
        {isOutOfBalance && (
          <div
            style={{
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-600)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--danger-600)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <HiOutlineExclamationTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <div>
              <strong>Entry is out of balance.</strong> The total debits must exactly equal total credits. 
              Currently, there is a discrepancy of {formatCurrency(difference)}.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
          <Link href="/accounting" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || isOutOfBalance}
          >
            <HiOutlineCheck style={{ marginRight: '4px' }} />
            {submitting ? 'Posting Transaction...' : 'Save & Post Journal Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

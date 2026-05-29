'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HiOutlineUser,
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface EmployeeDetail {
  id: string;
  employeeId: string;
  name: string;
  phone?: string;
  email?: string;
  department?: string;
  designation?: string;
  baseSalary: number;
  status: string;
  joinDate: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  payrollRecords: Array<{
    id: string;
    month: string;
    baseSalary: number;
    bonus: number;
    deductions: number;
    advances: number;
    incentives: number;
    commission: number;
    netSalary: number;
    isPaid: boolean;
    paidAt?: string;
    remarks?: string;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    remarks?: string;
  }>;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface LedgerAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  balance: number;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'payroll'>('attendance');
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [updating, setUpdating] = useState(false);

  // Pay Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [payingSalary, setPayingSalary] = useState(false);

  useEffect(() => {
    fetchEmployeeDetail();
    fetchUsersList();
    fetchLedgerAccounts();
  }, [id]);

  const fetchEmployeeDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/employees/${id}`);
      if (res.data?.success) {
        const emp: EmployeeDetail = res.data.data;
        setEmployee(emp);
        
        // Seed edit form values
        setEditName(emp.name);
        setEditPhone(emp.phone || '');
        setEditEmail(emp.email || '');
        setEditDepartment(emp.department || '');
        setEditDesignation(emp.designation || '');
        setEditBaseSalary(emp.baseSalary.toString());
        setEditStatus(emp.status);
        setEditUserId(emp.userId || '');
      }
    } catch (err) {
      toast.error('Failed to load employee details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersList = async () => {
    try {
      const res = await api.get('/users');
      if (Array.isArray(res.data)) {
        setUsersList(res.data);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchLedgerAccounts = async () => {
    try {
      const res = await api.get('/accounting/ledgers');
      if (res.data?.success) {
        const assets = res.data.data.filter((l: LedgerAccount) => l.type === 'ASSET');
        setLedgerAccounts(assets);
        if (assets.length > 0) {
          setPaymentAccount(assets[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load ledger accounts:', err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/hr/employees/${id}`, {
        name: editName,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        department: editDepartment.trim() || undefined,
        designation: editDesignation.trim() || undefined,
        baseSalary: Number(editBaseSalary),
        status: editStatus,
        userId: editUserId || null,
      });

      if (res.data?.success) {
        toast.success('Employee updated successfully');
        setEditMode(false);
        fetchEmployeeDetail();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update employee details');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord || !paymentAccount) {
      toast.error('Missing checkout transaction details');
      return;
    }

    setPayingSalary(true);
    try {
      const res = await api.post(`/hr/payroll/${activeRecord.id}/pay`, {
        paidFromAccountId: paymentAccount,
        remarks: paymentRemarks,
      });

      if (res.data?.success) {
        toast.success('Salary payment recorded and general ledger synced!');
        setShowPayModal(false);
        setPaymentRemarks('');
        setActiveRecord(null);
        fetchEmployeeDetail();
        fetchLedgerAccounts();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
      console.error(err);
    } finally {
      setPayingSalary(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      ACTIVE: 'badge-success',
      INACTIVE: 'badge-neutral',
      TERMINATED: 'badge-danger',
      ON_LEAVE: 'badge-warning',
    };
    return statuses[status] || 'badge-neutral';
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      PRESENT: 'badge-success',
      ON_FIELD: 'badge-primary',
      ABSENT: 'badge-danger',
      LATE: 'badge-warning',
      HALF_DAY: 'badge-neutral',
    };
    return statuses[status] || 'badge-neutral';
  };

  const getMonthLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading employee workspace...</div>;
  }

  if (!employee) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Employee profile not found.</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineUser /> Employee Profile
          </h1>
          <p className="page-subtitle">Workspace for {employee.name} ({employee.employeeId}).</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/hr')}>
            <HiOutlineArrowLeft style={{ marginRight: '4px' }} /> Back to directory
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Profile Detail Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">General Info</span>
            {!editMode && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                <HiOutlinePencilSquare style={{ marginRight: '4px' }} /> Edit
              </button>
            )}
          </div>

          {!editMode ? (
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Employee ID</span>
                <strong style={{ fontSize: '16px', color: 'var(--primary-600)' }}>{employee.employeeId}</strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Full Name</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.name}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Department / Designation</span>
                <span style={{ fontWeight: 500 }}>{employee.department || '—'} · {employee.designation || '—'}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Base Salary</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>৳{employee.baseSalary.toLocaleString()}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Contact details</span>
                <span style={{ display: 'block', fontSize: '13px' }}>📞 {employee.phone || '—'}</span>
                <span style={{ display: 'block', fontSize: '13px' }}>✉️ {employee.email || '—'}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Status</span>
                <span className={`badge ${getStatusBadge(employee.status)}`}>{employee.status}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Join Date</span>
                <span style={{ fontSize: '13px' }}>{new Date(employee.joinDate).toLocaleDateString()}</span>
              </div>

              <div style={{ borderTop: '1px dashed var(--neutral-200)', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Linked User Login</span>
                {employee.user ? (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success-600)' }}>
                    👤 {employee.user.name} ({employee.user.email})
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No linked login account
                  </span>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Name</label>
                  <input type="text" required className="form-input" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Designation</label>
                  <input type="text" className="form-input" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Department</label>
                  <input type="text" className="form-input" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Base Salary</label>
                  <input type="number" required className="form-input" value={editBaseSalary} onChange={e => setEditBaseSalary(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Phone</label>
                  <input type="text" className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Email</label>
                  <input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>Status</label>
                  <select className="form-input form-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>User Login Link</label>
                  <select className="form-input form-select" value={editUserId} onChange={e => setEditUserId(e.target.value)}>
                    <option value="">Do not link</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>
                  <HiOutlineXMark style={{ marginRight: '4px' }} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={updating}>
                  <HiOutlineCheck style={{ marginRight: '4px' }} /> {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Logs Tabs Workspace */}
        <div className="card">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)', padding: '0 16px' }}>
            <button
              onClick={() => setActiveSubTab('attendance')}
              style={{
                padding: '14px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeSubTab === 'attendance' ? 'var(--primary-600)' : 'var(--text-secondary)',
                borderBottom: activeSubTab === 'attendance' ? '2px solid var(--primary-600)' : 'none',
              }}
            >
              Recent Attendance Log (30 Days)
            </button>
            <button
              onClick={() => setActiveSubTab('payroll')}
              style={{
                padding: '14px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeSubTab === 'payroll' ? 'var(--primary-600)' : 'var(--text-secondary)',
                borderBottom: activeSubTab === 'payroll' ? '2px solid var(--primary-600)' : 'none',
              }}
            >
              Payroll / Payslips History
            </button>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {activeSubTab === 'attendance' ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.attendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No recent attendance records logged.
                        </td>
                      </tr>
                    ) : (
                      employee.attendance.map((att) => (
                        <tr key={att.id}>
                          <td style={{ fontWeight: 600 }}>{new Date(att.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${getAttendanceStatusBadge(att.status)}`}>
                              {att.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{att.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Base Salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Net Payout</th>
                      <th>Payment Status</th>
                      <th>Paid At</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.payrollRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No payroll slip history generated.
                        </td>
                      </tr>
                    ) : (
                      employee.payrollRecords.map((pay) => (
                        <tr key={pay.id}>
                          <td style={{ fontWeight: 600 }}>{getMonthLabel(pay.month)}</td>
                          <td>৳{pay.baseSalary.toLocaleString()}</td>
                          <td style={{ color: 'var(--success-600)' }}>
                            ৳{(pay.bonus + pay.incentives + pay.commission).toLocaleString()}
                          </td>
                          <td style={{ color: 'var(--danger-600)' }}>
                            ৳{(pay.deductions + pay.advances).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>৳{pay.netSalary.toLocaleString()}</td>
                          <td>
                            <span className={`badge ${pay.isPaid ? 'badge-success' : 'badge-danger'}`}>
                              {pay.isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!pay.isPaid ? (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px' }}
                                onClick={() => {
                                  setActiveRecord(pay);
                                  setShowPayModal(true);
                                }}
                              >
                                Pay
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SALARY PAY CHECKOUT MODAL ───────────────────────────── */}
      {showPayModal && activeRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Salary Checkout</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPayModal(false)}
                style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handlePaySubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Employee:</span>
                    <strong>{employee.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Month:</span>
                    <strong>{getMonthLabel(activeRecord.month)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--neutral-200)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Net Salary:</span>
                    <span>৳{activeRecord.netSalary.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0 0', fontSize: '15px' }}>
                    <span style={{ fontWeight: 600 }}>Amount Due:</span>
                    <strong style={{ color: 'var(--success-600)', fontSize: '16px' }}>৳{activeRecord.netSalary.toLocaleString()}</strong>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Paid From Account</label>
                  <select
                    className="form-input form-select"
                    required
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                  >
                    <option value="">Select Account...</option>
                    {ledgerAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} (Bal: ৳{account.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Transaction Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="E.g. Bank draft receipt number"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={payingSalary}>
                  {payingSalary ? 'Confirming...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

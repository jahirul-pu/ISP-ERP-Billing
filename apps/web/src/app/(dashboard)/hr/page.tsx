'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineCheckBadge,
  HiOutlineCalendar,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineEye,
  HiOutlineCreditCard,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Employee {
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
}

interface PayrollRecord {
  id: string;
  employeeId: string;
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
  employee: {
    name: string;
    employeeId: string;
    department?: string;
    designation?: string;
  };
}

interface HRStats {
  activeEmployees: number;
  monthlySalaryBudget: number;
  todayAttendanceRate: number;
  outstandingPayroll: number;
}

interface LedgerAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  balance: number;
}

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [stats, setStats] = useState<HRStats | null>(null);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filter States
  const [empPage, setEmpPage] = useState(1);
  const [empTotalPages, setEmpTotalPages] = useState(1);
  const [empSearch, setEmpSearch] = useState('');
  const [empStatus, setEmpStatus] = useState('');

  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payStatusFilter, setPayStatusFilter] = useState('');

  // Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  // Roster generation state
  const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState('');
  const [payrollMonth, setPayrollMonth] = useState('');
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [advances, setAdvances] = useState(0);
  const [incentives, setIncentives] = useState(0);
  const [commission, setCommission] = useState(0);
  const [payrollRemarks, setPayrollRemarks] = useState('');

  // Payment checkout state
  const [activePayrollRecord, setActivePayrollRecord] = useState<PayrollRecord | null>(null);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLedgerAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    } else {
      fetchPayroll();
    }
  }, [activeTab, empPage, empStatus, payPage, payStatusFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/hr/employees/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load HR stats:', err);
    }
  };

  const fetchLedgerAccounts = async () => {
    try {
      const res = await api.get('/accounting/ledgers');
      if (res.data?.success) {
        // Filter for ASSET cash/bank accounts
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

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = `/hr/employees?page=${empPage}&limit=15`;
      if (empSearch.trim()) url += `&search=${encodeURIComponent(empSearch)}`;
      if (empStatus) url += `&status=${empStatus}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setEmployees(res.data.data);
        setEmpTotalPages(res.data.meta.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load employees list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      let url = `/hr/payroll?page=${payPage}&limit=15`;
      if (payStatusFilter) {
        url += `&isPaid=${payStatusFilter === 'PAID'}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setPayroll(res.data.data);
        setPayTotalPages(res.data.meta.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load payroll list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpPage(1);
    fetchEmployees();
  };

  const handleClearFilters = () => {
    setEmpSearch('');
    setEmpStatus('');
    setEmpPage(1);
    fetchEmployees();
  };

  const handleGeneratePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForPayroll || !payrollMonth) {
      toast.error('Please select both an employee and a month');
      return;
    }

    setGeneratingPayroll(true);
    try {
      const res = await api.post('/hr/payroll', {
        employeeId: selectedEmployeeForPayroll,
        month: `${payrollMonth}-01T00:00:00.000Z`,
        bonus: Number(bonus),
        deductions: Number(deductions),
        advances: Number(advances),
        incentives: Number(incentives),
        commission: Number(commission),
        remarks: payrollRemarks,
      });

      if (res.data?.success) {
        toast.success('Payroll generated successfully');
        setShowGenerateModal(false);
        // Reset fields
        setBonus(0);
        setDeductions(0);
        setAdvances(0);
        setIncentives(0);
        setCommission(0);
        setPayrollRemarks('');
        setSelectedEmployeeForPayroll('');
        setPayrollMonth('');
        // Refresh
        fetchPayroll();
        fetchStats();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to generate payroll record';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const handlePayCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayrollRecord || !paymentAccount) {
      toast.error('Missing payroll or payment source details');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await api.post(`/hr/payroll/${activePayrollRecord.id}/pay`, {
        paidFromAccountId: paymentAccount,
        remarks: paymentRemarks,
      });

      if (res.data?.success) {
        toast.success('Payroll payment processed and expense ledger entry created!');
        setShowPayModal(false);
        setPaymentRemarks('');
        setActivePayrollRecord(null);
        // Refresh
        fetchPayroll();
        fetchStats();
        fetchLedgerAccounts(); // Update cash balances
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
      console.error(err);
    } finally {
      setSubmittingPayment(false);
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

  const getMonthLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">HR &amp; Staff Payroll</h1>
          <p className="page-subtitle">Manage staff directories, track daily check-ins, and process monthly salaries.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/hr/attendance" className="btn btn-secondary btn-sm">
            <HiOutlineCalendar style={{ marginRight: '4px' }} /> Record Attendance
          </Link>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchStats();
              activeTab === 'employees' ? fetchEmployees() : fetchPayroll();
            }}
          >
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh
          </button>
          <Link href="/hr/new" className="btn btn-primary btn-sm">
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Employee
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}>
              <HiOutlineUserGroup />
            </div>
            <div className="kpi-card-value">{stats.activeEmployees}</div>
            <div className="kpi-card-label">Active Staff</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Registered employees</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <HiOutlineCheckBadge />
            </div>
            <div className="kpi-card-value">{stats.todayAttendanceRate}%</div>
            <div className="kpi-card-label">Today&apos;s Attendance</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Present / On-Field rate</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
              <HiOutlineCurrencyDollar />
            </div>
            <div className="kpi-card-value">৳{(stats.monthlySalaryBudget).toLocaleString()}</div>
            <div className="kpi-card-label">Monthly Salary Budget</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sum of base salaries</span>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
              <HiOutlineCreditCard />
            </div>
            <div className="kpi-card-value">৳{(stats.outstandingPayroll).toLocaleString()}</div>
            <div className="kpi-card-label">Outstanding Liability</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unpaid generated months</span>
          </div>
        </div>
      )}

      {/* Roster / Tab Selection Card */}
      <div className="card">
        {/* Tabs Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)', padding: '0 16px' }}>
          <button
            onClick={() => setActiveTab('employees')}
            style={{
              padding: '14px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'employees' ? 'var(--primary-600)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'employees' ? '2px solid var(--primary-600)' : 'none',
            }}
          >
            Staff Directory
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            style={{
              padding: '14px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'payroll' ? 'var(--primary-600)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'payroll' ? '2px solid var(--primary-600)' : 'none',
            }}
          >
            Payroll Months
          </button>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="card-header" style={{ borderTop: 'none', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTab === 'employees' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineAdjustmentsHorizontal style={{ color: 'var(--primary-500)' }} /> Staff Directory
              </span>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, justifySelf: 'flex-end', maxWidth: '600px' }}>
                <input
                  type="text"
                  placeholder="Search name, ID, phone, designation..."
                  className="form-input"
                  style={{ flex: 1 }}
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                />
                <select
                  className="form-input form-select"
                  style={{ width: '150px' }}
                  value={empStatus}
                  onChange={(e) => {
                    setEmpStatus(e.target.value);
                    setEmpPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
                {(empSearch || empStatus) && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                    Clear
                  </button>
                )}
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineCurrencyDollar style={{ color: 'var(--primary-500)' }} /> Generated Payslips
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="form-input form-select"
                  style={{ width: '160px' }}
                  value={payStatusFilter}
                  onChange={(e) => {
                    setPayStatusFilter(e.target.value);
                    setPayPage(1);
                  }}
                >
                  <option value="">All Payments</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid / Draft</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => setShowGenerateModal(true)}>
                  + Generate Salary Slip
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="data-table-wrapper">
          {activeTab === 'employees' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Base Salary</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Loading employee directory...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                        <Link href={`/hr/${emp.id}`}>{emp.employeeId}</Link>
                      </td>
                      <td style={{ fontWeight: 500 }}>{emp.name}</td>
                      <td>{emp.designation || '—'}</td>
                      <td>{emp.department || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.phone || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.email || '—'}</td>
                      <td style={{ fontWeight: 600 }}>৳{emp.baseSalary.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(emp.status)}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(emp.joinDate).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link href={`/hr/${emp.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                          <HiOutlineEye style={{ fontSize: '14px' }} /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Staff Code</th>
                  <th>Staff Name</th>
                  <th>Department</th>
                  <th>Base Salary</th>
                  <th>Bonus / Inc.</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Loading payroll month logs...
                    </td>
                  </tr>
                ) : payroll.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No generated payroll records found.
                    </td>
                  </tr>
                ) : (
                  payroll.map((rec) => (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 600 }}>{getMonthLabel(rec.month)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                        <Link href={`/hr/${rec.employeeId}`}>{rec.employee.employeeId}</Link>
                      </td>
                      <td style={{ fontWeight: 500 }}>{rec.employee.name}</td>
                      <td>{rec.employee.department || '—'}</td>
                      <td>৳{rec.baseSalary.toLocaleString()}</td>
                      <td style={{ color: 'var(--success-600)' }}>
                        ৳{(rec.bonus + rec.incentives + rec.commission).toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--danger-600)' }}>
                        ৳{(rec.deductions + rec.advances).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>৳{rec.netSalary.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${rec.isPaid ? 'badge-success' : 'badge-danger'}`}>
                          {rec.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {rec.paidAt ? new Date(rec.paidAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Link href={`/hr/${rec.employeeId}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} title="View Employee Roster">
                            <HiOutlineEye style={{ fontSize: '14px' }} />
                          </Link>
                          {!rec.isPaid && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                              onClick={() => {
                                setActivePayrollRecord(rec);
                                setShowPayModal(true);
                              }}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Block */}
        {!loading && (
          <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', padding: '12px 20px' }}>
            {activeTab === 'employees' && empTotalPages > 1 && (
              <div className="pagination">
                <div>Page <strong>{empPage}</strong> of <strong>{empTotalPages}</strong></div>
                <div className="pagination-pages">
                  <button className="pagination-btn" onClick={() => setEmpPage(p => Math.max(1, p - 1))} disabled={empPage === 1}>&larr;</button>
                  <button className="pagination-btn" onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))} disabled={empPage === empTotalPages}>&rarr;</button>
                </div>
              </div>
            )}
            {activeTab === 'payroll' && payTotalPages > 1 && (
              <div className="pagination">
                <div>Page <strong>{payPage}</strong> of <strong>{payTotalPages}</strong></div>
                <div className="pagination-pages">
                  <button className="pagination-btn" onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1}>&larr;</button>
                  <button className="pagination-btn" onClick={() => setPayPage(p => Math.min(payTotalPages, p + 1))} disabled={payPage === payTotalPages}>&rarr;</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: GENERATE SALARY SLIP ───────────────────────── */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Generate Salary Payslip</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowGenerateModal(false)}
                style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleGeneratePayrollSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Employee</label>
                  <select
                    className="form-input form-select"
                    required
                    value={selectedEmployeeForPayroll}
                    onChange={(e) => setSelectedEmployeeForPayroll(e.target.value)}
                  >
                    <option value="">Choose Employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.employeeId} - {e.designation})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Month</label>
                    <input
                      type="month"
                      className="form-input"
                      required
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Bonus</label>
                    <input
                      type="number"
                      className="form-input"
                      value={bonus}
                      onChange={(e) => setBonus(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Deductions</label>
                    <input
                      type="number"
                      className="form-input"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Advances / Loan</label>
                    <input
                      type="number"
                      className="form-input"
                      value={advances}
                      onChange={(e) => setAdvances(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Incentives</label>
                    <input
                      type="number"
                      className="form-input"
                      value={incentives}
                      onChange={(e) => setIncentives(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Commission</label>
                    <input
                      type="number"
                      className="form-input"
                      value={commission}
                      onChange={(e) => setCommission(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Bonus details, transport overrides, etc."
                    value={payrollRemarks}
                    onChange={(e) => setPayrollRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGenerateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={generatingPayroll}>
                  {generatingPayroll ? 'Generating...' : 'Create Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PAYROLL PAYMENT CHECKOUT ─────────────────────── */}
      {showPayModal && activePayrollRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', margin: '20px' }}>
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
            <form onSubmit={handlePayCheckoutSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Checkout Summary Table */}
                <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Employee:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activePayrollRecord.employee.name} ({activePayrollRecord.employee.employeeId})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Payroll Month:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{getMonthLabel(activePayrollRecord.month)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Base Salary:</span>
                    <span style={{ fontWeight: 500 }}>৳{activePayrollRecord.baseSalary.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--neutral-200)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Allowances &amp; Deductions:</span>
                    <span>
                      ৳{(activePayrollRecord.bonus + activePayrollRecord.incentives + activePayrollRecord.commission - activePayrollRecord.deductions - activePayrollRecord.advances).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px 0', fontSize: '15px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Net Payout:</span>
                    <strong style={{ color: 'var(--success-600)', fontSize: '16px' }}>৳{activePayrollRecord.netSalary.toLocaleString()}</strong>
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
                    <option value="">Select cash/bank ledger account...</option>
                    {ledgerAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} (Code: {account.code} · Bal: ৳{account.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Transaction Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Reference, bank deposit slips, etc."
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingPayment}>
                  {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineUserPlus, HiOutlineArrowLeft } from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface UserLinkOption {
  id: string;
  name: string;
  email: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserLinkOption[]>([]);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'>('ACTIVE');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchUsersList();
  }, []);

  const fetchUsersList = async () => {
    try {
      const res = await api.get('/users');
      // If the API returns paginated data (like data: [...], or directly array)
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Employee name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/hr/employees', {
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        department: department.trim() || undefined,
        designation: designation.trim() || undefined,
        baseSalary: baseSalary ? Number(baseSalary) : 0,
        status,
        joinDate: new Date(joinDate).toISOString(),
        userId: userId || undefined,
      });

      if (res.data?.success) {
        toast.success('Employee created successfully');
        router.push('/hr');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create employee profile';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineUserPlus /> Register New Employee
          </h1>
          <p className="page-subtitle">Create a new staff profile in the system directory.</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/hr')}>
            <HiOutlineArrowLeft style={{ marginRight: '4px' }} /> Back to HR
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Jahirul Islam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Base Salary (Monthly) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  placeholder="e.g. 25000"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 01700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. employee@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Department</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Support & Operations"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Designation</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Senior Technician"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Join Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Employment Status</label>
                <select
                  className="form-input form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed var(--neutral-200)', paddingTop: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Link User Account (Optional)</label>
              <select
                className="form-input form-select"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">Do not link login account</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                Linking a user account associates their staff profile with their ERP login account for assignments (e.g. support ticket technicians).
              </p>
            </div>

          </div>

          <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/hr')}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Creating Employee...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

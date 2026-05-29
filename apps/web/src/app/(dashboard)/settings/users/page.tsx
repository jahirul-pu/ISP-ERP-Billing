'use client';

import { useState, useEffect } from 'react';
import {
  HiOutlineUsers,
  HiOutlinePlus,
  HiOutlineUserMinus,
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  roleId: string;
  role: {
    name: string;
    displayName: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Fields (Create)
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoleId, setCreateRoleId] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Form Fields (Edit)
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editPassword, setEditPassword] = useState(''); // Optional change
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?page=${page}&limit=15`);
      if (res.data?.success) {
        setUsers(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotalItems(res.data.meta.total);
      }
    } catch (err) {
      toast.error('Failed to load system users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      if (res.data?.success) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load roles list:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createName || !createPassword || !createRoleId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await api.post('/users', {
        email: createEmail.trim(),
        name: createName.trim(),
        phone: createPhone.trim() || undefined,
        password: createPassword,
        roleId: createRoleId,
      });

      if (res.data?.success) {
        toast.success('System user created successfully!');
        setShowCreateModal(false);
        // Reset fields
        setCreateEmail('');
        setCreateName('');
        setCreatePhone('');
        setCreatePassword('');
        setCreateRoleId('');
        // Refresh
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
      console.error(err);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRoleId(user.roleId);
    setEditPassword('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editName || !editRoleId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmittingEdit(true);
    try {
      const payload: any = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        roleId: editRoleId,
      };

      if (editPassword.trim()) {
        payload.password = editPassword;
      }

      const res = await api.patch(`/users/${selectedUser.id}`, payload);
      if (res.data?.success) {
        toast.success('System user updated successfully!');
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
      console.error(err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      if (user.isActive) {
        // Deactivate
        const res = await api.delete(`/users/${user.id}`);
        if (res.data?.success || res.status === 200) {
          toast.success(`Deactivated user ${user.name}`);
          fetchUsers();
        }
      } else {
        // Activate
        const res = await api.patch(`/users/${user.id}`, { isActive: true });
        if (res.data?.success) {
          toast.success(`Activated user ${user.name}`);
          fetchUsers();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle user status');
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineUsers /> System User Management
          </h1>
          <p className="page-subtitle">Manage administrative login accounts, update operator profile roles, and deactivate logins.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <HiOutlinePlus style={{ marginRight: '4px' }} /> Create User Account
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">System Operators Directory</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total: {totalItems} users</span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Access Role</th>
                <th>Created Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading user listings...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No system users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                        {user.role.displayName}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleEditClick(user)}
                        >
                          <HiOutlinePencilSquare /> Edit
                        </button>
                        <button
                          className={`btn ${user.isActive ? 'btn-danger' : 'btn-primary'} btn-sm`}
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.isActive ? (
                            <>
                              <HiOutlineUserMinus /> Deactivate
                            </>
                          ) : (
                            <>
                              <HiOutlineUserPlus /> Activate
                            </>
                          )}
                        </button>
                      </div>
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
              <div>Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} users)</div>
              <div className="pagination-pages">
                <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&larr;</button>
                <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&rarr;</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: CREATE USER ───────────────────────── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Create User Account</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. John Doe"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="e.g. operator@domain.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +8801700000000"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Role Category *</label>
                    <select
                      className="form-input form-select"
                      required
                      value={createRoleId}
                      onChange={(e) => setCreateRoleId(e.target.value)}
                    >
                      <option value="">Choose role...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      placeholder="Minimum 6 characters"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCreate}>
                  {submittingCreate ? 'Saving...' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT USER ───────────────────────── */}
      {showEditModal && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Modify Operator Profile</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(false)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Email Address (Read-only)</label>
                  <input
                    type="email"
                    className="form-input"
                    disabled
                    value={selectedUser.email}
                    style={{ background: 'var(--neutral-100)', cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Access Role *</label>
                    <select
                      className="form-input form-select"
                      required
                      value={editRoleId}
                      onChange={(e) => setEditRoleId(e.target.value)}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Change Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Leave blank to keep same"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingEdit}>
                  {submittingEdit ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

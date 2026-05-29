'use client';

import { useState, useEffect } from 'react';
import {
  HiOutlineLockClosed,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  permissions: Record<string, string[]>;
  createdAt: string;
}

const PERMISSION_MODULES = [
  { key: 'customers', label: 'Customers Management', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'billing', label: 'Billing & Invoicing', actions: ['read', 'create', 'update', 'delete', 'generate'] },
  { key: 'collections', label: 'Collections & Cashbook', actions: ['read', 'create', 'update', 'approve'] },
  { key: 'accounting', label: 'Double-entry Accounting', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'hr', label: 'HR, Staff & Payroll', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'tickets', label: 'Support Tickets', actions: ['read', 'create', 'update', 'delete', 'assign'] },
  { key: 'inventory', label: 'Inventory & POP Assets', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'mikrotik', label: 'MikroTik Synchronizer', actions: ['read', 'create', 'update', 'delete', 'sync'] },
  { key: 'notifications', label: 'Notifications Hub', actions: ['read', 'create', 'send'] },
  { key: 'reports', label: 'Executive Analytics Reports', actions: ['read', 'export'] },
  { key: 'settings', label: 'System Configurations', actions: ['read', 'update'] },
  { key: 'users', label: 'System User Logins', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'audit', label: 'System Audit Logs', actions: ['read'] },
];

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, string[]>>({});
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      if (res.data?.success) {
        setRoles(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load system roles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureClick = (role: Role) => {
    setSelectedRole(role);
    setEditDisplayName(role.displayName);
    setEditDescription(role.description || '');
    // Deep clone permissions to let user edit safely before saving
    const perms = { ...role.permissions };
    // Make sure every module has at least an array to prevent undefined maps
    PERMISSION_MODULES.forEach((m) => {
      if (!perms[m.key]) {
        perms[m.key] = [];
      }
    });
    setTempPermissions(perms);
  };

  const handleActionToggle = (moduleKey: string, action: string) => {
    setTempPermissions((prev) => {
      const currentActions = prev[moduleKey] || [];
      const updatedActions = currentActions.includes(action)
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];

      return {
        ...prev,
        [moduleKey]: updatedActions,
      };
    });
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setSaving(true);
    try {
      // Filter out modules with no permissions to keep DB clean
      const cleanedPermissions: Record<string, string[]> = {};
      Object.keys(tempPermissions).forEach((k) => {
        if (tempPermissions[k] && tempPermissions[k].length > 0) {
          cleanedPermissions[k] = tempPermissions[k];
        }
      });

      const res = await api.patch(`/roles/${selectedRole.id}`, {
        displayName: editDisplayName.trim(),
        description: editDescription.trim() || null,
        permissions: cleanedPermissions,
      });

      if (res.data?.success) {
        toast.success(`Updated role ${editDisplayName} successfully!`);
        setSelectedRole(null);
        fetchRoles();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role permissions');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineLockClosed /> Role Permissions Manager
          </h1>
          <p className="page-subtitle">Configure module authorization policies and edit fine-grained user access levels.</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={fetchRoles}>
            <HiOutlineArrowPath style={{ marginRight: '4px' }} /> Refresh Roles
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRole ? '2fr 3fr' : '1fr', gap: '20px', transition: 'all 0.3s ease' }}>
        {/* Left Side: Roles List Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Available System Roles</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Internal Slug</th>
                  <th>Description</th>
                  <th>Scope</th>
                  <th style={{ textAlign: 'center' }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Loading system roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} style={{ background: selectedRole?.id === role.id ? 'var(--neutral-50)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>{role.displayName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{role.name}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{role.description || '—'}</td>
                      <td>
                        <span className={`badge ${role.isSystem ? 'badge-primary' : 'badge-neutral'}`}>
                          {role.isSystem ? 'System Default' : 'Custom'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                          onClick={() => handleConfigureClick(role)}
                        >
                          <HiOutlinePencilSquare /> Edit Access
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Permissions Editor Panel */}
        {selectedRole && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="card-title">Access Policy: {selectedRole.displayName}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Slug: {selectedRole.name}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRole(null)} style={{ minWidth: '32px', fontSize: '18px', padding: 0 }}>&times;</button>
            </div>

            <form onSubmit={handleSavePermissions} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Meta details inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Role Display Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Role Description</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter description..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                </div>

                {/* Permissions matrix */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>
                    Module Authorization Switchboard
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                    {PERMISSION_MODULES.map((mod) => (
                      <div key={mod.key} style={{
                        display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', alignItems: 'center',
                        background: 'var(--neutral-50)', padding: '10px 14px', borderRadius: '6px',
                        border: '1px solid var(--neutral-200)'
                      }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{mod.label}</strong>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          {mod.actions.map((act) => {
                            const isChecked = (tempPermissions[mod.key] || []).includes(act);
                            return (
                              <label key={act} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                fontSize: '12.5px', cursor: 'pointer', userSelect: 'none',
                                fontWeight: isChecked ? 600 : 400,
                                color: isChecked ? 'var(--primary-700)' : 'var(--text-secondary)'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleActionToggle(mod.key, act)}
                                  style={{
                                    accentColor: 'var(--primary-600)',
                                    cursor: 'pointer'
                                  }}
                                />
                                <span style={{ textTransform: 'capitalize' }}>{act}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedRole(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving Access...' : 'Apply Authorization Policy'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

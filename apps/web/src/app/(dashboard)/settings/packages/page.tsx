'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HiOutlineGlobeAlt, 
  HiOutlinePlus, 
  HiOutlinePencilSquare, 
  HiOutlineTrash, 
  HiOutlineCircleStack, 
  HiOutlineCpuChip
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Package {
  id: string;
  name: string;
  bandwidth: string;
  price: number;
  mikrotikProfile?: string;
  description?: string;
  isActive: boolean;
}

// Fallback Mock data
const MOCK_PACKAGES: Package[] = [
  {
    id: 'pkg1',
    name: '10 Mbps Home',
    bandwidth: '10 Mbps',
    price: 800,
    mikrotikProfile: '10M_Profile',
    description: 'Entry-level home broadband package.',
    isActive: true
  },
  {
    id: 'pkg2',
    name: '20 Mbps Home',
    bandwidth: '20 Mbps',
    price: 1000,
    mikrotikProfile: '20M_Profile',
    description: 'High-speed standard family home package.',
    isActive: true
  },
  {
    id: 'pkg3',
    name: '50 Mbps Dedicated',
    bandwidth: '50 Mbps',
    price: 5000,
    mikrotikProfile: '50M_Corp_Profile',
    description: 'Dedicated corporate connection with SLA.',
    isActive: true
  },
  {
    id: 'pkg4',
    name: '100 Mbps Dedicated',
    bandwidth: '100 Mbps',
    price: 12000,
    mikrotikProfile: '100M_Corp_Profile',
    description: 'Enterprise dedicated internet access.',
    isActive: true
  }
];

export default function PackagesSettingsPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bandwidth: '',
    price: 1000,
    mikrotikProfile: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/packages');
      if (res.data?.success) {
        setPackages(res.data.data);
      } else {
        setPackages(MOCK_PACKAGES);
      }
    } catch (e) {
      console.warn('API call failed, falling back to mock packages:', e);
      setPackages(MOCK_PACKAGES);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      bandwidth: '',
      price: 1000,
      mikrotikProfile: '',
      description: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      bandwidth: pkg.bandwidth,
      price: pkg.price,
      mikrotikProfile: pkg.mikrotikProfile || '',
      description: pkg.description || '',
      isActive: pkg.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate/delete this package?')) return;

    try {
      const res = await api.delete(`/packages/${id}`);
      if (res.data?.success) {
        toast.success('Package deactivated.');
        fetchPackages();
      } else {
        simulateDelete(id);
      }
    } catch {
      simulateDelete(id);
    }
  };

  const simulateDelete = (id: string) => {
    toast.success('Simulated: Package deactivated');
    setPackages(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.bandwidth.trim() || !formData.price) {
      toast.error('Name, Bandwidth, and Price are required.');
      return;
    }

    try {
      if (editingPackage) {
        const res = await api.patch(`/packages/${editingPackage.id}`, formData);
        if (res.data?.success) {
          toast.success('Package updated.');
        } else {
          simulateUpdate();
        }
      } else {
        const res = await api.post('/packages', formData);
        if (res.data?.success) {
          toast.success('Package created.');
        } else {
          simulateCreate();
        }
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch {
      if (editingPackage) {
        simulateUpdate();
      } else {
        simulateCreate();
      }
      setIsModalOpen(false);
    }
  };

  const simulateUpdate = () => {
    if (!editingPackage) return;
    toast.success('Simulated: Package updated');
    setPackages(prev => prev.map(p => p.id === editingPackage.id ? { ...p, ...formData } : p));
  };

  const simulateCreate = () => {
    toast.success('Simulated: Package created');
    const newPkg: Package = {
      id: Math.random().toString(),
      ...formData
    };
    setPackages(prev => [...prev, newPkg]);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Internet Packages Settings</h1>
          <p className="page-subtitle">Configure subscription items, monthly rates, and map to MikroTik queue/speed profiles.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Package
        </button>
      </div>

      {/* Package List Grid */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: '40px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '40px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '40px' }}></div>
          </div>
        ) : packages.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No packages configured yet. Click Add Package to start.
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Bandwidth Limit</th>
                  <th>Monthly Price</th>
                  <th>MikroTik Profile Map</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} style={{ opacity: pkg.isActive ? 1 : 0.6 }}>
                    <td style={{ fontWeight: 600 }}>{pkg.name}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineCpuChip style={{ fontSize: '12px' }} /> {pkg.bandwidth}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>৳{pkg.price.toLocaleString()}</td>
                    <td>
                      {pkg.mikrotikProfile ? (
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {pkg.mikrotikProfile}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                          No Profile (Manual Speed)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pkg.description || '—'}
                    </td>
                    <td>
                      <span className={`badge ${pkg.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => openEditModal(pkg)}>
                          <HiOutlinePencilSquare style={{ fontSize: '16px' }} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ padding: '4px', color: 'var(--danger-500)' }} 
                          onClick={() => handleDelete(pkg.id)}
                          disabled={!pkg.isActive}
                        >
                          <HiOutlineTrash style={{ fontSize: '16px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="card" style={{ width: '460px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
              {editingPackage ? 'Edit Package Details' : 'Configure New Internet Package'}
            </h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Package Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 20 Mbps Home Super"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Bandwidth *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 20 Mbps"
                    value={formData.bandwidth}
                    onChange={(e) => setFormData(prev => ({ ...prev, bandwidth: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Price (BDT) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 1000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">MikroTik Profile Mapping</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 20M_Profile"
                  value={formData.mikrotikProfile}
                  onChange={(e) => setFormData(prev => ({ ...prev, mikrotikProfile: e.target.value }))}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Must match the name of the PPPoE profile created inside RouterOS.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '60px', padding: '10px', resize: 'none' }}
                  placeholder="Short marketing details or speed notes..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-input form-select"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">Active & Visible</option>
                  <option value="false">Disabled / Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingPackage ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

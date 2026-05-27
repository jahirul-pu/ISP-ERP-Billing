'use client';

import { useState, useEffect } from 'react';
import { 
  HiOutlineServer, 
  HiOutlinePlus, 
  HiOutlineArrowPath, 
  HiOutlineSignal, 
  HiOutlineGlobeAlt, 
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface RouterConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status?: 'ONLINE' | 'OFFLINE' | 'TESTING';
  totalSecrets?: number;
  activeSessions?: number;
  lastSyncAt?: string;
}

interface SyncLog {
  id: string;
  startedAt: string;
  completedAt?: string;
  router: { name: string };
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'PARTIAL';
  totalUsers: number;
  synced: number;
  failed: number;
  errorMessage?: string;
}

export default function MikrotikPage() {
  const [routers, setRouters] = useState<RouterConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Router Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RouterConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 8728,
    username: '',
    password: ''
  });

  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({});
  const [syncingRouter, setSyncingRouter] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routersRes, logsRes] = await Promise.allSettled([
        api.get('/mikrotik/routers'),
        api.get('/mikrotik/sync-logs')
      ]);

      if (routersRes.status === 'fulfilled' && routersRes.value.data?.success) {
        // Map status property dynamically if missing
        const list = routersRes.value.data.data.map((r: any) => ({
          ...r,
          status: r.status || 'ONLINE',
          totalSecrets: r.totalSecrets || 0,
          activeSessions: r.activeSessions || 0
        }));
        setRouters(list);
      } else {
        setRouters([]);
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.data?.success) {
        setSyncLogs(logsRes.value.data.data);
      } else {
        setSyncLogs([]);
      }
    } catch (e) {
      console.warn('API fetch failed:', e);
      setRouters([]);
      setSyncLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingConnection(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/mikrotik/routers/${id}/test`);
      if (res.data?.success) {
        toast.success(res.data?.message || 'Connection to MikroTik API active!');
        setRouters(prev => prev.map(r => r.id === id ? { ...r, status: 'ONLINE' } : r));
      } else {
        toast.error(res.data?.message || 'Connection failed.');
        setRouters(prev => prev.map(r => r.id === id ? { ...r, status: 'OFFLINE' } : r));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Connection test failed.';
      toast.error(msg);
      setRouters(prev => prev.map(r => r.id === id ? { ...r, status: 'OFFLINE' } : r));
    } finally {
      setTestingConnection(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSyncRouter = async (id: string) => {
    setSyncingRouter(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/mikrotik/routers/${id}/sync`);
      if (res.data?.success) {
        toast.success(`Successfully synced PPPoE profiles & secrets!`);
        fetchData();
      } else {
        toast.error('Sync failed.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncingRouter(prev => ({ ...prev, [id]: false }));
    }
  };

  const openAddModal = () => {
    setEditingRouter(null);
    setFormData({
      name: '',
      host: '',
      port: 8728,
      username: '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (router: RouterConfig) => {
    setEditingRouter(router);
    setFormData({
      name: router.name,
      host: router.host,
      port: router.port,
      username: router.username,
      password: '' // blank password unless modifying
    });
    setIsModalOpen(true);
  };

  const handleDeleteRouter = async (id: string) => {
    if (!confirm('Are you sure you want to remove this router configuration?')) return;

    try {
      const res = await api.delete(`/mikrotik/routers/${id}`);
      if (res.data?.success) {
        toast.success('Router configuration deleted.');
        fetchData();
      } else {
        toast.error('Failed to delete router.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete router.');
    }
  };

  const handleSaveRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.host.trim() || !formData.username.trim()) {
      toast.error('Please enter Name, Host/IP, and Username.');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingRouter) {
        // Edit flow
        const res = await api.patch(`/mikrotik/routers/${editingRouter.id}`, payload);
        if (res.data?.success) {
          toast.success('Router settings updated.');
        } else {
          toast.error('Failed to update router.');
          return;
        }
      } else {
        // Add flow
        const res = await api.post('/mikrotik/routers', payload);
        if (res.data?.success) {
          toast.success('Router registered successfully.');
        } else {
          toast.error('Failed to register router.');
          return;
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error saving router.';
      toast.error(msg);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">MikroTik Router Management</h1>
          <p className="page-subtitle">Configure RouterOS API credentials, test connections, and sync user secrets &amp; sessions.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Router
        </button>
      </div>

      {/* Main Grid: Routers Cards */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }}></div>
        </div>
      ) : routers.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          No routers registered. Click &quot;Add Router&quot; to configure your MikroTik gateway.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          {routers.map((router) => (
            <div key={router.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineServer style={{ color: 'var(--primary-500)', fontSize: '18px' }} />
                  {router.name}
                </span>
                <span className={`badge ${router.status === 'ONLINE' ? 'badge-success' : 'badge-danger'}`}>
                  {router.status}
                </span>
              </div>
              <div className="card-body" style={{ flex: 1 }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '20px', paddingTop: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Host / IP:</span>
                    <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{router.host}:{router.port}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Username:</span>
                    <p style={{ fontWeight: 600 }}>{router.username}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>PPPoE Secrets:</span>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary-600)' }}>{router.totalSecrets}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Active PPPoE:</span>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--success-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="status-dot online" style={{ margin: 0 }}></span> {router.activeSessions}
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Last Synced: {router.lastSyncAt ? new Date(router.lastSyncAt).toLocaleString() : 'Never'}
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--neutral-100)', paddingTop: '16px' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1 }} 
                    onClick={() => handleTestConnection(router.id)}
                    disabled={testingConnection[router.id]}
                  >
                    <HiOutlineSignal /> {testingConnection[router.id] ? 'Ping...' : 'Test Connection'}
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ flex: 1 }} 
                    onClick={() => handleSyncRouter(router.id)}
                    disabled={syncingRouter[router.id]}
                  >
                    <HiOutlineArrowPath className={syncingRouter[router.id] ? 'spin' : ''} /> {syncingRouter[router.id] ? 'Syncing...' : 'Sync Config'}
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => openEditModal(router)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '6px', color: 'var(--danger-500)' }} onClick={() => handleDeleteRouter(router.id)}>
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync History Logs Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineGlobeAlt style={{ color: 'var(--primary-500)', fontSize: '18px' }} />
            Sync Logs History
          </span>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <HiOutlineArrowPath /> Refresh Logs
          </button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Router Name</th>
                <th>Status</th>
                <th>Synced / Total</th>
                <th>Failed</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No sync logs recorded yet.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(log.startedAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{log.router?.name || '—'}</td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.synced} / {log.totalUsers}</td>
                    <td style={{ fontWeight: 600, color: log.failed > 0 ? 'var(--danger-500)' : 'inherit' }}>{log.failed}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.errorMessage || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Router Modal */}
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
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div className="card" style={{ width: '480px', padding: '24px', position: 'relative' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
              {editingRouter ? 'Edit Router Config' : 'Register New MikroTik Router'}
            </h2>

            <form onSubmit={handleSaveRouter}>
              <div className="form-group">
                <label className="form-label">Router Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Uttara Gateway"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Host / IP Address *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 192.168.88.1"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">API Port *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 8728 }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">API Username *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. admin"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">API Password *</label>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="Enter API access password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required={!editingRouter}
                />
                <button 
                  type="button" 
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '32px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingRouter ? 'Save Changes' : 'Register Router'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mini CSS injections for rotation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

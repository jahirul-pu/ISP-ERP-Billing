'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  HiOutlineChevronRight, 
  HiOutlineChevronDown, 
  HiOutlineFolder, 
  HiOutlineFolderOpen,
  HiOutlineInboxStack,
  HiOutlineCpuChip,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineBuildingOffice
} from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Area {
  id: string;
  name: string;
  code?: string;
  zones: Zone[];
}

interface Zone {
  id: string;
  name: string;
  code?: string;
  areaId: string;
  pops: Pop[];
}

interface Pop {
  id: string;
  name: string;
  code?: string;
  address?: string;
  zoneId: string;
}

// Fallback Mock data
const MOCK_AREAS: Area[] = [
  {
    id: 'a1',
    name: 'Uttara',
    code: 'UTT',
    zones: [
      {
        id: 'z1',
        name: 'Uttara Sector 1',
        code: 'UTT-S01',
        areaId: 'a1',
        pops: [
          { id: 'p1', name: 'Sector 1 POP 01', code: 'POP-S01-A', address: 'House 12, Road 4, Sector 1', zoneId: 'z1' },
          { id: 'p2', name: 'Sector 1 POP 02', code: 'POP-S01-B', address: 'House 45, Road 8, Sector 1', zoneId: 'z1' }
        ]
      },
      {
        id: 'z3',
        name: 'Uttara Sector 3',
        code: 'UTT-S03',
        areaId: 'a1',
        pops: [
          { id: 'p3', name: 'Sector 3 POP 01', code: 'POP-S03-A', address: 'House 5, Road 2, Sector 3', zoneId: 'z3' }
        ]
      }
    ]
  },
  {
    id: 'a2',
    name: 'Mirpur',
    code: 'MIR',
    zones: [
      {
        id: 'z2',
        name: 'Mirpur Sector 10',
        code: 'MIR-S10',
        areaId: 'a2',
        pops: [
          { id: 'p4', name: 'Mirpur POP 01', code: 'POP-M10-A', address: 'Block B, Road 5, Mirpur 10', zoneId: 'z2' },
          { id: 'p5', name: 'Mirpur POP 02', code: 'POP-M10-B', address: 'Block C, Road 15, Mirpur 10', zoneId: 'z2' }
        ]
      }
    ]
  }
];

export default function AreasSettingsPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  // Tree toggle states
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'a1': true,
    'a2': true,
    'z1': true
  });

  // Selected item state for edit/details
  const [selectedNode, setSelectedNode] = useState<{
    type: 'AREA' | 'ZONE' | 'POP';
    id: string;
    name: string;
    code?: string;
    address?: string;
    parentId?: string; // areaId for Zone, zoneId for Pop
  } | null>(null);

  // Form actions
  const [formMode, setFormMode] = useState<'VIEW' | 'EDIT' | 'ADD_AREA' | 'ADD_ZONE' | 'ADD_POP'>('VIEW');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    parentId: '' // target container id
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/areas');
      if (res.data?.success) {
        setAreas(res.data.data);
      } else {
        setAreas(MOCK_AREAS);
      }
    } catch (e) {
      console.warn('API call failed, falling back to mock areas:', e);
      setAreas(MOCK_AREAS);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const selectNode = (type: 'AREA' | 'ZONE' | 'POP', item: any) => {
    setSelectedNode({
      type,
      id: item.id,
      name: item.name,
      code: item.code || '',
      address: item.address || '',
      parentId: type === 'ZONE' ? item.areaId : type === 'POP' ? item.zoneId : undefined
    });
    setFormData({
      name: item.name,
      code: item.code || '',
      address: item.address || '',
      parentId: ''
    });
    setFormMode('VIEW');
  };

  const startEdit = () => {
    if (!selectedNode) return;
    setFormMode('EDIT');
  };

  const startAddArea = () => {
    setFormData({ name: '', code: '', address: '', parentId: '' });
    setFormMode('ADD_AREA');
  };

  const startAddZone = (areaId: string) => {
    setFormData({ name: '', code: '', address: '', parentId: areaId });
    setFormMode('ADD_ZONE');
  };

  const startAddPop = (zoneId: string) => {
    setFormData({ name: '', code: '', address: '', parentId: zoneId });
    setFormMode('ADD_POP');
  };

  const handleDelete = async (type: 'AREA' | 'ZONE' | 'POP', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type.toLowerCase()}? Children records may be orphaned.`)) return;

    try {
      let endpoint = '';
      if (type === 'AREA') endpoint = `/areas/${id}`;
      if (type === 'ZONE') endpoint = `/zones/${id}`;
      if (type === 'POP') endpoint = `/pops/${id}`;

      const res = await api.delete(endpoint);
      if (res.data?.success) {
        toast.success(`${type} deleted successfully.`);
        fetchAreas();
        setSelectedNode(null);
      } else {
        simulateDelete(type, id);
      }
    } catch {
      simulateDelete(type, id);
    }
  };

  const simulateDelete = (type: 'AREA' | 'ZONE' | 'POP', id: string) => {
    toast.success(`Simulated: ${type} deleted`);
    if (type === 'AREA') {
      setAreas(prev => prev.filter(a => a.id !== id));
    } else if (type === 'ZONE') {
      setAreas(prev => prev.map(a => ({
        ...a,
        zones: a.zones.filter(z => z.id !== id)
      })));
    } else {
      setAreas(prev => prev.map(a => ({
        ...a,
        zones: a.zones.map(z => ({
          ...z,
          pops: z.pops.filter(p => p.id !== id)
        }))
      })));
    }
    setSelectedNode(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    try {
      if (formMode === 'EDIT' && selectedNode) {
        let endpoint = '';
        if (selectedNode.type === 'AREA') endpoint = `/areas/${selectedNode.id}`;
        if (selectedNode.type === 'ZONE') endpoint = `/zones/${selectedNode.id}`;
        if (selectedNode.type === 'POP') endpoint = `/pops/${selectedNode.id}`;

        const res = await api.patch(endpoint, formData);
        if (res.data?.success) {
          toast.success('Updated successfully.');
        } else {
          simulateUpdate();
        }
      } else {
        // Add flows
        let endpoint = '';
        let payload: any = { name: formData.name, code: formData.code };
        
        if (formMode === 'ADD_AREA') {
          endpoint = '/areas';
        } else if (formMode === 'ADD_ZONE') {
          endpoint = '/zones';
          payload.areaId = formData.parentId;
        } else if (formMode === 'ADD_POP') {
          endpoint = '/pops';
          payload.zoneId = formData.parentId;
          payload.address = formData.address;
        }

        const res = await api.post(endpoint, payload);
        if (res.data?.success) {
          toast.success('Created successfully.');
        } else {
          simulateCreate();
        }
      }
      fetchAreas();
      setFormMode('VIEW');
    } catch {
      if (formMode === 'EDIT') {
        simulateUpdate();
      } else {
        simulateCreate();
      }
      setFormMode('VIEW');
    }
  };

  const simulateUpdate = () => {
    if (!selectedNode) return;
    toast.success('Simulated: Update saved');
    
    if (selectedNode.type === 'AREA') {
      setAreas(prev => prev.map(a => a.id === selectedNode.id ? { ...a, name: formData.name, code: formData.code } : a));
    } else if (selectedNode.type === 'ZONE') {
      setAreas(prev => prev.map(a => ({
        ...a,
        zones: a.zones.map(z => z.id === selectedNode.id ? { ...z, name: formData.name, code: formData.code } : z)
      })));
    } else {
      setAreas(prev => prev.map(a => ({
        ...a,
        zones: a.zones.map(z => ({
          ...z,
          pops: z.pops.map(p => p.id === selectedNode.id ? { ...p, name: formData.name, code: formData.code, address: formData.address } : p)
        }))
      })));
    }
    setSelectedNode(prev => prev ? { ...prev, name: formData.name, code: formData.code, address: formData.address } : null);
  };

  const simulateCreate = () => {
    toast.success('Simulated: Entry created');
    const randomId = Math.random().toString();
    const newEntry = {
      id: randomId,
      name: formData.name,
      code: formData.code,
      address: formData.address
    };

    if (formMode === 'ADD_AREA') {
      const freshArea: Area = {
        id: randomId,
        name: formData.name,
        code: formData.code,
        zones: []
      };
      setAreas(prev => [...prev, freshArea]);
    } else if (formMode === 'ADD_ZONE') {
      const freshZone: Zone = {
        id: randomId,
        name: formData.name,
        code: formData.code,
        areaId: formData.parentId,
        pops: []
      };
      setAreas(prev => prev.map(a => a.id === formData.parentId ? { ...a, zones: [...a.zones, freshZone] } : a));
    } else if (formMode === 'ADD_POP') {
      const freshPop: Pop = {
        id: randomId,
        name: formData.name,
        code: formData.code,
        address: formData.address,
        zoneId: formData.parentId
      };
      setAreas(prev => prev.map(a => ({
        ...a,
        zones: a.zones.map(z => z.id === formData.parentId ? { ...z, pops: [...z.pops, freshPop] } : z)
      })));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Areas & Zone Settings</h1>
          <p className="page-subtitle">Configure geography nodes. Manage Areas, Zones, and Points of Presence (POPs) for fiber distribution.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={startAddArea}>
          <HiOutlinePlus style={{ marginRight: '4px' }} /> Add Area
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left Pane: Hierarchy Tree-View */}
        <div className="card" style={{ padding: '20px', minHeight: '500px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineInboxStack style={{ color: 'var(--primary-500)' }} /> Fiber Network Tree
          </h3>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="skeleton" style={{ height: '30px', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ height: '30px', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ height: '30px' }}></div>
            </div>
          ) : areas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No geographical nodes configured. Click Add Area to start.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              
              {/* Areas */}
              {areas.map((area) => {
                const areaExpanded = expandedNodes[area.id];
                const areaSelected = selectedNode?.type === 'AREA' && selectedNode.id === area.id;
                
                return (
                  <div key={area.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: areaSelected ? 'var(--primary-50)' : 'transparent',
                        border: areaSelected ? '1px solid var(--primary-200)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => selectNode('AREA', area)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleNode(area.id); }}
                          style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                          {areaExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                        </button>
                        {areaExpanded ? <HiOutlineFolderOpen style={{ color: 'var(--warning-500)', fontSize: '16px' }} /> : <HiOutlineFolder style={{ color: 'var(--warning-500)', fontSize: '16px' }} />}
                        <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{area.name}</span>
                        {area.code && <span className="badge badge-neutral" style={{ padding: '1px 6px', fontSize: '9.5px' }}>{area.code}</span>}
                      </div>
                      <div className="tree-actions" style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '4px', borderRadius: '4px' }} 
                          onClick={(e) => { e.stopPropagation(); startAddZone(area.id); }}
                          title="Add Zone to Area"
                        >
                          <HiOutlinePlus style={{ fontSize: '14px' }} />
                        </button>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '4px', borderRadius: '4px', color: 'var(--danger-500)' }} 
                          onClick={(e) => { e.stopPropagation(); handleDelete('AREA', area.id); }}
                        >
                          <HiOutlineTrash style={{ fontSize: '14px' }} />
                        </button>
                      </div>
                    </div>

                    {/* Zones (Children of Area) */}
                    {areaExpanded && (
                      <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', borderLeft: '1px dashed var(--neutral-300)', marginLeft: '18px' }}>
                        {area.zones.map((zone) => {
                          const zoneExpanded = expandedNodes[zone.id];
                          const zoneSelected = selectedNode?.type === 'ZONE' && selectedNode.id === zone.id;

                          return (
                            <div key={zone.id} style={{ display: 'flex', flexDirection: 'column' }}>
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: zoneSelected ? 'var(--primary-50)' : 'transparent',
                                  border: zoneSelected ? '1px solid var(--primary-200)' : '1px solid transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => selectNode('ZONE', zone)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleNode(zone.id); }}
                                    style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                  >
                                    {zoneExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                                  </button>
                                  <HiOutlineBuildingOffice style={{ color: 'var(--primary-500)', fontSize: '15px' }} />
                                  <span style={{ fontWeight: 500, fontSize: '13px' }}>{zone.name}</span>
                                  {zone.code && <span className="badge badge-neutral" style={{ padding: '1px 6px', fontSize: '9.5px' }}>{zone.code}</span>}
                                </div>
                                <div className="tree-actions" style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="btn btn-ghost" 
                                    style={{ padding: '4px', borderRadius: '4px' }} 
                                    onClick={(e) => { e.stopPropagation(); startAddPop(zone.id); }}
                                    title="Add POP to Zone"
                                  >
                                    <HiOutlinePlus style={{ fontSize: '14px' }} />
                                  </button>
                                  <button 
                                    className="btn btn-ghost" 
                                    style={{ padding: '4px', borderRadius: '4px', color: 'var(--danger-500)' }} 
                                    onClick={(e) => { e.stopPropagation(); handleDelete('ZONE', zone.id); }}
                                  >
                                    <HiOutlineTrash style={{ fontSize: '14px' }} />
                                  </button>
                                </div>
                              </div>

                              {/* POPs (Children of Zone) */}
                              {zoneExpanded && (
                                <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', borderLeft: '1px dashed var(--neutral-300)', marginLeft: '18px' }}>
                                  {zone.pops.map((pop) => {
                                    const popSelected = selectedNode?.type === 'POP' && selectedNode.id === pop.id;

                                    return (
                                      <div 
                                        key={pop.id}
                                        style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'space-between',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          background: popSelected ? 'var(--primary-50)' : 'transparent',
                                          border: popSelected ? '1px solid var(--primary-200)' : '1px solid transparent',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                        onClick={() => selectNode('POP', pop)}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <HiOutlineCpuChip style={{ color: 'var(--success-500)', fontSize: '14px' }} />
                                          <span style={{ fontSize: '12.5px' }}>{pop.name}</span>
                                          {pop.code && <span className="badge badge-neutral" style={{ padding: '1px 6px', fontSize: '9.5px' }}>{pop.code}</span>}
                                        </div>
                                        <div>
                                          <button 
                                            className="btn btn-ghost" 
                                            style={{ padding: '4px', borderRadius: '4px', color: 'var(--danger-500)' }} 
                                            onClick={(e) => { e.stopPropagation(); handleDelete('POP', pop.id); }}
                                          >
                                            <HiOutlineTrash style={{ fontSize: '14px' }} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* Right Pane: View/Add/Edit Node Details */}
        <div className="card" style={{ padding: '20px', minHeight: '500px' }}>
          {formMode === 'VIEW' && selectedNode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Geographical Node Details</h3>
                <button className="btn btn-secondary btn-sm" onClick={startEdit}>
                  <HiOutlinePencilSquare /> Edit Details
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '13.5px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{selectedNode.type}</span>

                  <span style={{ color: 'var(--text-secondary)' }}>Name:</span>
                  <span style={{ fontWeight: 500 }}>{selectedNode.name}</span>

                  <span style={{ color: 'var(--text-secondary)' }}>Short Code:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedNode.code || '—'}</span>

                  {selectedNode.type === 'POP' && (
                    <>
                      <span style={{ color: 'var(--text-secondary)' }}>Address:</span>
                      <span>{selectedNode.address || '—'}</span>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '20px', background: 'var(--neutral-50)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--primary-500)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {selectedNode.type === 'AREA' && "Areas are top-level regional folders used to group multiple local zones."}
                  {selectedNode.type === 'ZONE' && "Zones are sub-regions. Customers are billed based on their zone mapping."}
                  {selectedNode.type === 'POP' && "Point of Presence (POP) refers to physical fiber switch boxes where client fiber patch cords originate."}
                </div>
              </div>
            </div>
          )}

          {(formMode === 'EDIT' || formMode.startsWith('ADD_')) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  {formMode === 'EDIT' ? `Edit ${selectedNode?.type}` : 
                   formMode === 'ADD_AREA' ? 'Add New Area' :
                   formMode === 'ADD_ZONE' ? 'Add Zone to Area' : 'Add POP to Zone'}
                </h3>
              </div>

              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Short Code / Tag</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. UTT-S01"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>

                {(formMode === 'ADD_POP' || (formMode === 'EDIT' && selectedNode?.type === 'POP')) && (
                  <div className="form-group">
                    <label className="form-label">Physical POP Address</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '80px', padding: '10px', resize: 'none' }}
                      placeholder="Enter details of building, pillar box location..."
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setFormMode(selectedNode ? 'VIEW' : 'VIEW');
                      if (selectedNode) {
                        setFormData({ name: selectedNode.name, code: selectedNode.code || '', address: selectedNode.address || '', parentId: '' });
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          {!selectedNode && !formMode.startsWith('ADD_') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <HiOutlineBuildingOffice style={{ fontSize: '48px', color: 'var(--neutral-200)', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px' }}>Select an area, zone, or POP node on the left to view details, edit settings, or add sub-zones.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

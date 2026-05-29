'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineChevronLeft } from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Pop {
  id: string;
  name: string;
}

export default function NewInventoryItemPage() {
  const router = useRouter();

  // Form states
  const [pops, setPops] = useState<Pop[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('ROUTER');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('NEW');
  const [quantity, setQuantity] = useState(1);
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [popId, setPopId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPops();
  }, []);

  const fetchPops = async () => {
    try {
      const res = await api.get('/pops');
      if (res.data?.success) {
        setPops(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter an item name.');
      return;
    }
    if (quantity < 1) {
      toast.error('Quantity must be at least 1.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        serialNumber: serialNumber.trim() || undefined,
        condition,
        quantity: Number(quantity),
        supplier: supplier.trim() || undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        popId: popId || undefined,
      };

      const res = await api.post('/inventory', payload);

      if (res.data?.success) {
        toast.success(`Inventory item "${res.data.data.name}" added successfully!`);
        router.push('/inventory');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add stock item');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/inventory">Inventory</Link>
        <span className="separator">/</span>
        <span>Add Stock Item</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
            <HiOutlineChevronLeft style={{ fontSize: '20px' }} />
          </button>
          <div>
            <h1 className="page-title">Add Stock / Equipment</h1>
            <p className="page-subtitle">Register new hardware units, fibers, routers, or devices in the inventory.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div className="form-group">
            <label className="form-label">Equipment Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Mikrotik hEX lite, Huawei XPON ONU, Cat6 Cable Box"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Category / Type */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                <option value="ROUTER">Router</option>
                <option value="ONU">ONU (Optical Network Unit)</option>
                <option value="SWITCH">Switch / OLT</option>
                <option value="CABLE">Cable / Fiber Roll</option>
                <option value="SPLICE_BOX">Splice Box / TJ</option>
                <option value="BATTERY">Battery / UPS</option>
                <option value="OTHER">Other Accessories</option>
              </select>
            </div>

            {/* Serial Number */}
            <div className="form-group">
              <label className="form-label">Serial Number (S/N)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Unique S/N (leave blank for bulk items)"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Initial Condition */}
            <div className="form-group">
              <label className="form-label">Initial Condition *</label>
              <select
                className="form-input form-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                <option value="NEW">New</option>
                <option value="GOOD">Good / Tested</option>
                <option value="REPAIR">Needs Repair</option>
                <option value="DAMAGED">Damaged / Out of Service</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* POP Location */}
            <div className="form-group">
              <label className="form-label">POP Location (Optional)</label>
              <select
                className="form-input form-select"
                value={popId}
                onChange={(e) => setPopId(e.target.value)}
              >
                <option value="">-- None (General Storage) --</option>
                {pops.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div className="form-group">
              <label className="form-label">Supplier Vendor</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. TP-Link Bangladesh, local distributor"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Purchase Date */}
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                type="date"
                className="form-input"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            {/* Purchase Price */}
            <div className="form-group">
              <label className="form-label">Purchase Price (BDT)</label>
              <input
                type="number"
                placeholder="Cost per unit"
                className="form-input"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
            <Link href="/inventory" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding Stock...' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

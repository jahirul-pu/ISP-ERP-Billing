'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineCalendarDays, HiOutlineArrowLeft, HiOutlineCheck } from 'react-icons/hi2';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface AttendanceRosterItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_FIELD' | null;
  checkIn: string | null;
  checkOut: string | null;
  remarks: string | null;
  recordId: string | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDailyRoster();
  }, [date]);

  const fetchDailyRoster = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/attendance/daily?date=${date}`);
      if (res.data?.success) {
        // Parse times from backend if strings exist
        const formatted = res.data.data.map((item: any) => ({
          ...item,
          checkIn: item.checkIn ? new Date(item.checkIn).toISOString().substring(11, 16) : '',
          checkOut: item.checkOut ? new Date(item.checkOut).toISOString().substring(11, 16) : '',
          status: item.status || 'PRESENT', // default to PRESENT for easy logging
          remarks: item.remarks || '',
        }));
        setRoster(formatted);
      }
    } catch (err) {
      toast.error('Failed to load today\'s attendance roster');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (employeeId: string, status: any) => {
    setRoster(prev =>
      prev.map(item => (item.employeeId === employeeId ? { ...item, status } : item))
    );
  };

  const handleTimeChange = (employeeId: string, field: 'checkIn' | 'checkOut', value: string) => {
    setRoster(prev =>
      prev.map(item => (item.employeeId === employeeId ? { ...item, [field]: value } : item))
    );
  };

  const handleRemarksChange = (employeeId: string, value: string) => {
    setRoster(prev =>
      prev.map(item => (item.employeeId === employeeId ? { ...item, remarks: value } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Map checkIn / checkOut times back to full ISO Date strings or null
      const records = roster.map(item => {
        let checkInDate: string | undefined = undefined;
        let checkOutDate: string | undefined = undefined;

        if (item.checkIn && item.status !== 'ABSENT') {
          const [h, m] = item.checkIn.split(':');
          const d = new Date(date);
          d.setHours(Number(h), Number(m), 0, 0);
          checkInDate = d.toISOString();
        }

        if (item.checkOut && item.status !== 'ABSENT') {
          const [h, m] = item.checkOut.split(':');
          const d = new Date(date);
          d.setHours(Number(h), Number(m), 0, 0);
          checkOutDate = d.toISOString();
        }

        return {
          employeeId: item.employeeId,
          date: new Date(date).toISOString(),
          status: item.status,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          remarks: item.remarks || undefined,
        };
      });

      const res = await api.post('/hr/attendance', { records });
      if (res.data?.success) {
        toast.success(`Attendance logs for ${new Date(date).toLocaleDateString()} saved successfully!`);
        router.push('/hr');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance records');
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
            <HiOutlineCalendarDays /> Daily Attendance Roster
          </h1>
          <p className="page-subtitle">Submit or update daily attendance logs for active staff.</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/hr')}>
            <HiOutlineArrowLeft style={{ marginRight: '4px' }} /> Back to HR
          </button>
        </div>
      </div>

      {/* Date Selector Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600, marginRight: 12 }}>Attendance Date:</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '200px', display: 'inline-block' }}
              value={date}
              max={new Date().toISOString().split('T')[0]} // Cannot log future attendance
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Staff Roster Sheet</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Active roster count: {roster.length} staff
          </span>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Designation</th>
                <th>Attendance Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Remarks / Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading roster data...
                  </td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No active employees registered.
                  </td>
                </tr>
              ) : (
                roster.map((item) => (
                  <tr key={item.employeeId}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{item.employeeCode}</td>
                    <td style={{ fontWeight: 500 }}>{item.employeeName}</td>
                    <td>{item.designation || '—'}</td>
                    <td>
                      {/* Attendance Radio Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          { val: 'PRESENT', label: 'Present' },
                          { val: 'LATE', label: 'Late' },
                          { val: 'ON_FIELD', label: 'Field' },
                          { val: 'HALF_DAY', label: 'Half' },
                          { val: 'ABSENT', label: 'Absent' },
                        ].map(opt => (
                          <label
                            key={opt.val}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: item.status === opt.val ? 'var(--neutral-100)' : 'transparent',
                              border: item.status === opt.val ? '1px solid var(--neutral-300)' : '1px solid transparent',
                              fontWeight: item.status === opt.val ? 600 : 400,
                              color: item.status === opt.val ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            <input
                              type="radio"
                              name={`attendance-${item.employeeId}`}
                              value={opt.val}
                              checked={item.status === opt.val}
                              onChange={() => handleStatusChange(item.employeeId, opt.val as any)}
                              style={{ accentColor: 'var(--primary-600)' }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '4px 8px', height: '30px', width: '90px', fontSize: '12px' }}
                        disabled={item.status === 'ABSENT'}
                        value={item.checkIn || ''}
                        onChange={(e) => handleTimeChange(item.employeeId, 'checkIn', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '4px 8px', height: '30px', width: '90px', fontSize: '12px' }}
                        disabled={item.status === 'ABSENT'}
                        value={item.checkOut || ''}
                        onChange={(e) => handleTimeChange(item.employeeId, 'checkOut', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="e.g. sick leave, client visit"
                        className="form-input"
                        style={{ padding: '4px 8px', height: '30px', fontSize: '12px' }}
                        value={item.remarks || ''}
                        onChange={(e) => handleRemarksChange(item.employeeId, e.target.value)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Submit Block */}
        {!loading && roster.length > 0 && (
          <div className="card-body" style={{ borderTop: '1px solid var(--neutral-200)', display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 20px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/hr')}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <HiOutlineCheck style={{ marginRight: '4px' }} /> {saving ? 'Saving Logs...' : 'Save Attendance Logs'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { HiOutlineMagnifyingGlass, HiOutlineBell, HiOutlineBars3 } from 'react-icons/hi2';

interface TopbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  onMenuClick?: () => void;
}

export default function Topbar({ user, onMenuClick }: TopbarProps) {
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD';

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="topbar-btn" onClick={onMenuClick} style={{ display: 'none' }}>
          <HiOutlineBars3 />
        </button>

        <div className="topbar-search">
          <HiOutlineMagnifyingGlass className="topbar-search-icon" />
          <input
            type="text"
            placeholder="Search customers, invoices, or press Ctrl+K..."
            id="global-search"
          />
        </div>
      </div>

      <div className="topbar-actions">
        <button className="topbar-btn" id="notifications-btn">
          <HiOutlineBell />
          <span className="notification-dot" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
          <div className="topbar-avatar" id="user-avatar">
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name || 'Admin'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user?.role || 'Super Admin'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

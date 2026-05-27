'use client';

import Link from 'next/link';
import { 
  HiOutlineMapPin, 
  HiOutlineCpuChip, 
  HiOutlineUsers, 
  HiOutlineShieldCheck, 
  HiOutlineEnvelope, 
  HiOutlineCircleStack 
} from 'react-icons/hi2';

export default function SettingsOverviewPage() {
  const sections = [
    {
      title: 'Areas & Zones Hierarchy',
      description: 'Configure regional structures, local zones, and Point of Presence (POP) distribution hubs.',
      href: '/settings/areas',
      icon: <HiOutlineMapPin style={{ fontSize: '24px', color: 'var(--primary-500)' }} />,
      status: 'Configure'
    },
    {
      title: 'Internet Packages & Pricing',
      description: 'Manage pricing structures, speed bands, and correspond them with MikroTik RouterOS profiles.',
      href: '/settings/packages',
      icon: <HiOutlineCpuChip style={{ fontSize: '24px', color: 'var(--success-500)' }} />,
      status: 'Configure'
    },
    {
      title: 'Staff Accounts',
      description: 'Manage administrator, billing collector, technician, and manager credentials.',
      href: '#',
      icon: <HiOutlineUsers style={{ fontSize: '24px', color: 'var(--neutral-400)' }} />,
      status: 'Locked / Dev Mode'
    },
    {
      title: 'Roles & Permissions Matrix',
      description: 'Granular Role-Based Access Control (RBAC) permission setup for modules and audit logs.',
      href: '#',
      icon: <HiOutlineShieldCheck style={{ fontSize: '24px', color: 'var(--neutral-400)' }} />,
      status: 'Locked / Dev Mode'
    },
    {
      title: 'Notification Gateways',
      description: 'Configure SMS bulk services, WhatsApp API, and transactional SMTP/Email settings.',
      href: '#',
      icon: <HiOutlineEnvelope style={{ fontSize: '24px', color: 'var(--neutral-400)' }} />,
      status: 'Locked / Dev Mode'
    },
    {
      title: 'System Database Backups',
      description: 'Schedule automated database dumps, storage limits, and export collections logs.',
      href: '#',
      icon: <HiOutlineCircleStack style={{ fontSize: '24px', color: 'var(--neutral-400)' }} />,
      status: 'Locked / Dev Mode'
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure core platform options, geographic distribution, packages, and system parameters.</p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {sections.map((section, idx) => {
          const isLocked = section.href === '#';
          
          return (
            <div 
              key={idx} 
              className="card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                padding: '24px',
                opacity: isLocked ? 0.75 : 1,
                cursor: isLocked ? 'not-allowed' : 'default',
                transition: 'transform var(--transition-fast)'
              }}
            >
              <div>
                <div 
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: 'var(--neutral-50)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '16px' 
                  }}
                >
                  {section.icon}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>{section.title}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                  {section.description}
                </p>
              </div>

              <div>
                {isLocked ? (
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: 'var(--text-muted)', 
                      background: 'var(--neutral-100)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {section.status}
                  </span>
                ) : (
                  <Link 
                    href={section.href} 
                    className="btn btn-secondary btn-sm" 
                    style={{ display: 'inline-flex', width: 'auto' }}
                  >
                    Configure Settings →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

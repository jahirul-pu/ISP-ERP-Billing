'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentList,
  HiOutlineBanknotes,
  HiOutlineTicket,
  HiOutlineCube,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineServerStack,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: <HiOutlineHome /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Customers', href: '/customers', icon: <HiOutlineUsers /> },
      { label: 'MikroTik', href: '/mikrotik', icon: <HiOutlineServerStack /> },
      { label: 'Billing', href: '/billing', icon: <HiOutlineDocumentText /> },
      { label: 'Collections', href: '/collections', icon: <HiOutlineCurrencyDollar /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Accounting', href: '/accounting', icon: <HiOutlineBanknotes /> },
      { label: 'HR & Payroll', href: '/hr', icon: <HiOutlineUserGroup /> },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Tickets', href: '/tickets', icon: <HiOutlineTicket /> },
      { label: 'Inventory', href: '/inventory', icon: <HiOutlineCube /> },
      { label: 'Notifications', href: '/notifications', icon: <HiOutlineBell /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: <HiOutlineChartBar /> },
      { label: 'Audit Logs', href: '/audit', icon: <HiOutlineShieldCheck /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: <HiOutlineCog6Tooth /> },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">E</div>
        {!collapsed && <span className="sidebar-brand-text">ISP ERP</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="sidebar-link-badge">{item.badge}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

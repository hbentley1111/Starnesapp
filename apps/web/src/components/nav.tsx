'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Dashboard' },
  { href: '/capture', label: 'Capture' },
  { href: '/transcripts', label: 'Transcripts' },
  { href: '/approvals', label: 'Approvals', badge: 3 },
  { href: '/contacts', label: 'Contacts' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/properties', label: 'Properties' },
  { href: '/needs', label: 'Needs' },
  { href: '/cadences', label: 'Cadences' },
  { href: '/leads', label: 'Leads' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{ borderRight: '1px solid var(--border)', padding: '20px 12px', position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ padding: '2px 10px 18px' }}>
        <div className="display" style={{ fontSize: 15, color: 'var(--text-1)' }}>Starnes <span style={{ color: 'var(--brass)' }}>Real Estate</span></div>
        <div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Stewards of Property</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 13.5,
                color: active ? 'var(--accent)' : 'var(--text-2)',
                background: active ? 'var(--accent-tint)' : 'transparent',
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.label}
              {item.badge ? (
                <span className="chip" style={{ background: 'var(--warning-tint)', color: 'var(--warning)' }}>{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 20, left: 22, fontSize: 12, color: 'var(--text-3)' }}>Jaben S. · founder</div>
    </nav>
  );
}

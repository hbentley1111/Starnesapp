'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const groups: { title: string; items: { href: string; label: string; badge?: number }[] }[] = [
  { title: 'Core', items: [
    { href: '/', label: 'Dashboard' },
    { href: '/capture', label: 'Capture' },
    { href: '/transcripts', label: 'Transcripts' },
  ] },
  { title: 'Pipeline', items: [
    { href: '/approvals', label: 'Approvals', badge: 3 },
    { href: '/opportunities', label: 'Opportunities' },
    { href: '/contacts', label: 'Contacts' },
    { href: '/properties', label: 'Properties' },
    { href: '/needs', label: 'Needs' },
    { href: '/cadences', label: 'Cadences' },
  ] },
  { title: 'Intake', items: [
    { href: '/leads', label: 'Leads' },
    { href: '/settings', label: 'Settings' },
  ] },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{ background: 'var(--rail-bg)', color: 'var(--rail-text-2)', padding: '20px 12px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '2px 10px 20px' }}>
        <div className="display" style={{ fontSize: 15, color: 'var(--rail-text-1)' }}>Starnes <span style={{ color: 'var(--brass)' }}>Real Estate</span></div>
        <div style={{ fontSize: 9.5, color: 'var(--rail-text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Stewards of Property</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map((group) => (
          <div key={group.title}>
            <div style={{ fontSize: 9.5, color: 'var(--rail-text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 10px 6px' }}>{group.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item) => {
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
                      fontSize: 13,
                      color: active ? 'var(--rail-text-1)' : 'var(--rail-text-2)',
                      background: active ? 'var(--rail-surface)' : 'transparent',
                      fontWeight: active ? 600 : 400,
                      borderLeft: active ? '2px solid var(--brass)' : '2px solid transparent',
                    }}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="chip" style={{ background: 'var(--brass-tint)', color: 'var(--brass)' }}>{item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, fontSize: 12, color: 'var(--rail-text-3)', paddingLeft: 10 }}>Jaben S. · founder</div>
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* Compact 15px stroke icons — hand-tuned, single stroke weight, inherit currentColor. */
const I = {
  dash: <path d="M2 2h4.5v4.5H2zM8.5 2H13v4.5H8.5zM2 8.5h4.5V13H2zM8.5 8.5H13V13H8.5z" />,
  mic: <path d="M7.5 1.5a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2zM3.5 7.5a4 4 0 0 0 8 0M7.5 11.5v2" />,
  file: <path d="M4 1.5h5l2.5 2.5v9.5H4zM9 1.5V4h2.5M6 7h3M6 9.5h3" />,
  check: <path d="M2.5 2.5h10v10h-10zM5 7.5l1.8 1.8L10.5 5.5" />,
  cols: <path d="M2 2.5h3v10H2zM6 2.5h3v7H6zM10 2.5h3v8.5h-3z" />,
  users: <path d="M5.5 7a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 5.5 7zM1.5 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5M10 3a2.2 2.2 0 0 1 0 4M11 9.7c1.5.4 2.5 1.5 2.5 3.3" />,
  bldg: <path d="M3 13V2.5h6V13M5 5h2M5 7.5h2M9 6h3V13M11 8.5h.01M1.5 13h12" />,
  target: <path d="M7.5 13A5.5 5.5 0 1 0 7.5 2a5.5 5.5 0 0 0 0 11zM7.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7.5 7.5h.01" />,
  clock: <path d="M7.5 13.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM7.5 4.5v3l2 1.5" />,
  inbox: <path d="M2 8.5 3.5 3h8L13 8.5V12H2zM2 8.5h3.5l1 1.5h2l1-1.5H13" />,
  gear: <path d="M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12.5 7.5a5 5 0 0 0-.1-1l1.3-1-1-1.7-1.5.5a5 5 0 0 0-1.7-1L9.2 1.7H7.8l-.3 1.6a5 5 0 0 0-1.7 1l-1.5-.5-1 1.7 1.3 1a5 5 0 0 0 0 2l-1.3 1 1 1.7 1.5-.5a5 5 0 0 0 1.7 1l.3 1.6h1.4l.3-1.6a5 5 0 0 0 1.7-1l1.5.5 1-1.7-1.3-1c.07-.33.1-.66.1-1z" />,
};
function Icon({ d }: { d: keyof typeof I }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.9 }}>
      {I[d]}
    </svg>
  );
}

const groups: { title: string; items: { href: string; label: string; icon: keyof typeof I; badge?: number }[] }[] = [
  { title: 'Core', items: [
    { href: '/', label: 'Dashboard', icon: 'dash' },
    { href: '/capture', label: 'Capture', icon: 'mic' },
    { href: '/transcripts', label: 'Transcripts', icon: 'file' },
  ] },
  { title: 'Pipeline', items: [
    { href: '/pipeline', label: 'Deal Pipeline', icon: 'cols' },
    { href: '/approvals', label: 'Approvals', icon: 'check', badge: 3 },
    { href: '/opportunities', label: 'Opportunities', icon: 'target' },
    { href: '/contacts', label: 'Contacts', icon: 'users' },
    { href: '/properties', label: 'Properties', icon: 'bldg' },
    { href: '/cadences', label: 'Cadences', icon: 'clock' },
  ] },
  { title: 'Intake', items: [
    { href: '/leads', label: 'Leads', icon: 'inbox' },
    { href: '/settings', label: 'Settings', icon: 'gear' },
  ] },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{ background: 'var(--rail-bg)', color: 'var(--rail-text-2)', padding: '22px 14px 18px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 10px 24px' }}>
        <div className="display" style={{ fontSize: 16.5, color: 'var(--rail-text-1)', lineHeight: 1.2 }}>
          Starnes <span style={{ color: 'var(--brass-bright)' }}>Real Estate</span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--rail-text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          Stewards of Property
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map((group) => (
          <div key={group.title}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--rail-text-3)', textTransform: 'uppercase', letterSpacing: '0.13em', padding: '0 10px 7px' }}>
              {group.title}
            </div>
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
                      gap: 9,
                      padding: '7.5px 10px',
                      borderRadius: 7,
                      fontSize: 13,
                      color: active ? 'var(--rail-text-1)' : 'var(--rail-text-2)',
                      background: active ? 'var(--rail-surface)' : 'transparent',
                      fontWeight: active ? 600 : 450,
                      boxShadow: active ? 'inset 2.5px 0 0 var(--brass-bright)' : 'none',
                      transition: 'background 120ms ease, color 120ms ease',
                    }}
                  >
                    <Icon d={item.icon} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge ? (
                      <span style={{ background: 'rgba(199,154,69,0.16)', color: 'var(--brass-bright)', fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 999 }}>{item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--rail-border)', display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--rail-surface)', color: 'var(--brass-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>JS</div>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 12, color: 'var(--rail-text-1)', fontWeight: 500 }}>Jaben Starnes</div>
          <div style={{ fontSize: 10.5, color: 'var(--rail-text-3)' }}>Founder</div>
        </div>
      </div>
    </nav>
  );
}

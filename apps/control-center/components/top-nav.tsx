const ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/cron', label: 'Cron' },
  { href: '/agents', label: 'Agents' },
  { href: '/connections', label: 'Connections' },
  { href: '/optimization', label: 'Optimization' },
  { href: '/skills', label: 'Skills' }
];

export function TopNav({ current }: { current: string }) {
  return (
    <section className="chip-row" aria-label="Control Center sections">
      {ITEMS.map((item) => (
        <a key={item.href} href={item.href} className={`chip-link ${current === item.href ? 'chip-link-active' : ''}`}>
          {item.label}
        </a>
      ))}
    </section>
  );
}

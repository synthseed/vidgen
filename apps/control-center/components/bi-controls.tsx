
import Link from 'next/link';

type Range = '1h' | '24h' | '7d' | '30d';

type Props = {
  path: string;
  range: Range;
  compare: 'off' | 'previous';
  segment: 'all' | 'healthy' | 'attention';
};

const ranges: Range[] = ['1h', '24h', '7d', '30d'];

function href(path: string, range: Range, compare: 'off' | 'previous', segment: 'all' | 'healthy' | 'attention') {
  return `${path}?range=${range}&compare=${compare}&segment=${segment}`;
}

export function BiControls({ path, range, compare, segment }: Props) {
  return (
    <div className="controls-wrap">
      <div>
        <span className="controls-label">Time</span>
        <div className="chip-row">
          {ranges.map((option) => (
            <Link key={option} href={href(path, option, compare, segment)} className={`chip-link ${range === option ? 'chip-link-active' : ''}`}>
              {option}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <span className="controls-label">Compare</span>
        <div className="chip-row">
          <Link href={href(path, range, 'off', segment)} className={`chip-link ${compare === 'off' ? 'chip-link-active' : ''}`}>Off</Link>
          <Link href={href(path, range, 'previous', segment)} className={`chip-link ${compare === 'previous' ? 'chip-link-active' : ''}`}>Previous window</Link>
        </div>
      </div>
      <div>
        <span className="controls-label">Segment</span>
        <div className="chip-row">
          <Link href={href(path, range, compare, 'all')} className={`chip-link ${segment === 'all' ? 'chip-link-active' : ''}`}>All</Link>
          <Link href={href(path, range, compare, 'healthy')} className={`chip-link ${segment === 'healthy' ? 'chip-link-active' : ''}`}>Healthy</Link>
          <Link href={href(path, range, compare, 'attention')} className={`chip-link ${segment === 'attention' ? 'chip-link-active' : ''}`}>Needs attention</Link>
        </div>
      </div>
    </div>
  );
}

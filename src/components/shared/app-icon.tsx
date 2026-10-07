import React from 'react';

const paths: Record<string, string> = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
  inbox: '<path d="M4 4h16l2 10v6H2v-6L4 4ZM2 14h6l2 3h4l2-3h6"/>',
  warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  orders: '<path d="M7 3h10l3 4v14l-4-2-4 2-4-2-4 2V7l3-4Z"/><path d="M8 9h8M8 13h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  box: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9v9M3 8l9 5 9-5M7.5 5.5l9 5"/>',
  megaphone: '<path d="m3 9 18-6v18L3 15V9ZM7 16l1 5h4l-2-4M3 9H2v6h1"/>',
  chart: '<path d="M3 3v18h18M7 16v-4M12 16V8M17 16V5"/>',
  settings: '<path d="M9.7 3h4.6l.6 2.4 1.4.8 2.4-.7L21 9.4l-1.8 1.7v1.8l1.8 1.7-2.3 3.9-2.4-.7-1.4.8-.6 2.4H9.7l-.6-2.4-1.4-.8-2.4.7L3 14.6l1.8-1.7v-1.8L3 9.4l2.3-3.9 2.4.7 1.4-.8.6-2.4Z"/><circle cx="12" cy="12" r="3"/>',
  refund: '<path d="M9 7H5V3M5 7a8 8 0 1 1-1 9"/><path d="M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 7v12"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  upRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="12" r="1"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5a2 2 0 0 1 2-2h12M21 11h-6v5h6"/><circle cx="17" cy="13.5" r=".5"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4L22 2ZM22 2 11 13"/>',
  shield: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 3H4v17h17v-6"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  edit: '<path d="m16 3 5 5-12 12H4v-5L16 3Zm-2 2 5 5"/>',
  phone: '<path d="m6 3 3 5-2 2a12 12 0 0 0 7 7l2-2 5 3-1 3c-9 1-18-8-17-17l3-1Z"/>',
  folder: '<path d="M3 7V4h6l3 3h9v13H3V7Z"/>'
};

export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
  className?: string;
}

export function AppIcon({ name, size = 18, className = '', ...props }: AppIconProps) {
  const pathData = paths[name] || paths.box;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth || (name === 'refresh' ? 2 : 1.8)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon inline-block flex-shrink-0 align-middle ${className}`}
      dangerouslySetInnerHTML={{ __html: pathData }}
      {...props}
    />
  );
}

export function BrandLogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M16 5v22M5 16h22M8.2 8.2l15.6 15.6M8.2 23.8 23.8 8.2" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

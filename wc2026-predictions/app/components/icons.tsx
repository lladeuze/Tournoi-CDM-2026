/* Minimal line-icon set (Lucide-inspired). Monochrome, currentColor.
   Active/filled state is driven from CSS (stroke = currentColor,
   fill is added on `.active`). */

type IconProps = { size?: number; className?: string };

function Svg({
  size = 24,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9.6 12 3l9 6.6" />
      <path d="M5 10v10h14V10" />
      <path d="M9.5 20v-6h5v6" />
    </Svg>
  );
}

export function IconPronos(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="8" y="3" width="8" height="4" rx="1.5" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </Svg>
  );
}

export function IconMatches(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
    </Svg>
  );
}

export function IconTrophy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4.8a2 2 0 0 0 0 4H7" />
      <path d="M17 5h2.2a2 2 0 0 1 0 4H17" />
      <path d="M12 14v3.5" />
      <path d="M8.5 21h7" />
      <path d="M9.5 21c0-1.6.9-2.6 2.5-3.5 1.6.9 2.5 1.9 2.5 3.5" />
    </Svg>
  );
}

export function IconCrown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 6.5 7 11l5-6.5L17 11l4.5-4.5L19.5 18h-15L2.5 6.5Z" />
      <path d="M5 21h14" />
    </Svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </Svg>
  );
}

export function IconLeagues(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </Svg>
  );
}

export function IconRules(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Svg>
  );
}

export function IconAdmin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h9" />
      <path d="M20 7h-3" />
      <circle cx="15" cy="7" r="2.2" />
      <path d="M4 17h3" />
      <path d="M20 17h-9" />
      <circle cx="9" cy="17" r="2.2" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export function IconLogin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </Svg>
  );
}

export function IconMenu(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 12.6A8.4 8.4 0 1 1 11.4 3 6.6 6.6 0 0 0 21 12.6Z" />
    </Svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 5-7 7 7 7" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconBall(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4 3-1.5 4.8h-5L8 10l4-3Z" />
      <path d="M12 3v4M3.5 9.5 8 10M20.5 9.5 16 10M6.5 19l3-4.2M17.5 19l-3-4.2" />
    </Svg>
  );
}

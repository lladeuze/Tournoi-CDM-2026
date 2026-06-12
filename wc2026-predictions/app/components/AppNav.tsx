'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ThemeToggle from './ThemeToggle';
import {
  IconPronos,
  IconMatches,
  IconTrophy,
  IconCrown,
  IconUser,
  IconBall,
} from './icons';

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
};

const primaryTabs: NavItem[] = [
  { href: '/predictions', label: 'Pronos', Icon: IconPronos },
  { href: '/matches', label: 'Matchs', Icon: IconMatches },
  { href: '/leaderboard', label: 'Classement', Icon: IconTrophy },
  { href: '/champion', label: 'Champion', Icon: IconCrown },
  { href: '/profile', label: 'Profil', Icon: IconUser },
];

// Full set shown as horizontal links on desktop only.
const desktopLinks = [
  { href: '/', label: 'Accueil' },
  ...primaryTabs.map(({ href, label }) => ({ href, label })),
  { href: '/leagues', label: 'Ligues' },
  { href: '/rules', label: 'Règlement' },
  { href: '/admin', label: 'Admin' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AppNav() {
  const pathname = usePathname() || '/';
  const [connected, setConnected] = useState<boolean | null>(null);
  const [navCompact, setNavCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }: any) => {
      if (active) setConnected(Boolean(data?.user));
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  // Auto-hide the bottom bar when scrolling down, reveal when scrolling up.
  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 60) {
        setNavCompact(false);
      } else if (delta > 6) {
        setNavCompact(true);
      } else if (delta < -6) {
        setNavCompact(false);
      }
      lastY.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <header className={`topbar${navCompact ? ' hidden' : ''}`}>
        <Link className="brand" href="/" aria-label="Accueil">
          <IconBall size={22} />
          <span className="brand-word">WC&nbsp;2026</span>
        </Link>

        <nav className="topbar-links">
          {desktopLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={isActive(pathname, href) ? 'active' : ''}
            >
              {label}
            </Link>
          ))}
          {connected ? (
            <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>
              Déconnexion
            </a>
          ) : (
            <Link href="/login">Connexion</Link>
          )}
        </nav>

        <div className="topbar-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Bottom tab bar (mobile) — the single navigation menu */}
      <nav
        className={`bottomnav${navCompact ? ' compact' : ''}`}
        aria-label="Navigation principale"
      >
        {primaryTabs.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(pathname, href) ? 'active' : ''}
            aria-label={label}
          >
            <Icon size={26} />
          </Link>
        ))}
      </nav>
    </>
  );
}

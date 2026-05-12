'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard',           label: 'Dashboard',         exact: true,  icon: IconGrid },
      { href: '/dashboard/analytics', label: 'Analytics',         exact: false, icon: IconChart },
      { href: '/dashboard/sleep',     label: 'Sonno',             exact: false, icon: IconMoon },
      { href: '/dashboard/weekly',    label: 'Report Settimanale',exact: false, icon: IconCalendar },
      { href: '/dashboard/coach',     label: 'Coach AI',          exact: false, icon: IconBrain },
    ],
  },
  {
    group: 'Log',
    items: [
      { href: '/log/meals',            label: 'Pasti',           exact: false, icon: IconFork },
      { href: '/log/workouts',         label: 'Workout',         exact: false, icon: IconDumbbell },
      { href: '/log/workouts/history', label: 'Storico Workout', exact: false, icon: IconHistory },
      { href: '/log/weight',           label: 'Peso',            exact: false, icon: IconScale },
    ],
  },
  {
    group: 'Account',
    items: [{ href: '/profile', label: 'Profilo', exact: false, icon: IconUser }],
  },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <>
      {/* ── Desktop sidebar (md+) ─────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col h-full border-r"
        style={{ background: '#09091a', borderColor: 'rgba(109,40,217,0.2)' }}>

        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(109,40,217,0.2)' }}>
          <Logo />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-1.5 px-2"
                style={{ color: '#4a4268' }}>
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact)
                  const Icon = item.icon
                  return (
                    <NavLink key={item.href} href={item.href} active={active}>
                      <Icon active={active} />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: 'rgba(109,40,217,0.2)' }}>
          <p className="text-[11px] truncate px-2.5 py-1" style={{ color: '#4a4268' }} title={userEmail}>
            {userEmail}
          </p>
          <SignOutButton onClick={signOut} />
        </div>
      </aside>

      {/* ── Mobile header (< md) ──────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'rgba(9,9,26,0.95)',
          borderBottom: '1px solid rgba(109,40,217,0.2)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
        <Logo />
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl transition-colors"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(109,40,217,0.2)' }}
          aria-label="Apri menu"
        >
          <span className="block w-4 h-[1.5px] rounded-full" style={{ background: '#a78bfa' }} />
          <span className="block w-4 h-[1.5px] rounded-full" style={{ background: '#a78bfa' }} />
          <span className="block w-2.5 h-[1.5px] rounded-full" style={{ background: '#a78bfa' }} />
        </button>
      </header>

      {/* ── Drawer overlay ────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-out"
        style={{
          background: '#09091a',
          borderRight: '1px solid rgba(109,40,217,0.25)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={{ borderColor: 'rgba(109,40,217,0.2)' }}>
          <Logo />
          <button
            onClick={closeDrawer}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#6b5f8a' }}
            aria-label="Chiudi menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-2 px-2"
                style={{ color: '#4a4268' }}>
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact)
                  const Icon = item.icon
                  return (
                    <NavLink key={item.href} href={item.href} active={active} onClick={closeDrawer}>
                      <Icon active={active} size={16} />
                      <span className="text-[14px]">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t space-y-1 shrink-0" style={{ borderColor: 'rgba(109,40,217,0.2)' }}>
          <p className="text-[11px] truncate px-2.5 py-1" style={{ color: '#4a4268' }} title={userEmail}>
            {userEmail}
          </p>
          <SignOutButton onClick={signOut} />
        </div>
      </div>
    </>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L9.5 5.5H12L8.5 8L10 13L7 10L4 13L5.5 8L2 5.5H4.5L7 1Z" fill="white" />
        </svg>
      </div>
      <div>
        <span className="font-display font-700 text-[13px] tracking-wide text-white">HEALTH</span>
        <span className="font-display font-400 text-[13px] tracking-wide" style={{ color: '#a78bfa' }}> MENTOR</span>
      </div>
    </div>
  )
}

function NavLink({ href, active, children, onClick }: {
  href: string; active: boolean; children: React.ReactNode; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all"
      style={active ? {
        background: 'rgba(124,58,237,0.12)',
        color: '#a78bfa',
        fontWeight: 600,
        boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.25)',
      } : { color: '#6b5f8a' }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = '#d8b4fe'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = '#6b5f8a'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}
    >
      {children}
    </Link>
  )
}

function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all"
      style={{ color: '#6b5f8a' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = '#f87171'
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = '#6b5f8a'
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <IconSignOut active={false} />
      Esci
    </button>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconGrid({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="5" height="5" rx="1.5" fill={c} />
      <rect x="8" y="1" width="5" height="5" rx="1.5" fill={c} opacity="0.6" />
      <rect x="1" y="8" width="5" height="5" rx="1.5" fill={c} opacity="0.6" />
      <rect x="8" y="8" width="5" height="5" rx="1.5" fill={c} opacity="0.35" />
    </svg>
  )
}

function IconChart({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="7" width="2.5" height="6" rx="1" fill={c} opacity="0.5" />
      <rect x="5.5" y="4" width="2.5" height="9" rx="1" fill={c} opacity="0.75" />
      <rect x="10" y="1" width="2.5" height="12" rx="1" fill={c} />
    </svg>
  )
}

function IconCalendar({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="2.5" width="12" height="10.5" rx="2" stroke={c} strokeWidth="1.2" />
      <path d="M4 1v3M10 1v3" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1 6h12" stroke={c} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

function IconFork({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 1v4c0 1.1.9 2 2 2v6" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.5 1v2.5M5.5 1v2.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 1c0 0 1.5 1.5 1.5 4S10 7 10 7v6" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconDumbbell({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="5" width="2" height="4" rx="1" fill={c} />
      <rect x="3" y="4" width="1.5" height="6" rx="0.75" fill={c} opacity="0.7" />
      <rect x="9.5" y="4" width="1.5" height="6" rx="0.75" fill={c} opacity="0.7" />
      <rect x="11" y="5" width="2" height="4" rx="1" fill={c} />
      <path d="M4.5 7h5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconScale({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="9" width="11" height="4" rx="1.5" stroke={c} strokeWidth="1.2" />
      <path d="M7 9V5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.5 5h7" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.5 5l-2 4M10.5 5l2 4" stroke={c} strokeWidth="1" opacity="0.6" strokeLinecap="round" />
    </svg>
  )
}

function IconUser({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="4.5" r="2.5" stroke={c} strokeWidth="1.2" />
      <path d="M1.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconMoon({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5c1.38 0 2.63-.56 3.54-1.46C9.9 10.7 9.5 10.74 9 10.74c-2.07 0-3.74-1.68-3.74-3.74C5.26 5.5 6 4.16 7.18 3.3A5 5 0 007 2z" fill={c} />
    </svg>
  )
}

function IconBrain({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 2.5C5 1.67 5.67 1 6.5 1S8 1.67 8 2.5c0 .28-.08.54-.21.77C8.56 3.1 9 3.75 9 4.5c0 .18-.03.35-.07.52C9.58 5.3 10 6 10 6.8c0 1-.67 1.84-1.6 2.1C8.15 9.55 7.6 10 7 10H6.5C5.67 10 5 9.33 5 8.5V2.5z" stroke={c} strokeWidth="1.1" />
      <path d="M9 4.5c.6-.18 1.25.1 1.5.7.25.6-.05 1.28-.65 1.5" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5 3C4.4 2.82 3.75 3.1 3.5 3.7 3.25 4.3 3.55 5 4.15 5.2" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5.5 10v3M8.5 10v3" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

function IconHistory({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#a78bfa' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.2" />
      <path d="M7 4v3.5l2 1.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSignOut({ active, size = 14 }: { active: boolean; size?: number }) {
  const c = active ? '#f87171' : '#6b5f8a'
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 4.5l2.5 2.5L9 9.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 7H5.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

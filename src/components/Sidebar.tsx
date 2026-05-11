'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', exact: true },
      { href: '/dashboard/analytics', label: 'Analytics', exact: false },
      { href: '/dashboard/weekly', label: 'Weekly Report', exact: false },
    ],
  },
  {
    group: 'Log',
    items: [
      { href: '/log/meals', label: 'Log Meal', exact: false },
      { href: '/log/workouts', label: 'Log Workout', exact: false },
      { href: '/log/weight', label: 'Log Weight', exact: false },
    ],
  },
  {
    group: 'Account',
    items: [{ href: '/profile', label: 'Profile', exact: false }],
  },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-52 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold select-none">H</span>
          </div>
          <span className="font-semibold text-white text-sm">Health Mentor</span>
        </div>
      </div>

      <nav className="flex-1 p-2.5 space-y-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1 px-2">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-emerald-900/40 text-emerald-400 font-medium'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2.5 border-t border-neutral-800 space-y-0.5">
        <p className="text-xs text-neutral-500 truncate px-2 py-1" title={userEmail}>
          {userEmail}
        </p>
        <button
          onClick={signOut}
          className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

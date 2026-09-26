// AccountMenu — the header's account switcher. Replaces the Login button
// once someone is signed in: avatar + username + chevron (the "down
// carrot"), opening a dropdown that lists every account saved on this
// device, plus "Add another account" and "Sign out".
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, LogOut, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

export default function AccountMenu() {
  const { accounts, current, switchTo, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Close when clicking anywhere outside the menu.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!current) return null

  return (
    <div ref={menuRef} className="relative shrink-0">
      {/* Trigger — matches the header's Login button family. */}
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-purple-500/30 py-1.5 pl-1.5 pr-2.5 transition hover:border-purple-500 sm:gap-2.5"
      >
        <Avatar name={current.name} size="sm" />
        <span className="max-w-24 truncate text-sm font-semibold text-black dark:text-white sm:max-w-40">
          {current.name}
        </span>
        <ChevronDown
          size={16}
          className={`text-black/60 transition-transform dark:text-white/60 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — glass panel, same purple-only palette. */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-purple-500/20 bg-white/90 p-2 shadow-lg shadow-black/10 backdrop-blur-xl dark:bg-[#15001f]/95"
        >
          <p className="px-2 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
            Accounts on device
          </p>

          {accounts.map((account) => {
            const isActive = account.id === current.id
            return (
              <button
                key={account.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  switchTo(account.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-purple-500/10"
              >
                <Avatar name={account.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-black dark:text-white">
                    {account.name}
                  </span>
                  <span className="block truncate text-xs text-black/50 dark:text-white/50">
                    {account.email}
                  </span>
                </span>
                {isActive && (
                  <Check size={16} className="shrink-0 text-purple-600 dark:text-purple-400" />
                )}
              </button>
            )
          })}

          <div className="my-1.5 h-px bg-purple-500/20" />

          {/* Add another → the login form; come back here afterwards. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/login', { state: { from: location.pathname + location.search } })
            }}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-black/80 transition hover:bg-purple-500/10 dark:text-white/80"
          >
            <Plus size={16} className="text-purple-600 dark:text-purple-400" />
            Add another account
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-black/80 transition hover:bg-purple-500/10 dark:text-white/80"
          >
            <LogOut size={16} className="text-purple-600 dark:text-purple-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

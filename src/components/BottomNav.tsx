import { NavLink } from 'react-router-dom'
import { features } from '../config/features'

const navItems: { to: string; label: string }[] = [
  { to: '/capture', label: 'Record' },
  { to: '/', label: 'Trails' },
  { to: '/sync', label: 'Sync' },
  ...(features.IMPORT_ZIP_ENABLED ? [{ to: '/export', label: 'Export' }] : []),
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-govuk-border min-h-[64px] flex items-center justify-around"
      aria-label="Main navigation"
    >
      {navItems.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `min-h-[48px] min-w-[48px] flex flex-col items-center justify-center px-4 font-medium text-lg no-underline ${
              isActive ? 'text-tmt-teal' : 'text-govuk-muted'
            }`
          }
          aria-label={label}
        >
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

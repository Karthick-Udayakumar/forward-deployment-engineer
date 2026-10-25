import type { AppPage } from '../constants'

const NAV_LINKS: { page: AppPage; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'add', label: 'Add Encounter' },
  { page: 'search', label: 'Search Patient' },
  { page: 'high-risk', label: 'High-Risk Queue' },
]

interface AppHeaderProps {
  /** Link to highlight. */
  activePage: AppPage
  onNavigate: (page: AppPage) => void
}

export function AppHeader({ activePage, onNavigate }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1>
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('home')
          }}
        >
          Diabetes Patient Management
        </a>
      </h1>
      <nav className="app-nav" aria-label="Main">
        {NAV_LINKS.map((link) => (
          <a
            key={link.page}
            href={`#${link.page}`}
            aria-current={link.page === activePage ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              onNavigate(link.page)
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

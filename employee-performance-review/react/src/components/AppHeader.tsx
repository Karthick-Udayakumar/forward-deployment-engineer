import type { AppPage } from '../constants'

const NAV_LINKS: { page: AppPage; label: string }[] = [
  { page: 'reviews', label: 'Reviews' },
  { page: 'submit', label: 'Submit Review' },
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
          href="#reviews"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('reviews')
          }}
        >
          Employee Performance Reviews
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

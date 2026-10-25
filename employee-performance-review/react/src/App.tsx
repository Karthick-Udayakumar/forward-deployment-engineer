import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { Pager } from './components/Pager'
import { ReviewDetails } from './components/ReviewDetails'
import { ReviewFilters } from './components/ReviewFilters'
import { ReviewForm } from './components/ReviewForm'
import { ReviewsTable } from './components/ReviewsTable'
import { StatusMessage } from './components/StatusMessage'
import type { AppPage } from './constants'
import { useCreateReview } from './hooks/useCreateReview'
import { useLookups } from './hooks/useLookups'
import { useReviewDetail } from './hooks/useReviewDetail'
import { useReviewList } from './hooks/useReviewList'

function App() {
  const [page, setPage] = useState<AppPage>('reviews')
  const [notice, setNotice] = useState('') // e.g. "Review 7 submitted." shown after a save
  const [reviewId, setReviewId] = useState<number | null>(null)

  // Data for each page. Each hook loads only while its page is active.
  const list = useReviewList(page === 'reviews')
  const filterLookups = useLookups(page === 'reviews', false) // every period, for the filters
  const formLookups = useLookups(page === 'submit', true) // open periods only, for the form
  const detail = useReviewDetail(reviewId, page === 'details')

  // Moving to the list reloads it, so the rows are current
  const goTo = (next: AppPage) => {
    if (next === 'reviews') list.reload()
    setPage(next)
    setNotice('')
  }

  const addReview = useCreateReview((id) => {
    goTo('reviews') // the list reloads and shows the new review first
    list.setPage(1)
    setNotice(`Review ${id} submitted.`)
  })

  const openReview = (id: number) => {
    setReviewId(id)
    detail.reset()
    goTo('details')
  }

  // The details page belongs to the list, so that link stays highlighted
  const activeNav: AppPage = page === 'details' ? 'reviews' : page

  return (
    <div className="card">
      <AppHeader activePage={activeNav} onNavigate={goTo} />

      {page === 'reviews' && (
        <section>
          <h2>Performance Reviews</h2>
          <ReviewFilters
            employees={filterLookups.employees}
            periods={filterLookups.periods}
            busy={list.loading}
            onSearch={list.search}
          />
          {notice && <StatusMessage message={notice} variant="success" />}
          <StatusMessage
            message={list.error || (list.loading ? 'Loading…' : '')}
            variant={list.error ? 'error' : 'default'}
          />
          <ReviewsTable rows={list.rows} onOpen={openReview} />
          <Pager
            page={list.page}
            pageSize={list.pageSize}
            rowCount={list.rows.length}
            total={list.total}
            onPageChange={list.setPage}
            onPageSizeChange={list.changePageSize}
          />
        </section>
      )}

      {page === 'submit' && (
        <section>
          <h2>Submit Performance Review</h2>
          <ReviewForm
            busy={addReview.busy}
            employees={formLookups.employees}
            periods={formLookups.periods}
            lookupsFailed={formLookups.failed}
            serverErrors={addReview.serverErrors}
            message={addReview.message}
            onSubmit={addReview.save}
            onCancel={() => goTo('reviews')}
          />
        </section>
      )}

      {page === 'details' && (
        <section>
          <a
            className="back"
            href="#back"
            onClick={(event) => {
              event.preventDefault()
              goTo('reviews')
            }}
          >
            ‹ Back to List
          </a>
          <h2>Review Details</h2>
          {detail.loadError && <StatusMessage message={detail.loadError} variant="error" />}
          {!detail.detail && !detail.loadError && <StatusMessage message="Loading…" />}
          {detail.detail && <ReviewDetails review={detail.detail} />}
        </section>
      )}
    </div>
  )
}

export default App

import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { CareQueueTable } from './components/CareQueueTable'
import { CurrentInterventionTable } from './components/CurrentInterventionTable'
import { EncounterForm } from './components/EncounterForm'
import { EncountersTable } from './components/EncountersTable'
import { InterventionForm } from './components/InterventionForm'
import { OutcomeForm } from './components/OutcomeForm'
import { Pager } from './components/Pager'
import { SearchForm } from './components/SearchForm'
import { SearchResultsTable } from './components/SearchResultsTable'
import { StatusMessage } from './components/StatusMessage'
import type { AppPage } from './constants'
import { useCreateEncounter } from './hooks/useCreateEncounter'
import { useEncounterPage, useHighRiskPage } from './hooks/useEncounterQueries'
import { useEncounterSearch } from './hooks/useEncounterSearch'
import { useIntervention } from './hooks/useIntervention'
import { useReferenceCodes } from './hooks/useReferenceCodes'

const PAGE_TITLES: Record<AppPage, string> = {
  home: 'Home',
  add: 'Add Encounter',
  search: 'Search Patient',
  'high-risk': 'High-Risk Queue',
  update: 'Update Intervention',
}

function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [notice, setNotice] = useState('') // e.g. "Encounter X saved." shown after a save
  const [returnPage, setReturnPage] = useState<AppPage>('home') // where the update page's back link goes
  const [encounterId, setEncounterId] = useState<string | null>(null)

  // Data for each page. Each hook loads only while its page is active.
  const home = useEncounterPage(page === 'home')
  const queue = useHighRiskPage(page === 'high-risk')

  // Moving to a list page reloads it, so the rows are current
  const goTo = (next: AppPage) => {
    if (next === 'home') home.reload()
    if (next === 'high-risk') queue.reload()
    setPage(next)
    setNotice('')
  }

  const search = useEncounterSearch()
  const references = useReferenceCodes(page === 'add')
  const addEncounter = useCreateEncounter((id) => {
    goTo('home') // Home reloads and shows the new record at the top
    setNotice(`Encounter ${id} saved.`)
  })
  const intervention = useIntervention(encounterId, page === 'update')

  const openIntervention = (id: string) => {
    setReturnPage(page)
    setEncounterId(id)
    intervention.reset()
    goTo('update')
  }

  // The update page belongs to the High-Risk Queue, so that link stays highlighted
  const activeNav: AppPage = page === 'update' ? 'high-risk' : page
  const detail = intervention.detail

  return (
    <div className="card">
      <AppHeader activePage={activeNav} onNavigate={goTo} />

      {page === 'home' && (
        <section>
          <div className="section-head">
            <h2>Recent Encounters</h2>
            <div className="section-actions">
              <button type="button" className="secondary" onClick={home.reload}>
                Refresh Data
              </button>
            </div>
          </div>
          {notice && <StatusMessage message={notice} variant="success" />}
          <StatusMessage message={home.error || (home.loading ? 'Loading…' : '')} variant={home.error ? 'error' : 'default'} />
          <EncountersTable rows={home.rows} onOpen={openIntervention} />
          <Pager
            page={home.page}
            pageSize={home.pageSize}
            rowCount={home.rows.length}
            total={home.total}
            onPageChange={home.setPage}
            onPageSizeChange={home.changePageSize}
          />
        </section>
      )}

      {page === 'add' && (
        <section>
          <h2>Add Patient Encounter</h2>
          <EncounterForm
            busy={addEncounter.busy}
            referenceCodes={references.codes}
            referenceFailed={references.failed}
            serverErrors={addEncounter.serverErrors}
            message={addEncounter.message}
            onSubmit={addEncounter.save}
            onCancel={() => goTo('home')}
          />
        </section>
      )}

      {page === 'search' && (
        <>
          <section>
            <h2>Search Patient</h2>
            <SearchForm initialValues={search.values} busy={search.busy} hint={search.hint} onSearch={search.search} />
          </section>
          <section>
            <h2>Results</h2>
            <StatusMessage message={search.status} variant={search.error ? 'error' : 'default'} />
            {search.results === null ? (
              <p className="empty">Enter at least one condition and press Search.</p>
            ) : (
              <SearchResultsTable rows={search.results} onOpen={openIntervention} />
            )}
          </section>
        </>
      )}

      {page === 'high-risk' && (
        <section>
          <h2>High-Risk Care Queue</h2>
          <StatusMessage message={queue.error || (queue.loading ? 'Loading…' : '')} variant={queue.error ? 'error' : 'default'} />
          <CareQueueTable rows={queue.rows} onOpen={openIntervention} />
          <Pager
            page={queue.page}
            pageSize={queue.pageSize}
            rowCount={queue.rows.length}
            total={queue.total}
            onPageChange={queue.setPage}
            onPageSizeChange={queue.changePageSize}
          />
        </section>
      )}

      {page === 'update' && (
        <>
          <section>
            <a
              className="back"
              href="#back"
              onClick={(event) => {
                event.preventDefault()
                goTo(returnPage)
              }}
            >
              ‹ Back to {PAGE_TITLES[returnPage]}
            </a>
            <h2>Update Intervention</h2>
            {intervention.loadError && <StatusMessage message={intervention.loadError} variant="error" />}
            {!detail && !intervention.loadError && <StatusMessage message="Loading…" />}
            {detail && (
              <>
                <InterventionForm
                  key={`${detail.encounter_id}-${detail.updated_at ?? 'new'}`}
                  item={detail}
                  busy={intervention.updateBusy}
                  onSubmit={intervention.saveIntervention}
                />
                <StatusMessage message={intervention.updateMessage.text} variant={intervention.updateMessage.variant} />
              </>
            )}
          </section>

          {detail && (
            <section>
              <h2>30-Day Outcome</h2>
              <p className="form-note">Record this once the 30-day follow-up is complete. It does not change the risk score.</p>
              <OutcomeForm
                key={`${detail.encounter_id}-${detail.readmitted ?? 'none'}`}
                current={detail.readmitted}
                busy={intervention.outcomeBusy}
                onSave={intervention.saveOutcome}
              />
              <StatusMessage message={intervention.outcomeMessage.text} variant={intervention.outcomeMessage.variant} />
            </section>
          )}

          {detail && (
            <section>
              <h2>Current Intervention</h2>
              <CurrentInterventionTable item={detail} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default App

import { useState, type FormEvent } from 'react'
import { periodLabel } from '../format'
import type { Employee, ReviewFilters as Filters, ReviewPeriod } from '../types'

interface ReviewFiltersProps {
  employees: Employee[] | null
  periods: ReviewPeriod[] | null
  busy: boolean
  onSearch: (filters: Filters) => void
}

// Period and employee dropdowns. Empty means "all"; nothing is sent until Search is pressed.
export function ReviewFilters({ employees, periods, busy, onSearch }: ReviewFiltersProps) {
  const [periodId, setPeriodId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch({
      periodId: periodId === '' ? undefined : Number(periodId),
      employeeId: employeeId === '' ? undefined : Number(employeeId),
    })
  }

  return (
    <form className="filters" onSubmit={handleSubmit} data-testid="review-filters">
      <div>
        <label htmlFor="filter-period">Review Period</label>
        <select id="filter-period" value={periodId} onChange={(event) => setPeriodId(event.target.value)} data-testid="filter-period">
          <option value="">All Periods</option>
          {(periods ?? []).map((period) => (
            <option key={period.id} value={period.id}>
              {periodLabel(period.name, period.start_date, period.end_date)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-employee">Employee</label>
        <select id="filter-employee" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} data-testid="filter-employee">
          <option value="">All Employees</option>
          {(employees ?? []).map((employee) => (
            <option key={employee.id} value={employee.id}>
              {`${employee.employee_id} - ${employee.name}`}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={busy} data-testid="btn-search">
        Search
      </button>
    </form>
  )
}

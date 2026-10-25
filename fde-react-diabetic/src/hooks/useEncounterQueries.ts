import { getHighRiskCareQueue, getOperationsSummary, listEncounters, type RequestOptions } from '../api/client'
import { usePagedList, type PageParams } from './usePagedList'

// Module-level so their references stay the same between renders (usePagedList relies on that)
const fetchEncounterPage = (params: PageParams, options: RequestOptions) => listEncounters(params, options)
const fetchEncounterTotal = async (options: RequestOptions) => (await getOperationsSummary(options)).total_encounters
const fetchQueuePage = (params: PageParams, options: RequestOptions) => getHighRiskCareQueue(params, options)
const fetchHighRiskTotal = async (options: RequestOptions) => (await getOperationsSummary(options)).high_risk

/** Recent encounters, one page at a time. */
export function useEncounterPage(active: boolean) {
  return usePagedList(active, fetchEncounterPage, fetchEncounterTotal)
}

/** High-risk care queue, one page at a time. */
export function useHighRiskPage(active: boolean) {
  return usePagedList(active, fetchQueuePage, fetchHighRiskTotal)
}

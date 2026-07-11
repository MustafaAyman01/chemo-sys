import { useQuery } from '@tanstack/react-query'

// Fallback rates (EGP per 1 unit of currency) used if the live API is unreachable —
// keep these roughly current so the form still has a sane default.
export const FALLBACK_RATES = { EGP: 1, USD: 49.6, EUR: 54.5, GBP: 63, SAR: 13.2, AED: 13.5 }

async function fetchLiveRates() {
  // Free, keyless API — returns how many EGP each foreign currency is worth (base=EGP, inverted)
  const res = await fetch('https://open.er-api.com/v6/latest/EGP')
  if (!res.ok) throw new Error('exchange rate fetch failed')
  const json = await res.json()
  if (json.result !== 'success' || !json.rates) throw new Error('bad exchange rate response')

  const egpPerUnit = { EGP: 1 }
  for (const [code, egpToCurrency] of Object.entries(json.rates)) {
    if (egpToCurrency > 0) egpPerUnit[code] = 1 / egpToCurrency
  }
  return egpPerUnit
}

// Returns { data: { USD: 49.6, EUR: 54.5, ... }, isLoading, ... }
// data is always populated (falls back to FALLBACK_RATES while loading / on error)
export const useExchangeRates = () =>
  useQuery({
    queryKey: ['live-exchange-rates'],
    queryFn: fetchLiveRates,
    staleTime: 1000 * 60 * 60,       // an hour is plenty fresh for invoicing purposes
    retry: 1,
    placeholderData: FALLBACK_RATES,
  })

import React, { useEffect, useMemo, useState } from 'react'
import { fetchMarketplaceSearchAnalytics, type MarketplaceSearchAnalytics } from '@/api/endpoints/listing'

const formatPercent = (value: number): string => `${value.toFixed(2)}%`

const formatCount = (value: number): string => value.toLocaleString()

const barWidth = (value: number, maxValue: number): string => `${maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 8}%`

const AdminSearchAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<MarketplaceSearchAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setIsLoading(true)
      setError('')

      try {
        const payload = await fetchMarketplaceSearchAnalytics()
        if (active) {
          setAnalytics(payload)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load search analytics.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const maxSearches = useMemo(
    () => (analytics ? Math.max(...analytics.topQueries.map((item) => item.searches), 1) : 1),
    [analytics]
  )
  const maxCtr = useMemo(
    () => (analytics ? Math.max(...analytics.ctrByRank.map((item) => item.ctr), 1) : 1),
    [analytics]
  )

  if (isLoading) {
    return <div className="text-sm text-slate-600">Loading search analytics...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!analytics) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No analytics available.</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-800 px-5 py-6 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Marketplace analytics</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Search Analytics</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          This view shows what users search, which queries return no results, how results perform by rank, and which searches are happening most recently.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Searches</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(analytics.totalSearches)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Clicks</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(analytics.totalClicks)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Zero-result Queries</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(analytics.zeroResults.length)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Tracked Sessions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCount(new Set(analytics.recentSearches.map((item) => item.searchSessionId)).size)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Top Queries</h2>
            <p className="mt-1 text-sm text-slate-500">Most searched keywords with average result counts.</p>
          </div>
          <div className="space-y-4 p-4">
            {analytics.topQueries.length === 0 ? (
              <p className="text-sm text-slate-500">No search traffic recorded yet.</p>
            ) : (
              analytics.topQueries.map((item) => (
                <div key={`${item.query}-${item.searches}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">{item.query}</span>
                    <span className="text-slate-500">
                      {formatCount(item.searches)} searches • {formatCount(item.zeroResults)} zero results • avg {item.averageResults.toFixed(1)} results
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-cyan-500" style={{ width: barWidth(item.searches, maxSearches) }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">CTR by Rank</h2>
            <p className="mt-1 text-sm text-slate-500">Click-through rate for the first ranked results in search sessions.</p>
          </div>
          <div className="space-y-4 p-4">
            {analytics.ctrByRank.length === 0 ? (
              <p className="text-sm text-slate-500">No rank click data available yet.</p>
            ) : (
              analytics.ctrByRank.map((item) => (
                <div key={item.rank}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">Rank {item.rank}</span>
                    <span className="text-slate-500">
                      {formatPercent(item.ctr)} CTR • {formatCount(item.clicks)}/{formatCount(item.impressions)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-emerald-500" style={{ width: barWidth(item.ctr, maxCtr) }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Zero-result Queries</h2>
            <p className="mt-1 text-sm text-slate-500">Searches that returned nothing and may need taxonomy or inventory improvements.</p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-4">Query</th>
                  <th className="p-4">Searches</th>
                  <th className="p-4">Zero Results</th>
                </tr>
              </thead>
              <tbody>
                {analytics.zeroResults.length === 0 ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={3}>No zero-result queries yet.</td>
                  </tr>
                ) : (
                  analytics.zeroResults.map((item) => (
                    <tr key={`${item.query}-${item.searches}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-4 font-medium text-slate-800">{item.query}</td>
                      <td className="p-4 text-slate-600">{formatCount(item.searches)}</td>
                      <td className="p-4 text-slate-600">{formatCount(item.zeroResults)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Recent Searches</h2>
            <p className="mt-1 text-sm text-slate-500">Latest query activity with page, sort, and session details.</p>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-4">Query</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">Results</th>
                  <th className="p-4">Sort</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentSearches.length === 0 ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={4}>No recent searches yet.</td>
                  </tr>
                ) : (
                  analytics.recentSearches.map((item) => (
                    <tr key={`${item.searchSessionId}-${item.createdAt}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-4 font-medium text-slate-800">{item.query}</td>
                      <td className="p-4 text-slate-600">{item.searchSessionId.slice(0, 8)}...</td>
                      <td className="p-4 text-slate-600">{formatCount(item.resultCount)} results</td>
                      <td className="p-4 text-slate-600">{item.sortBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminSearchAnalytics

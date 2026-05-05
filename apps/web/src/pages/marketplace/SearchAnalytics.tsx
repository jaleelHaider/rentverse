import React, { useEffect, useState } from 'react'
import { fetchMarketplaceSearchAnalytics, type MarketplaceSearchAnalytics } from '@/api/endpoints/listing'

const barWidth = (value: number, maxValue: number) => `${maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 8}%`

const SearchAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<MarketplaceSearchAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchMarketplaceSearchAnalytics()
        if (!cancelled) {
          setAnalytics(data)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load search analytics.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const maxQueries = analytics ? Math.max(...analytics.topQueries.map((item) => item.searches), 1) : 1
  const maxCtr = analytics ? Math.max(...analytics.ctrByRank.map((item) => item.ctr), 1) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-custom py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search Insights</h1>
          <p className="mt-2 text-gray-600">Track what people search, what returns no results, and which ranks get clicked.</p>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">Loading analytics...</div>
        )}

        {error && !isLoading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
        )}

        {analytics && !isLoading && !error && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">Total searches</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{analytics.totalSearches.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">Total clicks</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{analytics.totalClicks.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">Zero-result queries</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">{analytics.zeroResults.length.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">Top Queries</h2>
                <div className="mt-4 space-y-3">
                  {analytics.topQueries.length === 0 ? (
                    <p className="text-sm text-gray-500">No search traffic yet.</p>
                  ) : (
                    analytics.topQueries.map((item) => (
                      <div key={`${item.query}-${item.searches}`}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-800">{item.query}</span>
                          <span className="text-gray-500">{item.searches} searches • {item.zeroResults} zero results</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div className="h-3 rounded-full bg-primary-500" style={{ width: barWidth(item.searches, maxQueries) }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">CTR by Rank</h2>
                <div className="mt-4 space-y-3">
                  {analytics.ctrByRank.length === 0 ? (
                    <p className="text-sm text-gray-500">No rank click data yet.</p>
                  ) : (
                    analytics.ctrByRank.map((item) => (
                      <div key={item.rank}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-800">Rank {item.rank}</span>
                          <span className="text-gray-500">{item.ctr}% CTR • {item.clicks}/{item.impressions}</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div className="h-3 rounded-full bg-emerald-500" style={{ width: barWidth(item.ctr, maxCtr) }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Zero-result Queries</h2>
              <div className="mt-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Query</th>
                      <th className="py-2 pr-4">Searches</th>
                      <th className="py-2 pr-4">Zero Results</th>
                      <th className="py-2 pr-4">Average Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.zeroResults.length === 0 ? (
                      <tr>
                        <td className="py-4 text-gray-500" colSpan={4}>No zero-result terms yet.</td>
                      </tr>
                    ) : (
                      analytics.zeroResults.map((item) => (
                        <tr key={`${item.query}-${item.searches}`} className="border-t border-gray-100">
                          <td className="py-3 pr-4 font-medium text-gray-800">{item.query}</td>
                          <td className="py-3 pr-4 text-gray-600">{item.searches}</td>
                          <td className="py-3 pr-4 text-gray-600">{item.zeroResults}</td>
                          <td className="py-3 pr-4 text-gray-600">{item.searches > 0 ? (item.zeroResults / item.searches * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default SearchAnalytics


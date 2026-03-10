import React from 'react'
import { ShoppingCart, CalendarDays } from 'lucide-react'

export type OrderMode = 'rent' | 'buy'

interface OrderModeSelectorProps {
  availableModes: OrderMode[]
  selectedMode: OrderMode
  onSelect: (mode: OrderMode) => void
  isLocked: boolean
}

const labels: Record<OrderMode, { title: string; subtitle: string; icon: React.ReactNode }> = {
  rent: {
    title: 'Book Item',
    subtitle: 'Reserve this item for a rental period',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  buy: {
    title: 'Buy Item',
    subtitle: 'Purchase this item permanently',
    icon: <ShoppingCart className="h-5 w-5" />,
  },
}

const OrderModeSelector: React.FC<OrderModeSelectorProps> = ({
  availableModes,
  selectedMode,
  onSelect,
  isLocked,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Choose Order Type</h2>
        {isLocked ? <span className="text-xs text-gray-500">Fixed by listing type</span> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {availableModes.map((mode) => {
          const active = selectedMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              disabled={isLocked}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                active
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
              } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
            >
              <div className="mb-2 inline-flex items-center gap-2 font-semibold">
                {labels[mode].icon}
                {labels[mode].title}
              </div>
              <p className="text-sm">{labels[mode].subtitle}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OrderModeSelector

import React from 'react'
import { CreditCard, Landmark, WalletCards } from 'lucide-react'

export type PaymentMethod = 'escrow_card' | 'bank_transfer' | 'wallet'

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const methods: Array<{ id: PaymentMethod; title: string; description: string; icon: React.ReactNode }> = [
  {
    id: 'escrow_card',
    title: 'Card via Escrow',
    description: 'Recommended: funds held securely until handover confirmation.',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: 'bank_transfer',
    title: 'Bank Transfer',
    description: 'Transfer to RentVerse escrow account using your bank app.',
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    id: 'wallet',
    title: 'Wallet (JazzCash / Easypaisa)',
    description: 'Pay from supported mobile wallets through secure checkout.',
    icon: <WalletCards className="h-5 w-5" />,
  },
]

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Payment Method</h2>
      <div className="space-y-3">
        {methods.map((method) => {
          const checked = value === method.id
          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                checked ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                className="mt-1 h-4 w-4"
                name="payment-method"
                checked={checked}
                onChange={() => onChange(method.id)}
              />
              <div className="mt-0.5 text-teal-700">{method.icon}</div>
              <div>
                <p className="font-medium text-gray-900">{method.title}</p>
                <p className="text-sm text-gray-600">{method.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default PaymentMethodSelector

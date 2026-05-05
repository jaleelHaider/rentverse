import React from 'react'
import { ShieldCheck, CircleDollarSign, CheckCheck } from 'lucide-react'

const EscrowInfoCard: React.FC = () => {
  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-teal-900">
        <ShieldCheck className="h-5 w-5" />
        How Escrow Protects You
      </h3>
      <div className="space-y-3 text-sm text-teal-900">
        <div className="flex gap-2">
          <CircleDollarSign className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>Your payment is held by RentVerse, not sent directly to the seller.</p>
        </div>
        <div className="flex gap-2">
          <CheckCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>Funds are released only after confirmed handover (and safe return for rentals).</p>
        </div>
        <p className="rounded-lg bg-white/70 p-3">
          If there is any issue, transaction logs and confirmation records help dispute resolution.
        </p>
      </div>
    </div>
  )
}

export default EscrowInfoCard


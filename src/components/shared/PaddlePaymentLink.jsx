import React, { useEffect, useState } from 'react'
import { initializePaddlePaymentLink } from '../../lib/billing'

export default function PaddlePaymentLink() {
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    initializePaddlePaymentLink().catch(() => {
      if (active) setError('Unable to open the payment link. Please reload or contact JobSensei support.')
    })
    return () => { active = false }
  }, [])
  if (!error) return null
  return <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-navy-800 border border-red-400 p-4 text-white">{error}</div>
}

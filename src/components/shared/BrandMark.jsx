import React from 'react'
import logoUrl from '../../../extension/icons/icon-48.png'

export default function BrandMark({ className = 'w-9 h-9' }) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      className={`${className} rounded-xl flex-shrink-0 shadow-lg`}
    />
  )
}

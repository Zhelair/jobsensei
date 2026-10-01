import React from 'react'
import Settings from '../Settings/Settings'
import Feedback from './Feedback'

export default function Account() {
  return <><div className="max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto px-4 md:px-6 pt-4 flex justify-end"><button type="button" className="btn-secondary" onClick={() => window.dispatchEvent(new CustomEvent('jobsensei:open-feedback'))}>Feedback & support</button></div><Settings mode="account" /><div className="max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto px-4 md:px-6 pb-8"><Feedback /></div></>
}

import React from 'react'
import Settings from '../Settings/Settings'
import Feedback from './Feedback'

export default function Account() {
  return <><Settings mode="account" /><div className="max-w-4xl md:max-w-5xl xl:max-w-[72rem] mx-auto px-4 md:px-6 pb-8"><Feedback /></div></>
}

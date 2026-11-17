import React from 'react'
import { useLanguage } from '../../context/LanguageContext'

export default function EvidenceReview({ result }) {
  const { t } = useLanguage()
  return <>
    {typeof result.readability === 'string' && result.readability && <div className="card"><h4 className="font-display font-semibold mb-2">{t('evidence.readability')}</h4><p className="text-slate-300 text-sm">{result.readability}</p></div>}
    {result.requirementCoverage?.length > 0 && <div className="card space-y-3">
      <h4 className="font-display font-semibold">{t('evidence.coverage')}</h4>
      {result.requirementCoverage.map((item, index) => <div key={index} className="border-l-2 border-teal-500/30 pl-3 text-sm">
        <p className="text-white">{item.requirement}</p>
        <p className="text-slate-400 text-xs">{item.priority}</p>
        <p className={item.evidence ? 'text-teal-300' : 'text-yellow-300'}>{item.evidence ? `“${item.evidence}”` : t('evidence.confirm')}</p>
        <p className="text-slate-300">{item.assessment}</p>
      </div>)}
    </div>}
    {[['wordingOpportunities', 'evidence.wording'], ['experienceGaps', 'evidence.gaps']].map(([field, key]) => Array.isArray(result[field]) && result[field].length > 0 && <div key={field} className="card"><h4 className="font-display font-semibold mb-2">{t(key)}</h4><ul className="space-y-2 text-sm text-slate-300">{result[field].filter(text => typeof text === 'string').map((text, index) => <li key={index}>• {text}</li>)}</ul></div>)}
  </>
}

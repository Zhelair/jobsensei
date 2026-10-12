import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PaddlePaymentLink from './components/shared/PaddlePaymentLink.jsx'
import './index.css'
import './refined-ui.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PaddlePaymentLink />
  </React.StrictMode>,
)

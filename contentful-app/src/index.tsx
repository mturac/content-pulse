/**
 * ContentPulse App for Contentful
 * Entry point for the Contentful App
 */
import React from 'react'
import { render } from 'react-dom'
import { SDKProvider } from '@contentful/react-apps-toolkit'
import { Sidebar } from './locations/Sidebar'

const App: React.FC = () => {
  return (
    <SDKProvider>
      <Sidebar />
    </SDKProvider>
  )
}

render(<App />, document.getElementById('root'))

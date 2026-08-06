import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import './index.css';
import { requestPersistentStorage } from './utils/persistStorage';
import { startUpdateCheck } from './utils/swUpdate';
import ErrorBoundary from './components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
  </React.StrictMode>
);

requestPersistentStorage();
startUpdateCheck();
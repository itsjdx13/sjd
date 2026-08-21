import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/estedad';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);

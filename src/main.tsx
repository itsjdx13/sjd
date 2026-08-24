import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/estedad';
import './styles.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const StyleguidePage = React.lazy(() => import('./features/styleguide/StyleguidePage'));

registerSW({ immediate: true });

const content = window.location.pathname.startsWith('/styleguide')
  ? <React.Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading design system…</div>}><StyleguidePage /></React.Suspense>
  : <App />;

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary>{content}</ErrorBoundary></React.StrictMode>);

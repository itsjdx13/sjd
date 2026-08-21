import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { failed: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Deliberately no third-party logging. */ }
  render() {
    if (this.state.failed) return <main className="fatal-error"><p className="eyebrow">LOCAL APP ERROR</p><h1>Your portfolio data is safe.</h1><p>The interface could not render, but IndexedDB was not cleared. Reload the app; if the problem remains, export a browser backup before clearing site data.</p><button className="primary-button" onClick={() => window.location.reload()}>Reload Northstar</button></main>;
    return this.props.children;
  }
}

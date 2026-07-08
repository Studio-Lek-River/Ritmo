import React from 'react';
import { t } from '../i18n/useTranslation';

// Vangnet voor render-crashes. Class-component omdat React error boundaries
// alleen via getDerivedStateFromError/componentDidCatch werken (functionele
// componenten kunnen geen boundary zijn). Gebruikt de synchrone `t()` uit
// useTranslation.js, want de hook-vorm is hier niet beschikbaar.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBackToToday = () => {
    const { onReset } = this.props;
    if (onReset) {
      this.setState({ hasError: false, error: null, errorInfo: null });
      onReset();
    } else {
      // Zonder onReset-callback (bv. de app-brede boundary in main.jsx) is er
      // geen view-state om naar terug te vallen, dus herladen is het veilige
      // alternatief.
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;
    const details = [error?.message, errorInfo?.componentStack].filter(Boolean).join('\n');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t('errorBoundary.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
            {t('errorBoundary.reassurance')}
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              {t('errorBoundary.reload')}
            </button>
            <button
              type="button"
              onClick={this.handleBackToToday}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium"
            >
              {t('errorBoundary.backToToday')}
            </button>
          </div>
          {details && (
            <details className="text-left bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <summary className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                {t('errorBoundary.detailsToggle')}
              </summary>
              <pre className="mt-2 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

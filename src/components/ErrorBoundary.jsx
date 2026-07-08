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

    // De app gebruikt een expliciete darkMode-boolean (Tailwind draait op de
    // `media`-strategie, dus `dark:`-varianten zouden hier het OS-thema volgen
    // i.p.v. de in-app-instelling). We honoreren daarom de meegegeven prop en
    // vallen alleen zonder prop (de app-brede boundary in main.jsx, vóór App
    // z'n settings kent) terug op de OS-voorkeur.
    const dark = this.props.darkMode ?? (
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    );
    const c = (light, night) => (dark ? night : light);

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${c('from-slate-50 to-blue-50', 'from-slate-900 to-slate-800')}`}>
        <div className={`max-w-md w-full rounded-2xl shadow-lg p-6 text-center ${c('bg-white', 'bg-slate-800')}`}>
          <h1 className={`text-lg font-semibold mb-2 ${c('text-slate-800', 'text-slate-100')}`}>
            {t('errorBoundary.title')}
          </h1>
          <p className={`text-sm mb-5 ${c('text-slate-600', 'text-slate-300')}`}>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium ${c('bg-slate-100 text-slate-700', 'bg-slate-700 text-slate-200')}`}
            >
              {t('errorBoundary.backToToday')}
            </button>
          </div>
          {details && (
            <details className={`text-left rounded-lg p-3 ${c('bg-slate-50', 'bg-slate-900')}`}>
              <summary className={`text-xs font-medium cursor-pointer select-none ${c('text-slate-500', 'text-slate-400')}`}>
                {t('errorBoundary.detailsToggle')}
              </summary>
              <pre className={`mt-2 text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto ${c('text-slate-500', 'text-slate-400')}`}>
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

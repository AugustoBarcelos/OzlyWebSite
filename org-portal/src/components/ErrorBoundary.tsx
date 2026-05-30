import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}
interface State {
  err: Error | null;
}

/**
 * Root error boundary so an uncaught exception in a route component renders a
 * graceful "Something went wrong" screen instead of a white page.
 *
 * Sentry can be wired up by changing the `componentDidCatch` body — keeps the
 * recovery UX even when telemetry isn't configured yet.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', err, info.componentStack);
    }
    captureException(err, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            !
          </div>
          <h1 className="text-lg font-semibold text-navy-700">Something went wrong</h1>
          <p className="mt-2 text-sm text-navy-500">
            We hit an unexpected error rendering this page. Try reloading — if it keeps happening,
            sign out and back in, or contact support.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Reload
            </button>
            <a
              href="/"
              className="rounded-md px-4 py-2 text-sm font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

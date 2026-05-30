import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl font-display font-bold text-navy-700">404</div>
        <h1 className="mt-3 text-base font-semibold text-navy-700">Page not found</h1>
        <p className="mt-2 text-sm text-navy-500">
          The page you're looking for doesn't exist or moved. Use the links below to get back on
          track.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/invoices"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Go to Invoices
          </Link>
          <Link
            to="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

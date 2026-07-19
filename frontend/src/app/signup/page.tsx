import Link from 'next/link'
import { signup } from '../actions'

export default async function SignupPage(props: {
  searchParams: Promise<{ error: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="flex min-h-screen flex-col bg-brand-sand">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 rounded-card border border-brand-gold/20 bg-white p-8 shadow-card">
          <div className="text-center">
            <h2 className="text-h3 font-medium text-brand-green">Create an account</h2>
            <p className="mt-2 text-body text-neutral-600">
              Join to test the servicing agent
            </p>
          </div>

          <form className="mt-8 space-y-6" action={signup}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-body-sm font-medium text-brand-green"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-neutral-200 px-4 py-3 text-body focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-body-sm font-medium text-brand-green"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full rounded-lg border border-neutral-200 px-4 py-3 text-body focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {searchParams?.error && (
              <div className="rounded-lg bg-semantic-error/10 p-3 text-body-sm text-semantic-error">
                {searchParams.error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-pill bg-brand-green px-4 py-3 text-body-sm font-semibold text-white transition-colors hover:bg-brand-green-700"
            >
              Create Account
            </button>
          </form>

          <p className="text-center text-body-sm text-neutral-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-gold hover:text-brand-gold-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user && !data.session) {
          setMessage('Check your email to confirm your account! You may need to verify your email before signing in.')
        } else if (data.session) {
          setMessage('Account created successfully! Redirecting...')
          setTimeout(() => {
            window.location.assign('/')
          }, 500)
        } else {
          setMessage('Account created! Check your email to confirm.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message?.includes('rate limit') || error.message?.includes('too many') || error.status === 429) {
            throw new Error('Too many login attempts from this IP address. Please wait 5-10 minutes before trying again.')
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials.')
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Please check your email and confirm your account before signing in.')
          } else {
            throw error
          }
        }

        if (data.session) {
          setMessage('Sign in successful! Redirecting...')
          setTimeout(() => {
            window.location.assign('/')
          }, 500)
        } else {
          throw new Error('No session created. This might mean email confirmation is required. Check your email or disable email confirmation in Supabase settings.')
        }
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred. Check the browser console for details.')
    } finally {
      setLoading(false)
    }
  }

  const isError = message.toLowerCase().includes('error') ||
    message.toLowerCase().includes('invalid') ||
    message.toLowerCase().includes('failed') ||
    message.toLowerCase().includes('too many')

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--foreground)]">
            FlashyFlash
          </h1>
          <p className="text-[var(--foreground)]/70">
            Folders of flashcards, ready to flip
          </p>
        </div>

        <div className="bg-[var(--muted)] rounded-lg border border-[var(--border)] p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !isSignUp
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--background)] text-[var(--foreground)]/70'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isSignUp
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--background)] text-[var(--foreground)]/70'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                isError
                  ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                  : 'bg-green-500/20 text-green-700 dark:text-green-400'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import ReviewLimitsButton from '@/components/ReviewLimitsButton'
import FoldersList from '@/components/FoldersList'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-1 sm:mb-2 text-[var(--foreground)]">
              FlashyFlash
            </h1>
            <p className="text-sm sm:text-base text-[var(--foreground)]/70">
              Folders of flashcards, ready to flip
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ReviewLimitsButton />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        <FoldersList />
      </div>
    </main>
  )
}

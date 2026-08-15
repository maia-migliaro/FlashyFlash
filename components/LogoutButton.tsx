'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors"
    >
      <LogOut size={16} />
      Logout
    </button>
  )
}

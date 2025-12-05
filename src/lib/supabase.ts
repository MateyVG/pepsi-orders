import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hvuphedhtkoercnivmij.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dXBoZWRodGtvZXJjbml2bWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjA5MTYsImV4cCI6MjA4MDI5NjkxNn0.eqI-AfkNSnEP2CwR62x4RTKbzI0ohW3rFKGp8VoiRq4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message
  }
  return 'Възникна неочаквана грешка'
}

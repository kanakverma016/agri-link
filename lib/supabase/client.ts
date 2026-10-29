import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      },
    )
  }
  return client
}

export const MEDIA_BUCKET = 'media'

/** Uploads a file to the public media bucket under `<uid>/<path>` and returns its public URL. */
export async function uploadMedia(userId: string, path: string, file: Blob, contentType?: string) {
  const supabase = createClient()
  const objectPath = `${userId}/${path}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType: contentType ?? (file instanceof File ? file.type : undefined),
  })
  if (error) throw error
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath).data.publicUrl
}

export function safeFileName(name: string) {
  return name.replace(/[^\w.-]/g, '_')
}

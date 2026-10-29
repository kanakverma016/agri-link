import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function getSupabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new Error('Supabase server configuration is missing')
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return client
}

export async function uploadUserFile({
  userId,
  path,
  body,
  contentType,
}: {
  userId: string
  path: string
  body: Buffer | ArrayBuffer | Uint8Array
  contentType: string
}) {
  const supabase = getSupabaseAdmin()
  const objectPath = `${userId}/${path.replace(/^\/+/, '')}`
  const { error } = await supabase.storage.from('user-files').upload(objectPath, body, {
    contentType,
    upsert: true,
  })
  if (error) throw error

  const { data, error: signedUrlError } = await supabase.storage
    .from('user-files')
    .createSignedUrl(objectPath, 60 * 60)
  if (signedUrlError) throw signedUrlError
  return { path: objectPath, url: data.signedUrl }
}

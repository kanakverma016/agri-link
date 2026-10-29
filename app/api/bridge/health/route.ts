import { NextResponse } from 'next/server'
import { verifyFirebaseRequest } from '@/lib/firebase-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const firebaseUser = await verifyFirebaseRequest(request)
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('profiles').select('firebase_uid').eq('firebase_uid', firebaseUser.uid).maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json({ ok: true, firebaseUid: firebaseUser.uid })
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
}

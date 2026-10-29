'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = Record<string, unknown>

export type LiveQueryOptions = {
  table: string
  enabled?: boolean
  select?: string
  /** Equality filters, also used as the realtime filter when a single one is given. */
  eq?: Record<string, string | undefined>
  /** Array-contains filter (e.g. chat participants). */
  contains?: { column: string; value: string[] }
  orderBy?: string
  ascending?: boolean
  limit?: number
}

/**
 * Fetches rows from a Supabase table and refetches whenever a realtime
 * change arrives for it. Replaces Firestore `onSnapshot` listeners.
 */
export function useLiveQuery<T = Row>(options: LiveQueryOptions) {
  const { table, enabled = true, select = '*', eq, contains, orderBy, ascending = false, limit } = options
  const [items, setItems] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const channelId = useId()

  const eqKey = JSON.stringify(eq ?? {})
  const containsKey = JSON.stringify(contains ?? null)
  const optionsRef = useRef({ select, eqKey, containsKey, orderBy, ascending, limit })
  optionsRef.current = { select, eqKey, containsKey, orderBy, ascending, limit }

  const refetch = useCallback(async () => {
    const o = optionsRef.current
    const supabase = createClient()
    let query = supabase.from(table).select(o.select)
    for (const [column, value] of Object.entries(JSON.parse(o.eqKey) as Record<string, string>)) {
      query = query.eq(column, value)
    }
    const c = JSON.parse(o.containsKey) as { column: string; value: string[] } | null
    if (c) query = query.contains(c.column, c.value)
    if (o.orderBy) query = query.order(o.orderBy, { ascending: o.ascending })
    if (o.limit) query = query.limit(o.limit)
    const { data, error: queryError } = await query
    if (queryError) {
      console.error(`Error loading ${table}: `, queryError)
      setError(true)
    } else {
      setItems((data ?? []) as unknown as (T & { id: string })[])
      setError(false)
    }
    setLoading(false)
  }, [table])

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    void refetch()

    const supabase = createClient()
    const eqEntries = Object.entries(JSON.parse(eqKey) as Record<string, string>)
    const filter = eqEntries.length === 1 ? `${eqEntries[0][0]}=eq.${eqEntries[0][1]}` : undefined
    const channel = supabase
      .channel(`live:${table}:${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => {
        void refetch()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, table, eqKey, containsKey, orderBy, ascending, limit, refetch, channelId])

  return { items, loading, error, refetch }
}

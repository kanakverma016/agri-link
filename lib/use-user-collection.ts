'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useUserCollection<T = DocumentData>(
  userId: string | undefined,
  name: string,
  orderField: string,
) {
  const [items, setItems] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    const q = query(collection(db, 'users', userId, name), orderBy(orderField, 'desc'))
    return onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as T) })))
        setError(false)
        setLoading(false)
      },
      (err) => {
        console.error(`Error loading ${name}: `, err)
        setError(true)
        setLoading(false)
      },
    )
  }, [userId, name, orderField])

  return { items, loading, error }
}

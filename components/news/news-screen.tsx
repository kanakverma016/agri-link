'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'

type Article = {
  title?: string
  description?: string
  link: string
  image_url?: string
  source_id?: string
}

type Lang = 'en' | 'hi'

const DEFAULT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/smaart-krishi.firebasestorage.app/o/default-news.png?alt=media&token=c1935811-2b1a-4d37-9d7a-d02773c260f8'

async function fetchNews(url: string): Promise<Article[]> {
  const res = await apiFetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || res.statusText)
  return data.results as Article[]
}

export function NewsScreen() {
  const [lang, setLang] = useState<Lang>('en')
  const { data, error, isLoading } = useSWR(`/api/news?lang=${lang}`, fetchNews, {
    revalidateOnFocus: false,
  })
  const articles = data?.filter((a) => a.title && a.description)

  return (
    <MobileFrame>
      <nav className="z-20 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="flex-grow text-center text-xl font-bold text-green-700">{"Today's Agri News"}</h1>
          <div className="w-8" />
        </div>
      </nav>

      <div className="flex-grow overflow-y-auto pb-20">
        <div className="sticky top-0 z-10 flex justify-center space-x-2 border-b border-gray-200 bg-gray-100 p-3">
          {([
            ['en', 'English'],
            ['hi', 'हिन्दी'],
          ] as const).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                'rounded-full px-4 py-1 text-sm font-semibold',
                lang === code ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="space-y-4 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center pt-20">
              <div
                role="status"
                aria-label="Loading"
                className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"
              />
              <p className="mt-4 text-gray-500">{"Fetching today's top agri news..."}</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <i className="ph ph-warning-circle text-4xl" aria-hidden="true" />
              <p className="mt-2 font-semibold">Could not load news</p>
              <p className="text-sm text-gray-600">{error.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                This can happen if the API key is invalid or has reached its daily quota.
              </p>
            </div>
          ) : !articles || articles.length === 0 ? (
            <p className="pt-10 text-center text-gray-500">
              No relevant agriculture news found in {lang === 'hi' ? 'Hindi' : 'English'} today.
            </p>
          ) : (
            articles.map((article) => (
              <a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.image_url || DEFAULT_IMAGE}
                  alt=""
                  className="h-[180px] w-full border-b border-gray-200 object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = DEFAULT_IMAGE
                  }}
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800">{article.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{article.description}</p>
                  <p className="mt-3 text-xs text-gray-400">{article.source_id || 'News Source'}</p>
                </div>
              </a>
            ))
          )}
        </main>
      </div>

      <BottomNav active="home" />
    </MobileFrame>
  )
}

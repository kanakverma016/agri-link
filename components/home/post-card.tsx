'use client'

import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Post } from '@/lib/types'
import { FeedVideo } from '@/components/home/feed-video'
import { useLanguage } from '@/components/providers/language-provider'

export function PostCard({ post, currentUid }: { post: Post; currentUid: string }) {
  const { t, locale } = useLanguage()
  const isLiked = post.likes?.includes(currentUid) ?? false

  async function toggleLike() {
    const { error } = await createClient().rpc('toggle_like', { post_id: post.id })
    if (error) console.error('Failed to toggle like:', error)
  }

  return (
    <article className="mb-4 overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="flex items-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.authorProfilePic || DEFAULT_PROFILE_LOGO}
          alt=""
          className="mr-3 h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-gray-800">{post.authorName || t('Anonymous User')}</p>
          <p className="text-xs text-gray-500">
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString(locale) : t('Just now')}
          </p>
        </div>
      </div>
      <div className="relative">
        {post.videoUrl ? (
          <FeedVideo src={post.videoUrl} />
        ) : post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt={t('Post')} className="h-auto max-h-96 w-full object-cover" />
        ) : null}
      </div>
      <div className="p-4">
        <p className="whitespace-pre-wrap break-words text-gray-700">{post.caption || ''}</p>
      </div>
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center space-x-6 border-t border-gray-200 p-4 text-gray-600">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={isLiked}
          aria-label={isLiked ? t('Unlike post') : t('Like post')}
          className={cn('flex items-center space-x-2 hover:text-red-500', isLiked && 'text-red-500')}
        >
          <i className={cn('ph ph-heart text-2xl', isLiked && 'ph-fill')} aria-hidden="true" />
          <span className="text-sm font-semibold">{post.likes?.length || 0}</span>
        </button>
        <button
          type="button"
          aria-label={t('Comments')}
          className="flex items-center space-x-2 hover:text-blue-500"
        >
          <i className="ph ph-chat-circle-dots text-2xl" aria-hidden="true" />
          <span className="text-sm font-semibold">{post.comments?.length || 0}</span>
        </button>
      </div>
    </article>
  )
}

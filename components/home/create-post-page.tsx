'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient, safeFileName, uploadMedia } from '@/lib/supabase/client'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { cn } from '@/lib/utils'

type Props = {
  onClose: () => void
  showAlert: (title: string, message: string) => void
}

export function CreatePostPage({ onClose, showAlert }: Props) {
  const { user, profile } = useAuth()
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const mic = useSpeechRecognition((text) =>
    setCaption((prev) => prev + (prev ? ' ' : '') + text),
  )

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const canPost = (!!file || caption.trim().length > 0) && !submitting
  const isVideo = file?.type.startsWith('video') ?? false

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    if (videoInputRef.current && e.target !== videoInputRef.current) videoInputRef.current.value = ''
    if (photoInputRef.current && e.target !== photoInputRef.current) photoInputRef.current.value = ''
    setFile(picked)
  }

  function removeFile() {
    setFile(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = caption.trim()
    if ((!trimmed && !file) || !user) return
    if (!profile) {
      showAlert('Error', 'User data not loaded. Please wait a moment and try again.')
      return
    }

    setSubmitting(true)
    try {
      let fileUrl: string | null = null
      if (file) {
        const folder = isVideo ? 'videos' : 'images'
        setProgress(30)
        fileUrl = await uploadMedia(user.uid, `posts/${folder}/${Date.now()}_${safeFileName(file.name)}`, file)
        setProgress(90)
      }

      const { error } = await createClient()
        .from('posts')
        .insert({
          userId: user.uid,
          authorName: profile.name || 'Anonymous User',
          authorProfilePic: profile.profilePicture || user.photoURL || DEFAULT_PROFILE_LOGO,
          caption: trimmed,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          ...(file && fileUrl ? (isVideo ? { videoUrl: fileUrl } : { imageUrl: fileUrl }) : {}),
        })
      if (error) throw error
      onClose()
    } catch (error) {
      console.error('Error saving post:', error)
      showAlert(
        'Post Error',
        `Could not save your post. Please try again. ${error instanceof Error ? error.message : ''}`,
      )
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-50">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={onClose} aria-label="Back" className="text-gray-600">
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="flex-grow text-center text-xl font-bold text-gray-800">Post it</h2>
          <button
            type="submit"
            form="create-post-form"
            disabled={!canPost}
            className={cn(
              'text-lg font-semibold text-blue-600',
              !canPost && 'cursor-not-allowed opacity-50',
            )}
          >
            Post it
          </button>
        </div>
      </nav>
      <div className="flex-grow overflow-y-auto p-4">
        <form id="create-post-form" onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="relative mb-4">
            <label htmlFor="post-caption" className="sr-only">
              Caption
            </label>
            <textarea
              id="post-caption"
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full resize-none border-none p-3 text-lg placeholder-gray-400 focus:outline-none"
              placeholder="Hint on post creation"
            />
            {mic.supported && (
              <button
                type="button"
                onClick={mic.start}
                aria-label="Dictate caption"
                className={cn(
                  'absolute right-3 top-3 hover:text-blue-600',
                  mic.listening ? 'text-blue-600' : 'text-gray-500',
                )}
              >
                <i className="ph ph-microphone text-2xl" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mb-6 space-y-3">
            <label
              htmlFor="post-video"
              className="flex cursor-pointer items-center rounded-lg border border-green-300 bg-green-50 p-3 hover:bg-green-100"
            >
              <i className="ph ph-video-camera mr-3 text-2xl text-green-600" aria-hidden="true" />
              <span className="font-medium text-green-700">Click and add video</span>
              <input
                ref={videoInputRef}
                type="file"
                id="post-video"
                accept="video/*"
                className="hidden"
                onChange={pickFile}
              />
            </label>
            <label
              htmlFor="post-photo"
              className="flex cursor-pointer items-center rounded-lg border border-green-300 bg-green-50 p-3 hover:bg-green-100"
            >
              <i className="ph ph-image mr-3 text-2xl text-green-600" aria-hidden="true" />
              <span className="font-medium text-green-700">Add photo</span>
              <input
                ref={photoInputRef}
                type="file"
                id="post-photo"
                accept="image/*"
                className="hidden"
                onChange={pickFile}
              />
            </label>
          </div>
          {file && previewUrl && (
            <div className="mb-4">
              <div className="relative h-48 w-full overflow-hidden rounded-lg border border-gray-300">
                {isVideo ? (
                  <video src={previewUrl} controls className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  aria-label="Remove file"
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
                >
                  <i className="ph ph-x text-lg" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="post-tags" className="mb-2 block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="post-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
              placeholder="e.g., wheat, tractor, fertilizer"
            />
          </div>
          {progress !== null && (
            <div className="mb-4 w-full rounded-full bg-gray-200">
              <div
                className="rounded-full bg-blue-600 p-0.5 text-center text-xs font-medium leading-none text-blue-100"
                style={{ width: `${progress}%` }}
              >
                {Math.round(progress)}%
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

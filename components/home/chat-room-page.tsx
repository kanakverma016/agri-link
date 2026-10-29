'use client'

import { useEffect, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuth } from '@/components/providers/auth-provider'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useTts } from '@/hooks/use-tts'
import { cn } from '@/lib/utils'
import type { ChatDetails, ChatMessage } from '@/lib/types'

function TtsButton({
  id,
  text,
  loadingId,
  playingId,
  onToggle,
}: {
  id: string
  text: string
  loadingId: string | null
  playingId: string | null
  onToggle: (id: string, text: string) => void
}) {
  const playing = playingId === id
  const loading = loadingId === id
  return (
    <button
      type="button"
      className={cn('tts-button', playing && 'playing')}
      disabled={loading}
      aria-label={playing ? 'Stop audio' : 'Listen to message'}
      onClick={() => onToggle(id, text)}
    >
      {loading ? (
        <div className="chat-spinner" />
      ) : (
        <i className={cn('ph', playing ? 'ph-stop' : 'ph-speaker-simple-high')} aria-hidden="true" />
      )}
    </button>
  )
}

export function ChatRoomPage({
  chat,
  onBack,
  showAlert,
}: {
  chat: ChatDetails
  onBack: () => void
  showAlert: (title: string, message: string) => void
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const containerRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tts = useTts(showAlert)
  const mic = useSpeechRecognition((t) => setText((prev) => prev + (prev ? ' ' : '') + t))

  useEffect(() => {
    const q = query(collection(db, 'chats', chat.chatId, 'messages'), orderBy('timestamp'))
    return onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) })))
        setLoadError(false)
      },
      (err) => {
        console.error('Error loading messages: ', err)
        setLoadError(true)
      },
    )
  }, [chat.chatId])

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function handleBack() {
    tts.stop()
    onBack()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const messageText = text.trim()
    if ((!messageText && !imageFile) || !user || sending) return
    setSending(true)
    try {
      let imageUrl: string | null = null
      if (imageFile) {
        const storageRef = ref(storage, `chatImages/${chat.chatId}/${Date.now()}_${imageFile.name}`)
        const uploaded = await uploadBytesResumable(storageRef, imageFile)
        imageUrl = await getDownloadURL(uploaded.ref)
      }
      await addDoc(collection(db, 'chats', chat.chatId, 'messages'), {
        senderId: user.uid,
        text: messageText,
        timestamp: serverTimestamp(),
        imageUrl,
      })
      await updateDoc(doc(db, 'chats', chat.chatId), {
        lastMessage: messageText || 'Sent an image',
        lastMessageTimestamp: serverTimestamp(),
      })
      setText('')
      setImageFile(null)
    } catch (error) {
      console.error('Error sending message: ', error)
      showAlert('Error', 'Could not send message.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="mr-3 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chat.otherUser.profilePicture}
            alt=""
            className="mr-3 h-9 w-9 rounded-full object-cover"
          />
          <h2 className="truncate text-lg font-bold text-gray-800">{chat.otherUser.name}</h2>
        </div>
      </nav>
      <main ref={containerRef} className="flex flex-grow flex-col gap-3 overflow-y-auto p-4">
        {loadError ? (
          <p className="p-10 text-center text-red-500">Error loading messages.</p>
        ) : messages === null ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const body = msg.text || ''
            const sent = msg.senderId === user?.uid
            const tts_ = body ? (
              <TtsButton
                id={msg.id}
                text={body}
                loadingId={tts.loadingId}
                playingId={tts.playingId}
                onToggle={tts.toggle}
              />
            ) : null
            return (
              <div
                key={msg.id}
                className={cn('chat-bubble', sent ? 'sent' : 'received', msg.imageUrl && 'with-image')}
              >
                {msg.imageUrl ? (
                  <>
                    <div className="chat-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.imageUrl} alt="Chat attachment" />
                    </div>
                    {body && (
                      <div className="chat-caption-container">
                        <span className="chat-caption">{body}</span>
                        {tts_}
                      </div>
                    )}
                  </>
                ) : body ? (
                  <>
                    <span className="chat-text-content">{body}</span>
                    {tts_}
                  </>
                ) : (
                  '...'
                )}
              </div>
            )
          })
        )}
      </main>

      {imagePreview && (
        <div className="border-t border-gray-200 bg-gray-100 p-2">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Selected attachment" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setImageFile(null)}
              aria-label="Remove image"
              className="absolute right-1 top-1 rounded-full bg-black bg-opacity-50 p-0.5 text-white"
            >
              <i className="ph ph-x text-sm" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-shrink-0 items-center border-t border-gray-200 bg-white p-2"
      >
        <label
          htmlFor="chat-image-input"
          className="cursor-pointer p-2 text-gray-500 hover:text-green-600"
          aria-label="Attach image"
        >
          <i className="ph ph-paperclip text-2xl" aria-hidden="true" />
        </label>
        <input
          type="file"
          id="chat-image-input"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setImageFile(f)
            e.target.value = ''
          }}
        />
        {mic.supported && (
          <button
            type="button"
            onClick={mic.start}
            aria-label="Dictate message"
            className={cn(
              'mic-button-chat p-2 text-gray-500 hover:text-blue-600',
              mic.listening && 'listening',
            )}
          >
            <i className="ph ph-microphone text-2xl" aria-hidden="true" />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          placeholder="Type a message..."
          aria-label="Message"
          autoComplete="off"
          className="w-full rounded-full border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={sending}
          aria-label="Send"
          className="ml-2 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-600 p-3 text-white hover:bg-green-700"
        >
          {sending ? (
            <div className="chat-spinner" />
          ) : (
            <i className="ph ph-paper-plane-right text-2xl" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  )
}

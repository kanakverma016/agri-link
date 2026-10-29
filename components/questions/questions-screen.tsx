'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { apiFetch } from '@/lib/api-client'
import { useSpeechSearch } from '@/lib/use-speech-search'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { QACard, type QuestionDoc } from '@/components/questions/qa-card'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

async function fetchSpeech(text: string): Promise<Blob> {
  const res = await apiFetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error ?? `TTS failed (${res.status})`)
  }
  return res.blob()
}

export function QuestionsScreen() {
  const { user } = useAuth()
  const { alert, showAlert, closeAlert } = useAlert()
  const [questions, setQuestions] = useState<QuestionDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const speech = useSpeechSearch((t) => setText((prev) => (prev ? `${prev} ${t}` : t)), 'hi-IN')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'questions'), orderBy('createdAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<QuestionDoc, 'id'>) })))
        setLoading(false)
      },
      (err) => {
        console.error('Error loading history:', err)
        setLoadError(true)
        setLoading(false)
      },
    )
  }, [user])

  const stopAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPlayingId(null)
  }, [])

  useEffect(() => stopAudio, [stopAudio])

  const clearForm = () => {
    setText('')
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onImageChange = (file: File | undefined) => {
    if (!file) return clearForm()
    if (file.size > MAX_IMAGE_BYTES) {
      showAlert('Image too large', 'Please choose an image under 5 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const pregenerateAudio = async (docId: string, answer: string) => {
    if (!user) return
    const docRef = doc(db, 'users', user.uid, 'questions', docId)
    if (answer.includes('माफ़ करें')) {
      await updateDoc(docRef, { audioURL: 'failed' }).catch(() => {})
      return
    }
    try {
      const blob = await fetchSpeech(answer)
      const snapshot = await uploadBytes(ref(storage, `users/${user.uid}/questionAudio/${docId}.wav`), blob)
      await updateDoc(docRef, { audioURL: await getDownloadURL(snapshot.ref) })
    } catch (err) {
      console.error(`Error pre-generating audio for ${docId}:`, err)
      await updateDoc(docRef, { audioURL: 'failed' }).catch(() => {})
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const questionText = text.trim()
    const file = imageFile
    if (!questionText && !file) return showAlert('Question needed', 'Please type a question or upload an image.')
    if (!user) return
    if (abortRef.current) return showAlert('Please wait', 'Please wait for the current question to be answered or stop it.')

    setSubmitting(true)
    const controller = new AbortController()
    abortRef.current = controller
    let docRef: ReturnType<typeof doc> | null = null

    try {
      let questionImageURL: string | null = null
      let imageBase64: string | null = null
      if (file) {
        const snapshot = await uploadBytes(
          ref(storage, `users/${user.uid}/images/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`),
          file,
        )
        questionImageURL = await getDownloadURL(snapshot.ref)
        imageBase64 = await fileToBase64(file)
      }

      const created = await addDoc(collection(db, 'users', user.uid, 'questions'), {
        questionText,
        questionImageURL,
        status: 'pending',
        createdAt: serverTimestamp(),
        answerText: '',
        audioURL: null,
      })
      docRef = created
      clearForm()

      const res = await apiFetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, imageBase64, imageMimeType: file?.type }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `API request failed with status ${res.status}`)

      await updateDoc(created, { status: 'answered', answerText: data.answer })
      void pregenerateAudio(created.id, data.answer)
    } catch (error) {
      console.error('Error processing question:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (docRef) await updateDoc(docRef, { status: 'answered', answerText: 'Stopped by user.', audioURL: 'failed' })
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        showAlert('Error', `Error processing question. ${message}`)
        if (docRef) {
          await updateDoc(docRef, {
            status: 'answered',
            answerText: `Sorry, I couldn't get an answer. Please try again. \nError: ${message}`,
            audioURL: 'failed',
          })
        }
      }
    } finally {
      setSubmitting(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const handleStop = async (id: string) => {
    if (abortRef.current) {
      abortRef.current.abort()
      return
    }
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.uid, 'questions', id), {
        status: 'answered',
        answerText: 'Stopped by user.',
        audioURL: 'failed',
      })
    } catch (err) {
      console.error('Error stopping question:', err)
      showAlert('Error', 'Could not stop the request. Please refresh.')
    }
  }

  const handlePlay = async (q: QuestionDoc) => {
    if (playingId === q.id) return stopAudio()
    stopAudio()
    try {
      let src: string
      if (q.audioURL && q.audioURL !== 'failed') {
        src = q.audioURL
      } else {
        setAudioLoadingId(q.id)
        const blob = await fetchSpeech(q.answerText ?? '')
        src = URL.createObjectURL(blob)
        objectUrlRef.current = src
      }
      const audio = new Audio(src)
      audioRef.current = audio
      audio.onended = stopAudio
      audio.onerror = () => {
        showAlert('Audio Error', 'Could not play audio.')
        stopAudio()
      }
      setPlayingId(q.id)
      await audio.play()
    } catch (err) {
      console.error('Error playing audio:', err)
      showAlert('TTS Error', err instanceof Error ? err.message : 'Could not play audio.')
      stopAudio()
    } finally {
      setAudioLoadingId(null)
    }
  }

  return (
    <MobileFrame>
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <h1 className="text-xl font-bold text-green-700">Ask an Expert</h1>
        </div>
      </nav>

      <main className="flex-grow space-y-4 overflow-y-auto p-4 pb-40">
        {loading && (
          <div className="p-10 text-center">
            <div className="flex justify-center"><Spinner /></div>
            <p className="mt-2 text-gray-500">Loading history...</p>
          </div>
        )}
        {loadError && <p className="text-center text-red-500">Error loading history.</p>}
        {!loading && !loadError && questions.length === 0 && (
          <div className="p-10 text-center">
            <i className="ph ph-question mx-auto text-6xl text-gray-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-gray-700">No Questions Yet</h2>
            <p className="text-gray-500">Ask your first question about your crops, soil, or any farm-related problem.</p>
          </div>
        )}
        {questions.map((q) => (
          <QACard
            key={q.id}
            q={q}
            playing={playingId === q.id}
            loadingAudio={audioLoadingId === q.id}
            onStop={handleStop}
            onPlay={handlePlay}
          />
        ))}
      </main>

      <div className="absolute bottom-20 w-full border-t border-gray-200 bg-gray-100 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {imagePreview && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-300">
              <Image src={imagePreview} alt="Selected image preview" fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={clearForm}
                aria-label="Remove image"
                className="absolute right-1 top-1 rounded-full bg-black bg-opacity-50 p-0.5 text-white"
              >
                <i className="ph ph-x text-sm" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <label
              htmlFor="image-upload"
              className="flex-shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-3 hover:bg-gray-50"
            >
              <i className="ph ph-camera text-2xl text-gray-600" aria-hidden="true" />
              <span className="sr-only">Attach image</span>
            </label>
            <input
              ref={fileInputRef}
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onImageChange(e.target.files?.[0])}
            />
            {speech.supported && (
              <button
                type="button"
                onClick={speech.start}
                aria-label="Speak your question"
                className={`flex-shrink-0 rounded-lg border border-gray-300 bg-white p-3 hover:bg-gray-50 ${speech.listening ? 'animate-pulse border-red-400' : ''}`}
              >
                <i className={`ph ph-microphone text-2xl ${speech.listening ? 'text-red-500' : 'text-gray-600'}`} aria-hidden="true" />
              </button>
            )}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              aria-label="Your question"
              placeholder="Ask your question..."
              className="w-full rounded-lg border border-gray-300 p-3"
            />
            <button
              type="submit"
              disabled={submitting}
              aria-label="Send question"
              className="flex-shrink-0 rounded-lg bg-green-600 p-3 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? (
                <Spinner className="h-6 w-6 border-2" />
              ) : (
                <i className="ph ph-paper-plane-right text-2xl" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </div>

      <BottomNav active="questions" />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}

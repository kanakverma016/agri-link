'use client'

import { useEffect, useRef } from 'react'

export function FeedVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.currentTime = 0
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      controls
      loop
      muted
      playsInline
      className="h-auto max-h-96 w-full object-cover"
      onClick={(e) => {
        if (e.target === ref.current && ref.current) ref.current.muted = !ref.current.muted
      }}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

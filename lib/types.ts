import type { Timestamp } from 'firebase/firestore'

export type Post = {
  id: string
  userId: string
  authorName?: string
  authorProfilePic?: string
  caption?: string
  tags?: string[]
  createdAt?: Timestamp | null
  likes?: string[]
  comments?: unknown[]
  videoUrl?: string
  imageUrl?: string
}

export type ChatUser = {
  uid: string
  name: string
  profilePicture: string
}

export type ChatDetails = {
  chatId: string
  otherUser: ChatUser
}

export type ChatMessage = {
  id: string
  senderId: string
  text?: string
  imageUrl?: string | null
}

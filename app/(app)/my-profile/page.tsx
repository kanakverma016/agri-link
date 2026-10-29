import type { Metadata } from 'next'
import { ProfileForm } from '@/components/menu/profile-form'

export const metadata: Metadata = { title: 'Edit Profile' }

export default function MyProfilePage() {
  return <ProfileForm />
}

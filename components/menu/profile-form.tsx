'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, safeFileName, uploadMedia } from '@/lib/supabase/client'
import { DEFAULT_PROFILE_LOGO } from '@/lib/constants'
import { useAuth } from '@/components/providers/auth-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'
import { useLanguage } from '@/components/providers/language-provider'

const INPUT = 'w-full rounded-md border border-gray-300 p-3'

type Form = {
  name: string
  phone: string
  land: string
  state: string
  district: string
  block: string
  village: string
}

export function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth()
  const { alert, showAlert, closeAlert } = useAlert()
  const { t } = useLanguage()
  const [form, setForm] = useState<Form>({
    name: '',
    phone: '',
    land: '',
    state: '',
    district: '',
    block: '',
    village: '',
  })
  const [picture, setPicture] = useState(DEFAULT_PROFILE_LOGO)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      name: profile?.name || user?.displayName || '',
      phone: profile?.phone || '',
      land: profile?.landHolding != null ? String(profile.landHolding) : '',
      state: profile?.state || '',
      district: profile?.district || '',
      block: profile?.block || '',
      village: profile?.village || '',
    })
    setPicture(profile?.profilePicture || user?.photoURL || DEFAULT_PROFILE_LOGO)
  }, [profile, user])

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function handlePicture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    const previous = picture
    setPicture(URL.createObjectURL(file))
    setUploading(true)
    try {
      const url = await uploadMedia(user.uid, `profilePicture/${Date.now()}-${safeFileName(file.name)}`, file)
      const { error } = await createClient().from('profiles').update({ profilePicture: url }).eq('id', user.uid)
      if (error) throw error
      setPicture(url)
      await refreshProfile()
      showAlert(t('Success'), t('Profile picture updated!'))
    } catch (error) {
      console.error('Error uploading image: ', error)
      showAlert(t('Upload Error'), t('Could not upload your picture. Please try again.'))
      setPicture(previous)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const { error } = await createClient()
        .from('profiles')
        .update({
          name: form.name,
          phone: form.phone,
          landHolding: parseFloat(form.land) || 0,
          state: form.state,
          district: form.district,
          block: form.block,
          village: form.village,
        })
        .eq('id', user.uid)
      if (error) throw error
      await refreshProfile()
      showAlert(t('Success'), t('Your profile has been updated!'))
    } catch (error) {
      console.error('Error updating profile: ', error)
      showAlert(t('Error'), t('Could not save changes. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const field = (
    key: keyof Form,
    label: string,
    type = 'text',
  ) => (
    <div>
      <label htmlFor={`profile-${key}`} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={`profile-${key}`}
        type={type}
        value={form[key]}
        onChange={set(key)}
        required
        step={type === 'number' ? 'any' : undefined}
        className={INPUT}
      />
    </div>
  )

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/menu"
            aria-label={t('Back to menu')}
            className="mr-4 rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">{t('Edit Profile')}</h1>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={picture}
                alt={t('Profile')}
                className="h-24 w-24 rounded-full border-4 border-green-200 object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                  <div
                    role="status"
                    aria-label={t('Uploading')}
                    className="h-8 w-8 animate-spin rounded-full border-2 border-green-200 border-t-green-600"
                  />
                </div>
              )}
            </div>
            <label
              htmlFor="image-upload"
              className="cursor-pointer text-sm font-medium text-green-600 hover:text-green-700"
            >
              {t('Change Picture')}
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={handlePicture}
            />
          </div>

          <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            {field('name', t('Full Name'))}
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-gray-700">
                {t('Email (Cannot be changed)')}
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile?.email || user?.email || ''}
                readOnly
                className={`${INPUT} bg-gray-100`}
              />
            </div>
            {field('phone', t('Phone Number'), 'tel')}
            {field('land', t('Land Holding (in acres)'), 'number')}
            {field('state', t('State'))}
            {field('district', t('District'))}
            {field('block', t('Block'))}
            {field('village', t('Village'))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-70"
          >
            {saving ? t('Saving...') : t('Save Changes')}
          </button>
        </form>
      </main>

      <BottomNav active="menu" />
      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}

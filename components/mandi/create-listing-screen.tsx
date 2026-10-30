'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, safeFileName, uploadMedia } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useLanguage } from '@/components/providers/language-provider'
import { MobileFrame } from '@/components/mobile-frame'
import { Spinner } from '@/components/ui/spinner'
import { AlertModal, useAlert } from '@/components/ui/alert-modal'

type SellerProfile = { name?: string; profilePicture?: string; district?: string; state?: string }

const field = 'w-full rounded-md border border-gray-300 p-3'
const label = 'mb-1 block text-sm font-medium text-gray-700'

export function CreateListingScreen() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { alert, showAlert, closeAlert } = useAlert()
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cropName, setCropName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState('Quintal')
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState('Quintal')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load(uid: string) {
      try {
        const { data, error } = await createClient()
          .from('profiles')
          .select('name, profilePicture, district, state')
          .eq('id', uid)
          .maybeSingle()
        if (error || !data) throw error ?? new Error('User profile not found.')
        if (cancelled) return
        setProfile(data)
        setLocation(`${data.district || t('Unknown')}, ${data.state || t('India')}`)
      } catch (err) {
        console.error('Error loading user data: ', err)
        if (!cancelled)
          showAlert(t('Error'), t('Could not load your profile. Please complete your profile first.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load(user.uid)
    return () => {
      cancelled = true
    }
  }, [user, showAlert, t])

  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!user || !profile || !imageFile) {
      showAlert(t('Missing Info'), t('Please fill all fields and upload a photo.'))
      return
    }
    setSubmitting(true)
    setProgress(0)
    try {
      const imageUrl = await uploadMedia(
        user.uid,
        `b2b-listings/${Date.now()}_${safeFileName(imageFile.name)}`,
        imageFile,
      )
      setProgress(100)

      const { error } = await createClient().from('b2b_listings').insert({
        sellerId: user.uid,
        sellerName: profile.name || t('Farmer'),
        sellerProfilePic: profile.profilePicture || null,
        location,
        cropName: cropName.trim(),
        quantity: parseFloat(quantity),
        quantityUnit,
        price: parseFloat(price),
        priceUnit,
        imageUrl,
        status: 'Active',
      })
      if (error) throw error
      showAlert(t('Success'), t('Your listing is now live!'))
      setTimeout(() => router.push('/my-listings'), 1500)
    } catch (err) {
      console.error('Error creating listing: ', err)
      showAlert(t('Error'), t('Could not create listing. Please try again.'))
      setSubmitting(false)
    }
  }

  return (
    <MobileFrame className="bg-gray-100">
      <nav className="z-10 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/mandi"
            aria-label={t('Back to mandi')}
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-green-700">{t('Create New Listing')}</h1>
          <button
            type="submit"
            form="listing-form"
            disabled={submitting || !profile}
            className="rounded-lg p-2 font-semibold text-green-600 hover:bg-green-50 disabled:opacity-50"
          >
            {submitting ? t('Posting...') : t('Post')}
          </button>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="p-10 text-center">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="mt-2 text-gray-500">{t('Loading...')}</p>
          </div>
        ) : (
          <form id="listing-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <label
                htmlFor="image-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:bg-gray-50"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={t('Selected produce preview')}
                    className="mb-2 h-32 w-full rounded-lg object-cover"
                  />
                ) : (
                  <i className="ph ph-image mb-2 text-4xl text-gray-400" aria-hidden="true" />
                )}
                <span className="text-sm font-medium text-gray-600">
                  {preview ? t('Click to change photo') : t('Upload Produce Photo')}
                </span>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
              <div>
                <label htmlFor="cropName" className={label}>
                  {t('Crop Name')}
                </label>
                <input
                  id="cropName"
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  className={field}
                  placeholder={t('e.g., Wheat (HD-2967)')}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="quantity" className={label}>
                    {t('Quantity')}
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={field}
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="quantityUnit" className={label}>
                    {t('Unit')}
                  </label>
                  <select
                    id="quantityUnit"
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    className={`${field} bg-white`}
                    required
                  >
                    <option value="Quintal">{t('Quintal')}</option>
                    <option value="Kg">{t('Kg')}</option>
                    <option value="Ton">{t('Ton')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="price" className={label}>
                    {t('Price (₹)')}
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={field}
                    placeholder="2200"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="priceUnit" className={label}>
                    {t('Per')}
                  </label>
                  <select
                    id="priceUnit"
                    value={priceUnit}
                    onChange={(e) => setPriceUnit(e.target.value)}
                    className={`${field} bg-white`}
                    required
                  >
                    <option value="Quintal">{t('Quintal')}</option>
                    <option value="Kg">{t('Kg')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="location" className={label}>
                  {t('Pickup Location')}
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  readOnly
                  className={`${field} bg-gray-100`}
                  placeholder={t('Your location')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('This is set from your profile (District, State).')}
                </p>
              </div>
            </div>

            {submitting && (
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2.5 w-full rounded-full bg-gray-200"
              >
                <div
                  className="h-2.5 rounded-full bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </form>
        )}
      </main>

      <AlertModal alert={alert} onClose={closeAlert} />
    </MobileFrame>
  )
}

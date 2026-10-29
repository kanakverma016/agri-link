'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isProfileComplete, useAuth } from '@/components/providers/auth-provider'

const redirectUrl = () =>
  process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`

// Supabase answers a disabled provider with a raw JSON 400 page, so check its public settings first.
async function isGoogleEnabled() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    })
    if (!res.ok) return true
    const settings = await res.json()
    return settings?.external?.google !== false
  } catch {
    return true
  }
}

type Mode = 'login' | 'register' | 'complete-profile' | 'verify-sent'

const INPUT =
  'w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500'

const BG_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1932&q=80'

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-70"
    >
      {loading ? <div className="btn-spinner" role="status" aria-label="Loading" /> : children}
    </button>
  )
}

function IconInput({
  icon,
  ...props
}: { icon: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <i
        className={`ph ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400`}
        aria-hidden="true"
      />
      <input {...props} className={`${INPUT} pl-11`} />
    </div>
  )
}

type LocationFields = {
  phone: string
  land: string
  state: string
  district: string
  block: string
  village: string
}

const EMPTY_FIELDS: LocationFields = {
  phone: '',
  land: '',
  state: '',
  district: '',
  block: '',
  village: '',
}

function FarmFields({
  values,
  onChange,
  withPhone = true,
}: {
  values: LocationFields
  onChange: (key: keyof LocationFields, value: string) => void
  withPhone?: boolean
}) {
  const field = (
    key: keyof LocationFields,
    placeholder: string,
    type = 'text',
    autoComplete?: string,
  ) => (
    <input
      type={type}
      value={values[key]}
      onChange={(e) => onChange(key, e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      autoComplete={autoComplete}
      required
      min={type === 'number' ? 0 : undefined}
      step={type === 'number' ? 'any' : undefined}
      className={INPUT}
    />
  )
  return (
    <>
      {withPhone && field('phone', 'Phone Number', 'tel', 'tel')}
      {field('land', 'Land Holding (in acres)', 'number')}
      {field('state', 'State (e.g., Uttar Pradesh)')}
      {field('district', 'District (e.g., Meerut)')}
      {field('block', 'Block')}
      {field('village', 'Village')}
    </>
  )
}

export function LoginScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regFields, setRegFields] = useState<LocationFields>(EMPTY_FIELDS)

  const [googleName, setGoogleName] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [profileFields, setProfileFields] = useState<LocationFields>(EMPTY_FIELDS)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  // Signed-in users (e.g. returning from Google) either go home or finish their profile.
  useEffect(() => {
    if (authLoading || !user || mode === 'verify-sent') return
    if (isProfileComplete(profile)) {
      router.replace('/')
    } else if (profile) {
      setGoogleName(profile.name || user.displayName || '')
      setGoogleEmail(profile.email || user.email || '')
      setMode('complete-profile')
    }
  }, [authLoading, user, profile, mode, router])

  const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
    if (signInError) {
      setError(
        /not confirmed/i.test(signInError.message)
          ? 'Please verify your email before logging in. Check your inbox.'
          : 'Invalid email or password.',
      )
      setLoading(false)
      return
    }
    router.push('/')
  }

  async function handleGoogle() {
    setError('')
    const googleEnabled = await isGoogleEnabled()
    if (!googleEnabled) {
      setError('Google sign-in is not enabled yet. Please use email and password.')
      return
    }
    const { data, error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl(), skipBrowserRedirect: true },
    })
    if (oauthError || !data.url) {
      setError(messageOf(oauthError ?? new Error('Google sign-in is not available right now.')))
      return
    }
    // Google blocks framing, so inside the preview iframe the flow opens in a new tab.
    if (window.self !== window.top) window.open(data.url, '_blank')
    else window.location.assign(data.url)
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!user) {
      setError('You are not logged in.')
      setLoading(false)
      return
    }
    const { error: saveError } = await createClient()
      .from('profiles')
      .upsert({
        id: user.uid,
        name: googleName,
        email: googleEmail,
        phone: profileFields.phone,
        landHolding: parseFloat(profileFields.land),
        state: profileFields.state,
        district: profileFields.district,
        block: profileFields.block,
        village: profileFields.village,
        userType: 'Farmer',
        profilePicture: user.photoURL || null,
      })
    if (saveError) {
      setError(messageOf(saveError))
      setLoading(false)
      return
    }
    await refreshProfile()
    router.push('/')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signUpError } = await createClient().auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        emailRedirectTo: redirectUrl(),
        data: {
          name: regName,
          phone: regFields.phone,
          landHolding: regFields.land,
          state: regFields.state,
          district: regFields.district,
          block: regFields.block,
          village: regFields.village,
        },
      },
    })
    setLoading(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    // With email confirmation on there is no session yet; show the "check your email" step.
    if (!data.session) setMode('verify-sent')
  }

  return (
    <div className="relative min-h-dvh bg-gray-100">
      <div className="absolute inset-0 z-0 h-full w-full" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BG_IMAGE} alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-700">SmartKrishi</h1>
          <p className="text-lg text-gray-600">Your Digital Farming Partner</p>
        </div>

        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl sm:p-8">
          {mode === 'login' && (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Welcome Back</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <IconInput
                  icon="ph-envelope"
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                <IconInput
                  icon="ph-lock"
                  type="password"
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <SubmitButton loading={loading}>Login</SubmitButton>
              </form>
              <div className="my-4 flex items-center">
                <hr className="flex-grow border-gray-200" />
                <span className="mx-4 text-sm text-gray-500">OR</span>
                <hr className="flex-grow border-gray-200" />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white p-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.596,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
              <p className="mt-6 text-center text-sm text-gray-600">
                No account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-semibold text-green-600 hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Create Account</h2>
              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full Name"
                  aria-label="Full Name"
                  autoComplete="name"
                  required
                  className={INPUT}
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  required
                  className={INPUT}
                />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password (min. 6 characters)"
                  aria-label="Password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className={INPUT}
                />
                <FarmFields
                  values={regFields}
                  onChange={(k, v) => setRegFields((prev) => ({ ...prev, [k]: v }))}
                />
                <SubmitButton loading={loading}>Register</SubmitButton>
              </form>
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-green-600 hover:underline"
                >
                  Login here
                </button>
              </p>
            </div>
          )}

          {mode === 'complete-profile' && (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">
                Complete Your Profile
              </h2>
              <form onSubmit={handleCompleteProfile} className="space-y-3">
                <input
                  type="text"
                  value={googleName}
                  readOnly
                  aria-label="Name"
                  className="w-full rounded-lg border border-gray-300 bg-gray-200 p-3 text-gray-900"
                />
                <input
                  type="email"
                  value={googleEmail}
                  readOnly
                  aria-label="Email"
                  className="w-full rounded-lg border border-gray-300 bg-gray-200 p-3 text-gray-900"
                />
                <FarmFields
                  values={profileFields}
                  onChange={(k, v) => setProfileFields((prev) => ({ ...prev, [k]: v }))}
                />
                <SubmitButton loading={loading}>Save and Continue</SubmitButton>
              </form>
            </div>
          )}

          {mode === 'verify-sent' && (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Check Your Email!</h2>
              <div className="text-center">
                <i className="ph ph-paper-plane-right text-6xl text-green-600" aria-hidden="true" />
                <p className="mt-4 text-gray-600">
                  {"Registration successful! We've sent a verification link to "}
                  <strong className="text-gray-800">{regEmail}</strong>.
                </p>
                <p className="mt-2 text-gray-600">
                  Please click the link in that email to activate your account, then you can log in.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mt-6 w-full rounded-lg bg-green-600 p-3 font-semibold text-white transition-colors hover:bg-green-700"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 min-h-[1em] text-center text-red-600" role="alert">
            {error}
          </div>
        </div>
      </div>
    </div>
  )
}

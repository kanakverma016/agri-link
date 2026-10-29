import { FeedVideo } from '@/components/home/feed-video'

const PM_KISAN_VIDEO =
  'https://firebasestorage.googleapis.com/v0/b/smaart-krishi.firebasestorage.app/o/videoplayback.mp4?alt=media&token=ef28d05e-954a-441f-8bae-a909ef0c798b'
const KISAN_TORCH_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/smaart-krishi.firebasestorage.app/o/globeam-sultan-heavy-range-of-kisan-torch-500x500.webp?alt=media&token=229c82fb-9702-45a6-8967-992d2f4e82d0'

function AdHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center p-4">
      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white">
        AD
      </div>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">Sponsored</p>
      </div>
    </div>
  )
}

export function PmKisanAd() {
  return (
    <article className="mb-4 overflow-hidden rounded-lg bg-white shadow-sm">
      <AdHeader title="PM-KISAN Scheme" />
      <FeedVideo src={PM_KISAN_VIDEO} />
      <div className="p-4">
        <p className="font-semibold text-gray-700">{"Empowering India's Farmers!"}</p>
      </div>
    </article>
  )
}

export function KisanTorchAd() {
  return (
    <article className="mb-4 overflow-hidden rounded-lg bg-white shadow-sm">
      <AdHeader title="Globeam Sultan Kisan Torch" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={KISAN_TORCH_IMAGE}
        alt="Kisan Torch Ad"
        className="h-auto max-h-96 w-full object-cover"
      />
      <div className="p-4">
        <p className="font-semibold text-gray-700">Heavy-duty torch for all your farm needs.</p>
      </div>
    </article>
  )
}

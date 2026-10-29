import Link from 'next/link'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'

type Policy = {
  icon: string
  title: string
  description: string
  features?: string[]
  href?: string
  cta: string
  border: string
  text: string
  button: string
}

const POLICIES: Policy[] = [
  {
    icon: 'ph-plant',
    title: 'फसल बीमा',
    description:
      'प्राकृतिक आपदाओं, कीटों या बीमारियों से फसल के नुकसान से बचाने के लिए यह सरकार की प्राथमिक योजना है।',
    features: [
      'गैर-रोकथाम योग्य जोखिमों से उपज हानि को कवर करता है।',
      'इसमें कटाई के बाद के नुकसान की सुरक्षा शामिल है।',
      'मौसम आधारित और उपज आधारित विकल्प।',
    ],
    href: 'https://pmfby.gov.in/',
    cta: 'PMFBY पोर्टल पर आवेदन करें',
    border: 'border-green-600',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  {
    icon: 'ph-cow',
    title: 'पशुधन बीमा',
    description:
      'बीमारियों या दुर्घटनाओं के कारण पशुधन (गाय, भैंस, बकरी, आदि) की मृत्यु के खिलाफ सुरक्षा प्रदान करता है।',
    href: 'https://nilm.gov.in/',
    cta: 'NILM पोर्टल पर जानें',
    border: 'border-blue-600',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    icon: 'ph-cardholder',
    title: 'किसान क्रेडिट कार्ड (KCC)',
    description:
      'आसान ऋण प्रदान करता है और इसमें KCC धारकों के लिए व्यक्तिगत दुर्घटना और संपत्ति बीमा कवरेज शामिल है।',
    href: 'https://www.jansamarth.in/agri-loan',
    cta: 'जन समर्थ पोर्टल पर आवेदन करें',
    border: 'border-yellow-600',
    text: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  {
    icon: 'ph-tractor',
    title: 'ट्रैक्टर और उपकरण',
    description:
      'आपकी मूल्यवान मशीनरी को चोरी, आग और क्षति से बचाता है। यह आमतौर पर निजी और सार्वजनिक बीमाकर्ताओं द्वारा पेश किया जाता है।',
    cta: 'स्थानीय बीमाकर्ताओं से संपर्क करें',
    border: 'border-gray-600',
    text: 'text-gray-600',
    button: 'bg-gray-400',
  },
]

export function InsuranceScreen() {
  return (
    <MobileFrame>
      <nav className="z-20 w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </Link>
          <h1 lang="hi" className="flex-grow text-center text-xl font-bold text-green-700">
            बीमा
          </h1>
          <div className="w-8" />
        </div>
      </nav>

      <div lang="hi" className="flex-grow space-y-5 overflow-y-auto p-4 pb-20">
        <header className="mb-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">अपनी आजीविका सुरक्षित करें</h2>
          <p className="text-sm text-gray-600">
            अपने खेत, परिवार और भविष्य की रक्षा के लिए आधिकारिक योजनाओं को जानें।
          </p>
        </header>

        {POLICIES.map((p) => (
          <section
            key={p.title}
            className={`overflow-hidden rounded-lg border-l-4 bg-white p-4 shadow-sm ${p.border}`}
          >
            <div className="mb-3 flex items-center">
              <i className={`ph ${p.icon} mr-3 text-3xl ${p.text}`} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-800">{p.title}</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600">{p.description}</p>
            {p.features && (
              <div className="mb-4">
                <h4 className="mb-1 font-semibold text-gray-700">मुख्य विशेषताएं:</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {p.href ? (
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-center rounded-lg p-2 font-semibold text-white transition-colors ${p.button}`}
              >
                {p.cta}
                <i className="ph ph-arrow-square-out ml-2 text-lg" aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className={`flex w-full cursor-not-allowed items-center justify-center rounded-lg p-2 font-semibold text-white ${p.button}`}
              >
                {p.cta}
              </button>
            )}
          </section>
        ))}
      </div>

      <BottomNav active="home" />
    </MobileFrame>
  )
}

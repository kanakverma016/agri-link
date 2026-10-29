import Link from 'next/link'
import { MobileFrame } from '@/components/mobile-frame'
import { BottomNav } from '@/components/bottom-nav'

const SCHEMES = [
  {
    icon: 'ph-currency-inr',
    category: 'वित्तीय सहायता',
    name: 'PM-KISAN सम्मान निधि',
    description: 'सभी पात्र किसान परिवारों को ₹6,000 प्रति वर्ष की सीधी आय सहायता।',
    href: 'https://pmkisan.gov.in/',
    cta: 'अपना स्टेटस चेक करें',
    border: 'border-green-600',
    text: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  {
    icon: 'ph-plant',
    category: 'फसल सुरक्षा',
    name: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    description: 'फसल खराब होने की स्थिति में किसानों को व्यापक बीमा कवरेज और वित्तीय सहायता।',
    href: 'https://pmfby.gov.in/',
    cta: 'पोर्टल पर आवेदन करें',
    border: 'border-blue-600',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    icon: 'ph-tractor',
    category: 'उपकरण और सब्सिडी',
    name: 'कृषि यंत्रीकरण (SMAM)',
    description: 'ट्रैक्टर, ड्रोन और अन्य कृषि मशीनरी खरीदने के लिए सब्सिडी और वित्तीय सहायता।',
    href: 'https://agrimachinery.nic.in/',
    cta: 'आधिकारिक पोर्टल पर जाएं',
    border: 'border-yellow-600',
    text: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  {
    icon: 'ph-user-check',
    category: 'किसान कल्याण व पेंशन',
    name: 'किसान मानधन योजना',
    description: '60 वर्ष की आयु प्राप्त करने पर छोटे और सीमांत किसानों को ₹3,000 की न्यूनतम मासिक पेंशन।',
    href: 'https://maandhan.in/',
    cta: 'अभी रजिस्टर करें',
    border: 'border-purple-600',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
]

export function GovSchemeScreen() {
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
            सरकारी योजनाएं
          </h1>
          <div className="w-8" />
        </div>
      </nav>

      <div lang="hi" className="flex-grow space-y-5 overflow-y-auto p-4 pb-20">
        <header className="mb-2 text-center">
          <h2 className="text-xl font-semibold text-gray-800">किसान कल्याण डैशबोर्ड</h2>
          <p className="text-sm text-gray-600">
            किसानों के लिए सबसे महत्वपूर्ण सरकारी योजनाओं की जानकारी।
          </p>
        </header>

        {SCHEMES.map((s) => (
          <section
            key={s.name}
            className={`overflow-hidden rounded-lg border-l-4 bg-white p-4 shadow-sm ${s.border}`}
          >
            <div className="mb-3 flex items-center">
              <i className={`ph ${s.icon} mr-3 text-3xl ${s.text}`} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-800">{s.category}</h3>
            </div>
            <h4 className="mb-1 font-semibold text-gray-700">{s.name}</h4>
            <p className="mb-4 text-sm text-gray-600">{s.description}</p>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center rounded-lg p-2 font-semibold text-white transition-colors ${s.button}`}
            >
              {s.cta}
              <i className="ph ph-arrow-square-out ml-2 text-lg" aria-hidden="true" />
            </a>
          </section>
        ))}
      </div>

      <BottomNav active="home" />
    </MobileFrame>
  )
}

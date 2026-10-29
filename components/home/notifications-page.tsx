export function NotificationsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-50">
      <nav className="w-full flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button type="button" onClick={onBack} aria-label="Back" className="mr-4 text-gray-600">
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-bold" style={{ color: '#0c4b33' }}>
            Notifications
          </h2>
        </div>
      </nav>
      <main className="flex flex-grow flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-6 h-24 w-24">
          <svg
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
            style={{ color: '#0c4b33' }}
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M800 448c0-141.152-114.848-256-256-256S288 306.848 288 448v192H192v64h160v32c0 70.688 57.312 128 128 128s128-57.312 128-128v-32h160v-64H800V448z m-256 320a64.096 64.096 0 0 1-64-64v-32h128v32a64.096 64.096 0 0 1-64 64z m192-128H288V448c0-105.888 86.112-192 192-192s192 86.112 192 192v192z"
            />
          </svg>
          <div className="absolute right-5 top-1 h-6 w-6 rounded-full border-4 border-gray-50 bg-yellow-500" />
        </div>
        <h3 className="mb-2 text-2xl font-bold" style={{ color: '#0c4b33' }}>
          No Notifications
        </h3>
        <p className="text-gray-500">
          Please sit back and relax! We will notify you once we have something for you.
        </p>
      </main>
    </div>
  )
}

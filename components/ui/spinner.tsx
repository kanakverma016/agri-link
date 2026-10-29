export function Spinner({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${className} animate-spin rounded-full border-4 border-green-200 border-t-green-600`}
    />
  )
}

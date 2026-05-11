import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-center">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">403</h1>
        <p className="text-gray-400 mb-6">You don&apos;t have permission to access this page.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">Go to dashboard</Link>
      </div>
    </div>
  )
}

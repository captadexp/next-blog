import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Next-Blog Test App</h1>
      <p className="mb-8 text-lg text-center max-w-2xl">
        This is a test app for integrating the Next-Blog package. 
        Navigate to the dashboard to manage your blog content.
      </p>
      <div className="flex space-x-4">
        <Link 
          href="/api/next-blog/dashboard" 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Go to Blog Dashboard
        </Link>
      </div>
    </main>
  )
}
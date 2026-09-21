import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page">
      <section className="page-head">
        <p className="eyebrow">404</p>
        <h1 className="h1">Nothing <em>here</em></h1>
        <p className="lede">That page doesn’t exist. Let’s get you back to the invitation.</p>
        <Link href="/" className="btn btn-primary">Back to the invitation</Link>
      </section>
    </main>
  )
}

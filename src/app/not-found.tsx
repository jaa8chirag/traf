import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-8xl text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The link may be broken or the page may have moved.</p>
      <div className="mt-6">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </section>
  );
}

import { ButtonLink } from "@/components/ui";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="font-display text-5xl font-semibold tracking-tight">Source directly from verified suppliers</h1>
      <p className="mt-4 text-lg text-muted">
        Browse manufacturers, send inquiries, post sourcing requests and pay with protected escrow.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/register" size="lg">
          Start sourcing
        </ButtonLink>
        <ButtonLink href="/register?as=supplier" variant="secondary" size="lg">
          Become a supplier
        </ButtonLink>
      </div>
    </section>
  );
}

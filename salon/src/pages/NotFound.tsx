import { LinkButton } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl text-rose-light">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">We couldn't find that page</h1>
      <p className="mt-2 text-sm text-ink-soft">
        It may have moved — try heading back home, or ask Lumi in the chat bubble for a hand.
      </p>
      <LinkButton to="/" className="mt-6">
        Back to Home
      </LinkButton>
    </div>
  );
}

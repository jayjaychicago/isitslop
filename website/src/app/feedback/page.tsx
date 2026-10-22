import type { Metadata } from "next";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = { title: "Feedback · Is it slop?", description: "Tell the maintainers what is wrong, what is missing, or what is right." };

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="display text-5xl">Feedback</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        A bug, a grade that looks wrong, a rule you would change, a kind word. It goes straight to{" "}
        <a className="underline" href="mailto:support@isitslop.org">support@isitslop.org</a> and nothing is stored. For a wrong grade on your own entry, the appeal on its page is public and faster.
      </p>
      <FeedbackForm />
    </div>
  );
}

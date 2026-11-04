import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Support · Is it slop?", description: "Write to the people who run isitslop.org." };

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="display text-5xl">Support</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Press, partnerships, a takedown, a question about your data, a security report, or anything else that needs a reply from a person. We answer by email to the address you give, and nothing is stored on the site. A bug or a rule you would change is quicker through the{" "}
        <Link href="/feedback" className="underline">feedback form</Link>; a wrong grade on your own entry, through the public appeal on its page.
      </p>
      <ContactForm />
    </div>
  );
}

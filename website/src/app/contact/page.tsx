import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact · Is it slop?", description: "Write to the people who run isitslop.org." };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="display text-5xl">Contact us</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Press, partnerships, a takedown, a question about your data, or anything else that needs a reply from a person. It goes to{" "}
        <a className="underline" href="mailto:support@isitslop.org">support@isitslop.org</a> and nothing is stored. A bug or a rule you would change is quicker through the{" "}
        <Link href="/feedback" className="underline">feedback form</Link>; a wrong grade on your own entry, through the public appeal on its page.
      </p>
      <ContactForm />
    </div>
  );
}

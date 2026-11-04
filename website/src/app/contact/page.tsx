import { permanentRedirect } from "next/navigation";

/** The form lives at /support; this keeps old links working. */
export default function ContactPage() {
  permanentRedirect("/support");
}

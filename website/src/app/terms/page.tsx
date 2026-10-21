export const metadata = { title: "Terms of Service · Is it slop?" };

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-legal">
      <h1 className="display text-5xl">Terms of Service</h1>
      <p className="text-muted">Version 2026-10-21. Effective October 21, 2026.</p>
      <p>
        isitslop.org and api.isitslop.org (the <strong>Service</strong>) are operated by <strong>API Blaze, LLC</strong>, a Michigan limited liability
        company (<strong>we</strong>, <strong>us</strong>). By using the Service you agree to these terms. If you do not agree, do not use it.
      </p>

      <h2>1. What the Service is</h2>
      <p>
        The Service is a public index of URLs and an automated, heuristic opinion about whether a thing has a clear product definition and whether its
        owner reports that people use it. Scores are produced by publicly published rules that run without human judgment and without any artificial
        intelligence model. A score is an <strong>opinion</strong>, not a statement of fact, and not a professional, financial, or business assessment.
      </p>

      <h2>2. The index</h2>
      <p>
        Anyone may add a publicly reachable URL to the index. Adding a URL does not grade it. The index records only the URL, the domain, a page title
        if one is fetched, and timestamps. If you want a URL removed from the index and you own it, verify ownership and ask; see section 9.
      </p>

      <h2>3. Grades are only produced on the owner's request</h2>
      <p>
        We only produce a grade for a URL when a person who has verified ownership of that domain or repository (the <strong>Owner</strong>) explicitly
        requests one and accepts these terms. Verification is done by DNS record, a well-known file, a file in the repository, or an email to a
        standard administrative address at the domain. You represent that you have the authority to verify and to request a grade on behalf of the
        domain or repository.
      </p>

      <h2>4. By requesting a grade, you accept the outcome</h2>
      <p>
        <strong>Read this section carefully.</strong> When you request a grade you agree to all of the following:
      </p>
      <ol>
        <li>You are asking us to run public rules against your URL and publish the result, whatever it is.</li>
        <li>The result may be unfavorable. It may call your work "slop". You accept that outcome in advance.</li>
        <li>The result will be published on the Service, be available through the public API, and may be redistributed by anyone.</li>
        <li>The rules may be crude, incomplete, or wrong. They are published so you can read them before you ask. You have read them, or chosen not to.</li>
        <li>Your <strong>sole and exclusive remedy</strong> for any disagreement with a grade is the public appeal process in section 6.</li>
        <li>
          To the fullest extent permitted by law, you <strong>waive and release</strong> any and all claims against us, our members, managers, officers,
          contributors and agents arising out of or relating to a grade, its publication, or its consequences, including claims for defamation,
          disparagement, trade libel, injurious falsehood, interference with business relations, negligence, and any claim for lost revenue, lost
          customers, or reputational harm.
        </li>
        <li>You <strong>covenant not to sue</strong> us over a grade you requested, and you agree to indemnify us for our reasonable attorneys' fees and costs if you do.</li>
      </ol>
      <p>If any of this is unacceptable to you, do not request a grade. Nobody is graded without asking.</p>

      <h2>5. Self-reported numbers</h2>
      <p>
        If you submit usage numbers for the People score, you represent that they are true and accurate to the best of your knowledge. They are
        published and labelled as self-reported. Submitting numbers you know to be false is a breach of these terms and may result in removal of the
        grade and the entry.
      </p>

      <h2>6. Appeals</h2>
      <p>
        An Owner may appeal a grade. Appeals are public. Appeals are resolved at our sole discretion, either by changing a rule for everyone and
        re-grading, or by explaining publicly why the rule stands. There are no private exceptions, and a decision on an appeal is final. Filing an
        appeal does not suspend publication of the grade.
      </p>

      <h2>7. No warranty</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF ACCURACY,
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT ANY SCORE IS CORRECT, COMPLETE, OR USEFUL.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
        ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATING TO THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR
        RELATING TO THE SERVICE SHALL NOT EXCEED TEN UNITED STATES DOLLARS (US$10). THE SERVICE IS FREE; THIS LIMIT REFLECTS THAT.
      </p>

      <h2>9. Removal</h2>
      <p>
        A verified Owner may ask us to remove their entry and its grades by filing an appeal that says so. We will remove it within a reasonable
        time. Removal does not undo redistribution by third parties that already occurred.
      </p>

      <h2>10. Acceptable use</h2>
      <p>You will not: attempt to verify ownership of something you do not control; submit false numbers; abuse the API beyond published rate limits; attempt to access data that is not yours; or use the Service to harass anyone.</p>

      <h2>11. Open source</h2>
      <p>
        The Service's code is published under the MIT License. These terms govern the hosted Service at isitslop.org only. Anyone running their own
        copy is responsible for their own terms.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may change these terms. The version in force is shown at the top of this page and returned by the API. Requesting a grade after a change
        constitutes acceptance of the new version.
      </p>

      <h2>13. Governing law and venue</h2>
      <p>
        These terms are governed by the laws of the State of Michigan, without regard to conflict-of-laws rules. Any dispute that is not barred by
        section 4 shall be brought exclusively in the state or federal courts located in Michigan, and you consent to their jurisdiction. To the
        extent permitted by law, you waive any right to a jury trial and to participate in a class action.
      </p>

      <h2>14. Contact</h2>
      <p>API Blaze, LLC. Open an issue at github.com/jayjaychicago/isitslop, or file a public appeal from the entry page.</p>
    </div>
  );
}

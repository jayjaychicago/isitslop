export const metadata = { title: "Terms of Service · Is it slop?" };

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-legal">
      <h1 className="display text-5xl">Terms of Service</h1>
      <p className="text-muted">Version 2026-10-22. Effective October 22, 2026.</p>
      <p>
        isitslop.org and api.isitslop.org (the <strong>Service</strong>) are operated by <strong>API Blaze, LLC</strong>, a Michigan limited liability
        company (<strong>we</strong>, <strong>us</strong>). By using the Service you agree to these terms. If you do not agree, do not use it.
      </p>

      <h2>1. What the Service is</h2>
      <p>
        The Service is a public index of websites and software repositories, and an automated opinion about each one on two axes. <strong>Quality</strong>: is
        this real, maintained work by more than one person over time, read from the GitHub repository. <strong>Popularity</strong>: do the people who
        find it use it, read from the owner&apos;s Google Analytics. The verdict is two words, one per axis. Scores are produced by publicly published rules
        that run without human judgment and without any artificial intelligence model. A score is an <strong>opinion</strong>, not a statement of fact,
        and not a professional, financial or business assessment.
      </p>

      <h2>2. The index</h2>
      <p>
        Anyone may add a publicly reachable URL to the index. Adding a URL does not grade it. The index records the URL, the domain, a title and
        timestamps. A verified owner may remove their entry at any time; see section 9.
      </p>

      <h2>3. Grades are only produced on the owner&apos;s request</h2>
      <p>
        We only produce a grade when a person who has verified ownership of the domain or repository (the <strong>Owner</strong>) explicitly requests
        one and accepts these terms. Websites are verified by DNS record, a well-known file, or an email to a standard administrative address at the
        domain. Repositories are verified by signing in with a GitHub account that has push access. You represent that you have the authority to
        verify and to request a grade on behalf of the domain or repository.
      </p>

      <h2>4. By requesting a grade, you accept the outcome</h2>
      <p><strong>Read this section carefully.</strong> When you request a grade you agree to all of the following:</p>
      <ol>
        <li>You are asking us to run public rules against data you have connected and publish the result, whatever it is.</li>
        <li>The result may be unfavorable. It may call your work slop and fringe. You accept that outcome in advance.</li>
        <li>The result will be published on the Service, be available through the public API, and may be redistributed by anyone.</li>
        <li>The rules may be crude, incomplete or wrong. They are published so you can read them before you ask. You have read them, or chosen not to.</li>
        <li>Your <strong>sole and exclusive remedy</strong> for any disagreement with a grade is the public appeal process in section 6.</li>
        <li>
          To the fullest extent permitted by law, you <strong>waive and release</strong> any and all claims against us, our members, managers, officers,
          contributors and agents arising out of or relating to a grade, its publication or its consequences, including claims for defamation,
          disparagement, trade libel, injurious falsehood, interference with business relations, negligence, and any claim for lost revenue, lost
          customers or reputational harm.
        </li>
        <li>You <strong>covenant not to sue</strong> us over a grade you requested, and you agree to indemnify us for our reasonable attorneys&apos; fees and costs if you do.</li>
      </ol>
      <p>If any of this is unacceptable to you, do not request a grade. Nobody is graded without asking.</p>

      <h2>5. Connected accounts</h2>
      <p>
        To be graded you connect a GitHub account and a Google Analytics property. By connecting them you authorise us to read from them, read-only,
        when you request a grade, and you represent that you are entitled to grant that access. We never write to them. From GitHub we read
        repository metadata, commit history, contributors and issue counts. From Google Analytics we read aggregate active-user counts for the
        last 30 days and the list of properties your account can see, so you can pick one. Credentials are stored encrypted and deleted when you
        disconnect or remove the entry. Feeding the Service fabricated repository activity or analytics data is a breach of these terms and may
        result in removal of the grade and the entry.
      </p>

      <h2>6. Appeals</h2>
      <p>
        An Owner may appeal a grade. Appeals are public. Appeals are resolved at our sole discretion, either by changing a rule for everyone and
        re-grading, or by explaining publicly why the rule stands. There are no private exceptions, and a decision on an appeal is final. Filing an
        appeal does not suspend publication of the grade.
      </p>

      <h2>7. No warranty</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF ACCURACY,
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT ANY SCORE IS CORRECT, COMPLETE OR USEFUL.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY
        LOSS OF PROFITS, REVENUE, DATA OR GOODWILL, ARISING OUT OF OR RELATING TO THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR
        RELATING TO THE SERVICE SHALL NOT EXCEED TEN UNITED STATES DOLLARS (US$10). THE SERVICE IS FREE; THIS LIMIT REFLECTS THAT.
      </p>

      <h2>9. Removal</h2>
      <p>
        A verified Owner may remove their entry, its grades, its appeals and all connected credentials at any time through the API, or by filing an
        appeal that says so. Removal does not undo redistribution by third parties that already occurred.
      </p>

      <h2>10. Acceptable use</h2>
      <p>You will not: attempt to verify ownership of something you do not control; connect accounts you are not entitled to connect; abuse the API beyond published rate limits; attempt to access data that is not yours; or use the Service to harass anyone.</p>

      <h2>11. Open source</h2>
      <p>
        The Service&apos;s code is published under the MIT License. These terms govern the hosted Service at isitslop.org only. Anyone running their own copy
        is responsible for their own terms and their own Google and GitHub app registrations.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may change these terms. The version in force is shown at the top of this page and returned by the API. Requesting a grade after a change
        constitutes acceptance of the new version.
      </p>

      <h2>13. Governing law and venue</h2>
      <p>
        These terms are governed by the laws of the State of Michigan, without regard to conflict-of-laws rules. Any dispute that is not barred by section
        4 shall be brought exclusively in the state or federal courts located in Michigan, and you consent to their jurisdiction. To the extent permitted
        by law, you waive any right to a jury trial and to participate in a class action.
      </p>

      <h2>14. Contact</h2>
      <p>API Blaze, LLC. Open an issue at github.com/jayjaychicago/isitslop, or file a public appeal from the entry page.</p>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Synchronize initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in overflow-y-auto"
      >
      <div
        className="w-full max-w-4xl bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 bg-neutral-950/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </div>
            <div>
              <h2
                id="legal-modal-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span>Legal &amp; Privacy Compliance</span>
                <span className="hidden xs:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Enforced
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">
                Transparent data isolation and terms of service for Envello
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Quick Meta Strip */}
        <div className="px-4 sm:px-6 py-3 bg-neutral-950/40 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10 self-start sm:self-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[40px] sm:min-h-0 ${
                activeTab === 'privacy'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[40px] sm:min-h-0 ${
                activeTab === 'terms'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Effective Date & Status */}
          <div className="flex items-center space-x-3 text-[11px] text-neutral-400 self-end sm:self-auto">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>Last Updated: October 2026</span>
            </span>
            <span className="text-neutral-600">&bull;</span>
            <span className="text-emerald-400 font-medium">Version 1.0 (Final)</span>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-8 text-neutral-300 text-sm leading-relaxed scrollbar-thin">
          {activeTab === 'privacy' ? (
            /* =========================================================================
               PRIVACY POLICY
               ========================================================================= */
            <div className="space-y-6">
              {/* Executive Summary Callout */}
              <div className="p-4 sm:p-5 rounded-2xl bg-sky-950/30 border border-sky-500/20 space-y-2">
                <div className="flex items-center space-x-2 text-sky-300 font-semibold text-sm">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>The Envello Privacy Pledge</span>
                </div>
                <p className="text-xs text-sky-200/80 leading-relaxed">
                  Financial data is deeply sensitive personal information. Envello is engineered on the principle of
                  <strong> zero data exploitation</strong>: We do not sell your personal financial records, we do not monetize
                  aggregated data, and we do not display third-party advertisements or trackers. All calculations run strictly
                  to serve your personal budgeting ledger.
                </p>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">1.</span> Information We Collect
                </h3>
                <p>
                  To provide deterministic double-entry envelope budgeting, Envello stores only the records you explicitly
                  input or authorize:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-300">
                  <li>
                    <strong className="text-white">Authentication &amp; Profile Identifiers:</strong> Your email address, encrypted
                    password hash (or OAuth provider token ID), and optional chosen display name.
                  </li>
                  <li>
                    <strong className="text-white">Financial Ledger Entries:</strong> Bank and cash account designations, envelope names,
                    custom spending categories, planned monthly allocation amounts, recorded expense/income transactions, notes, and dates.
                  </li>
                  <li>
                    <strong className="text-white">Credit &amp; Debt Metadata:</strong> Card issuer names, billing due dates, statement limits,
                    credit balances, loan installment amounts, and fixed deposit maturity dates.
                  </li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">2.</span> What We NEVER Collect or Request
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
                    <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      <span>No Bank Login Credentials</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      We never ask for your net banking passwords, PINs, OTPs, or debit/credit card CVVs.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
                    <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      <span>No Background SMS Scraping</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Envello does not silently read incoming SMS messages or transaction alerts from your device.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
                    <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      <span>No Advertising Trackers</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Zero tracking pixels from social media platforms or ad brokers. No marketing cookies.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1">
                    <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      <span>No Credit Bureau Sharing</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Your debt and credit card balances are never shared with credit rating agencies.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">3.</span> Cryptographic Data Isolation &amp; Security Architecture
                </h3>
                <p>
                  Envello enforces state-of-the-art security practices to ensure complete tenant isolation:
                </p>
                <div className="space-y-2.5 pt-1 text-xs sm:text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">PostgreSQL Row Level Security (RLS):</strong> Every database table enforces strict
                      row-level policies matching <code className="font-mono text-sky-300">auth.uid() = user_id</code> directly at the database engine level.
                      No client request can ever query or modify records belonging to another user.
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">End-to-End Encryption in Transit &amp; at Rest:</strong> All traffic between your browser
                      and our servers is encrypted using modern TLS 1.3. Database volumes are encrypted at rest with AES-256.
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Zero Binary Floating-Point Errors:</strong> All monetary values are stored in integer paise
                      or fixed precision to preserve absolute accounting mathematical truth.
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">4.</span> Trusted Third-Party Infrastructure Sub-Processors
                </h3>
                <p>
                  Envello relies solely on industry-leading, enterprise-grade cloud providers for hosting and message dispatch:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-white/10 rounded-xl overflow-hidden">
                    <thead className="bg-neutral-950 text-neutral-300 font-semibold">
                      <tr>
                        <th className="p-2.5 border-b border-white/10">Provider</th>
                        <th className="p-2.5 border-b border-white/10">Purpose</th>
                        <th className="p-2.5 border-b border-white/10">Data Held</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-neutral-900/60">
                      <tr>
                        <td className="p-2.5 font-medium text-white">Supabase Inc.</td>
                        <td className="p-2.5 text-neutral-400">Database &amp; Auth Service</td>
                        <td className="p-2.5 text-neutral-300">Encrypted financial records &amp; auth credentials (RLS guarded)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-white">Resend Inc.</td>
                        <td className="p-2.5 text-neutral-400">Custom Transactional SMTP</td>
                        <td className="p-2.5 text-neutral-300">Email address &amp; OTP verification tokens (temporary dispatch)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-white">Vercel Inc.</td>
                        <td className="p-2.5 text-neutral-400">Frontend Static CDN</td>
                        <td className="p-2.5 text-neutral-300">Serves compiled HTML/JS/CSS assets (Zero client data stored)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-white">Google LLC</td>
                        <td className="p-2.5 text-neutral-400">OAuth Authentication</td>
                        <td className="p-2.5 text-neutral-300">Single Sign-On profile verification (Email &amp; verified ID)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">5.</span> Your Rights, Data Export &amp; Permanent Erasure
                </h3>
                <p>
                  You retain total sovereignty over your financial records under global data protection principles:
                </p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <p>
                    &bull; <strong className="text-white">Right to Portability (Export):</strong> You can download a complete export of all accounts,
                    envelopes, transactions, credit cards, and debts in structured CSV or JSON format at any time using the in-app Export tool.
                  </p>
                  <p>
                    &bull; <strong className="text-white">Right to Erasure (Account Deletion):</strong> You may request permanent deletion of your
                    account directly from your profile dropdown. Deletion initiates a 30-day grace period during which you can cancel if desired,
                    after which all accounts, transactions, balances, and login records are irrevocably purged from the database.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section className="space-y-2 pt-2 border-t border-white/5">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">6.</span> Contact &amp; Inquiries
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400">
                  If you have any questions regarding this Privacy Policy or your personal data handling, you may review your
                  account settings or reach out through our official GitHub repository inquiries.
                </p>
              </section>
            </div>
          ) : (
            /* =========================================================================
               TERMS OF SERVICE
               ========================================================================= */
            <div className="space-y-6">
              {/* Financial Disclaimer Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/20 space-y-2">
                <div className="flex items-center space-x-2 text-amber-300 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Important Financial Disclaimer</span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Envello is a software utility designed for personal budgeting, mathematical reconciliation, and envelope allocation.
                  <strong> Envello is NOT a registered investment advisor, broker-dealer, financial planner, or tax consultant.</strong>
                  Nothing provided in this application constitutes legal, tax, investment, or banking advice.
                </p>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">1.</span> Acceptance of Terms
                </h3>
                <p>
                  By creating an account, signing in via Google or email magic link, or otherwise accessing Envello, you agree to be bound
                  by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must discontinue using the application.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">2.</span> Purpose &amp; Scope of the Application
                </h3>
                <p>
                  Envello provides an envelope-budgeting interface to help individuals plan and track their personal finances.
                  Features include:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-neutral-300">
                  <li>Deterministic balance calculations categorized across six financial pillars.</li>
                  <li>Virtual envelope allocation and monthly rollover tracking.</li>
                  <li>Credit card liability tracking and automated 30% utilization guidelines.</li>
                  <li>Amortized debt repayment planning and fixed deposit maturity records.</li>
                  <li>Automated double-entry reconciliation between bank accounts and envelopes.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">3.</span> User Account Responsibility &amp; Security
                </h3>
                <p>
                  You are solely responsible for maintaining the confidentiality of your authentication credentials (including email inbox access
                  and passwords). You agree to notify us immediately if you discover any unauthorized access to your account.
                </p>
                <p className="text-xs text-neutral-400">
                  You are responsible for ensuring the accuracy of all transaction amounts, dates, and balances entered into the system.
                  Envello computes balances deterministically based strictly on the records you supply.
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">4.</span> Operational Model &amp; Service Availability
                </h3>
                <p>
                  Envello is engineered to operate efficiently within zero-cost cloud tiers (e.g., Supabase Free tier, Vercel Hobby).
                  While we maintain rigorous database integrity constraints, automated backups, and row-level security:
                </p>
                <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 text-xs text-neutral-300 leading-relaxed">
                  The service is provided on an <strong>&ldquo;AS IS&rdquo;</strong> and <strong>&ldquo;AS AVAILABLE&rdquo;</strong> basis
                  without warranties of any kind, whether express or implied, including but not limited to uptime guarantees, uninterrupted operation,
                  or complete fitness for a specific accounting purpose.
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">5.</span> Limitation of Liability
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed">
                  In no event shall Envello, its developers, or its contributors be liable for any indirect, incidental, special, consequential,
                  or punitive damages, including without limitation loss of profits, financial miscalculations resulting from erroneous user input,
                  missed credit card due dates, or overdraft fees incurred with third-party banking institutions.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">6.</span> Intellectual Property &amp; User Ownership
                </h3>
                <p>
                  <strong className="text-white">Your Data is Yours:</strong> You own all financial entries, transaction records, and notes
                  you enter into Envello. You may export them or request their complete deletion at any time.
                </p>
                <p className="text-xs text-neutral-400">
                  The Envello name, logo, custom financial UI components, and software code are the intellectual property of the project
                  maintainers, governed under appropriate open-source or software licensing.
                </p>
              </section>

              {/* Section 7 */}
              <section className="space-y-2 pt-2 border-t border-white/5">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-sky-400">7.</span> Changes to Terms
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400">
                  We reserve the right to modify these terms as the application scales. Continued use of the service following published updates
                  constitutes acceptance of the revised Terms of Service.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-neutral-950/80 border-t border-white/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-neutral-500 text-center sm:text-left">
            Envello &bull; Deterministic Envelope Budgeting
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-semibold transition active:scale-95 min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
);
};

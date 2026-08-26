import React, { useState, useEffect } from 'react';
import {
  Shield,
  ArrowLeft,
  Lock,
  Database,
  Mail,
  UserCheck,
  FileText,
  Trash2,
  Cookie,
  Globe,
  ExternalLink,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  const [lang, setLang] = useState<'uz' | 'en'>('en');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Privacy Policy — OBOX (OnBozar)';
  }, []);

  const handleGoHome = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#D84315] selection:text-white">
      {/* ── Top Sticky Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors text-xs font-bold"
              aria-label="Back to Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Bosh sahifaga qaytish</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <a
              href="/"
              className="flex items-center gap-2.5 group"
              title="OBOX (OnBozar) Homepage"
            >
              <img
                src="/logo.png"
                alt="OBOX OnBozar Logo"
                className="w-8 h-8 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                  OBOX <span className="text-[#D84315]">(OnBozar)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold leading-tight">
                  Marketplace Platform
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('uz')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  lang === 'uz'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                O'zbekcha
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              title="Print Privacy Policy"
              className="hidden sm:flex items-center gap-1.5 p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex items-center gap-3 text-[#D84315] font-black text-xs uppercase tracking-widest mb-3">
            <Shield className="w-5 h-5" />
            <span>Legal & Data Protection</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-4">
            {lang === 'en' ? 'Privacy Policy' : 'Maxfiylik Siyosati'}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mb-6 font-medium">
            {lang === 'en'
              ? 'This Privacy Policy explains how OBOX (OnBozar), operating at onbozar.uz, collects, uses, stores, and protects your information when you access our marketplace platform and services.'
              : 'Ushbu Maxfiylik Siyosati OBOX (OnBozar) platformasi (onbozar.uz) sizning shaxsiy ma\'lumotlaringizni qanday to\'plashi, ishlatishi, saqlashi va himoya qilishini tushuntiradi.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                {lang === 'en' ? 'Last Updated: August 26, 2026' : 'Oxirgi yangilanish: 26-avgust, 2026'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>
                {lang === 'en' ? 'Official Domain:' : 'Rasmiy domen:'}{' '}
                <a href="https://onbozar.uz" className="text-[#D84315] font-bold underline">
                  https://onbozar.uz
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* ── Content Sections ── */}
        <div className="space-y-6">
          {lang === 'en' ? (
            <>
              {/* Section 1: Introduction */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#D84315]" />
                  1. Introduction & General Information
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    Welcome to <strong>OBOX (OnBozar)</strong> ("we", "our", "us", or "Platform"), available at{' '}
                    <a href="https://onbozar.uz" className="text-[#D84315] font-bold hover:underline">
                      https://onbozar.uz
                    </a>
                    . OBOX is a modern digital marketplace connecting agricultural producers, suppliers, business stores, and buyers across Uzbekistan.
                  </p>
                  <p>
                    We are deeply committed to protecting the privacy, confidentiality, and security of all personal data provided to us by users ("you" or "User"). By accessing or using our website, web application, API, or services, you agree to the collection and use of information in accordance with this Privacy Policy.
                  </p>
                </div>
              </section>

              {/* Section 2: Personal Information We Collect */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-[#D84315]" />
                  2. Information We Collect
                </h2>
                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <p>We collect information that is strictly necessary to provide and enhance our marketplace services:</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <h3 className="font-bold text-slate-900 mb-1.5">A. Information You Provide Directly</h3>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        <li>Full name or business contact name</li>
                        <li>Email address</li>
                        <li>Phone number</li>
                        <li>Store name and business profile details</li>
                        <li>Delivery address, region, and district</li>
                        <li>Product listings, photos, videos, and descriptions</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <h3 className="font-bold text-slate-900 mb-1.5">B. Information Collected Automatically</h3>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        <li>IP address and general geographic location</li>
                        <li>Browser type, device model, and operating system</li>
                        <li>Access times, referring URLs, and viewed pages</li>
                        <li>Essential local storage tokens and cookies for authentication</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Google OAuth & Google User Data Policy (CRUCIAL FOR VERIFICATION) */}
              <section className="bg-white rounded-3xl border-2 border-[#D84315]/30 p-6 sm:p-8 shadow-xs bg-gradient-to-b from-orange-50/20 to-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D84315]/10 text-[#D84315] text-xs font-black mb-3">
                  <Lock className="w-3.5 h-3.5" />
                  Google OAuth 2.0 Integration & Compliance
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-4">
                  3. Google OAuth & Google User Data Policy
                </h2>

                <div className="space-y-4 text-sm text-slate-800 leading-relaxed">
                  <p>
                    OBOX provides an optional one-click sign-in mechanism via <strong>Google OAuth 2.0</strong> to deliver a seamless, secure authentication experience.
                  </p>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      What Google Shares with OBOX (OnBozar):
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      When you choose to register or log in using Google OAuth, Google asks for your consent to share limited, basic account information with OBOX:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 font-medium">
                      <li><strong>Your Full Name:</strong> Used to display your name on your marketplace profile and seller listings.</li>
                      <li><strong>Your Verified Email Address:</strong> Used as your unique account identifier and to send essential transactional notifications.</li>
                      <li><strong>Your Profile Picture URL:</strong> Used optionally as your default account avatar.</li>
                    </ul>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <h3 className="font-black text-amber-950 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Google API Services User Data Policy — Limited Use Disclosure
                    </h3>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      OBOX's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                      <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline text-amber-950 inline-flex items-center gap-0.5"
                      >
                        Google API Services User Data Policy
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      , including the Limited Use requirements.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-900">
                      <li>We request only the minimum required identity scopes: <code>openid</code>, <code>profile</code>, and <code>email</code>.</li>
                      <li>We do NOT request access to Google Drive, Gmail, Google Calendar, Google Contacts, or any sensitive/restricted scopes.</li>
                      <li>We NEVER sell, trade, or transfer Google user data to third-party advertising platforms, data brokers, or information resellers.</li>
                      <li>Google user data is used solely to provide user-facing marketplace authentication and profile functionality.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4: How We Use Your Information */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-[#D84315]" />
                  4. How We Use Your Information
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>OBOX processes personal data strictly for legitimate operational purposes:</p>
                  <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-700">
                    <li><strong>Account Management:</strong> Creating, maintaining, and securing your buyer or seller account.</li>
                    <li><strong>Marketplace Transactions:</strong> Enabling communication between buyers and sellers, managing orders, and facilitating B2B wholesale agreements.</li>
                    <li><strong>Platform Security:</strong> Preventing unauthorized access, fraudulent activity, spam, and abuse.</li>
                    <li><strong>Service Notifications:</strong> Sending essential transactional emails (e.g. order status updates, security alerts).</li>
                    <li><strong>Customer Support:</strong> Responding to user inquiries, troubleshooting technical issues, and processing support tickets.</li>
                  </ul>
                </div>
              </section>

              {/* Section 5: Data Storage, Architecture & Security */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-[#D84315]" />
                  5. How User Data Is Stored & Protected (Supabase & Cloud Architecture)
                </h2>
                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <p>
                    We implement industry-standard administrative, physical, and technical safeguards to protect your personal data against unauthorized access, loss, alteration, or disclosure:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" />
                        Supabase Backend & PostgreSQL
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Authentication records, database profiles, and storage media are hosted using <strong>Supabase</strong> with enterprise-grade PostgreSQL. All data queries are protected by Row Level Security (RLS) policies ensuring users can only read and write their own authorized data.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        Encryption in Transit & At Rest
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS). Passwords are cryptographically hashed; we never store plain-text passwords.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6: Cookies & Local Storage */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Cookie className="w-5 h-5 text-[#D84315]" />
                  6. Cookies & Local Storage Sessions
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    OBOX uses essential cookies and browser <code>localStorage</code> solely to maintain your active authentication session, remember language preferences, and provide offline-first caching for fast page loads.
                  </p>
                  <p className="text-xs text-slate-600">
                    We do not use invasive third-party cross-site tracking cookies. You can manage or disable cookies through your browser settings, though logging in requires active session storage.
                  </p>
                </div>
              </section>

              {/* Section 7: Data Retention & User Deletion Rights */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Trash2 className="w-5 h-5 text-[#D84315]" />
                  7. Data Retention & Account Deletion
                </h2>
                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                  <p>
                    We retain your personal data only for as long as your account is active or as necessary to provide marketplace services, comply with legal obligations, and resolve disputes.
                  </p>

                  <div className="p-4 sm:p-5 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
                    <h3 className="font-bold text-red-950 text-xs uppercase tracking-wider">
                      How to Request Account & Data Deletion:
                    </h3>
                    <p className="text-xs text-red-900 leading-relaxed">
                      You have the right to delete your account and all associated personal data at any time:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-red-900 font-medium">
                      <li><strong>In-App:</strong> Log in, go to <em>Profile → Settings → Delete Account</em>.</li>
                      <li><strong>Via Email:</strong> Send a deletion request to{' '}
                        <a href="mailto:support@onbozar.uz" className="font-bold underline">
                          support@onbozar.uz
                        </a>{' '}
                        from your registered email address.
                      </li>
                    </ol>
                    <p className="text-[11px] text-red-800">
                      Upon deletion, your profile, listings, and authentication tokens are permanently purged from active databases within 30 days.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 8: User Rights */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-[#D84315]" />
                  8. Your Privacy Rights
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>Under applicable international privacy regulations (including GDPR principles), you have the right to:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-700">
                    <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate or incomplete profile data directly in your profile settings.</li>
                    <li><strong>Erasure:</strong> Request the total erasure of your personal data ("Right to be forgotten").</li>
                    <li><strong>Revoke Google Access:</strong> You can revoke OBOX's access to your Google account at any time via{' '}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#D84315] font-bold underline inline-flex items-center gap-0.5"
                      >
                        Google Security Settings
                        <ExternalLink className="w-3 h-3" />
                      </a>.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 9: Third-Party Service Providers */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-[#D84315]" />
                  9. Third-Party Service Providers
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>We work with trusted third-party cloud infrastructure providers under strict data protection terms:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                    <li><strong>Google LLC:</strong> Identity provider for Google OAuth authentication.</li>
                    <li><strong>Supabase Inc:</strong> Authentication gateway and PostgreSQL database hosting.</li>
                    <li><strong>Vercel Inc:</strong> Secure web application hosting and CDN infrastructure.</li>
                    <li><strong>Resend Inc:</strong> Transactional email service provider.</li>
                  </ul>
                </div>
              </section>

              {/* Section 10: Contact Information */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-[#D84315]" />
                  10. Contact Us About Privacy
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    If you have questions, concerns, or requests regarding this Privacy Policy or our data handling practices, please contact us:
                  </p>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs sm:text-sm text-slate-800">
                    <p><strong>Platform:</strong> OBOX (OnBozar Marketplace)</p>
                    <p><strong>Official Website:</strong> <a href="https://onbozar.uz" className="text-[#D84315] font-bold underline">https://onbozar.uz</a></p>
                    <p><strong>Privacy Email:</strong> <a href="mailto:support@onbozar.uz" className="text-[#D84315] font-bold underline">support@onbozar.uz</a></p>
                    <p><strong>Administrative Contact:</strong> <a href="mailto:admin@onbozar.uz" className="text-[#D84315] font-bold underline">admin@onbozar.uz</a></p>
                    <p><strong>Location:</strong> Tashkent, Republic of Uzbekistan</p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* O'zbekcha versiya */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#D84315]" />
                  1. Umumiy qoidalar va Kirish
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    <strong>OBOX (OnBozar)</strong> platformasiga ({' '}
                    <a href="https://onbozar.uz" className="text-[#D84315] font-bold hover:underline">
                      https://onbozar.uz
                    </a>
                    ) xush kelibsiz. OBOX — qishloq xo‘jaligi mahsulotlari ishlab chiqaruvchilari, do‘konlar va xaridorlarni birlashtiruvchi zamonaviy B2B va B2C marketplace platformasidir.
                  </p>
                  <p>
                    Biz foydalanuvchilarimizning shaxsiy ma'lumotlari maxfiyligini qat'iy himoya qilamiz. Platformadan foydalanish orqali siz ushbu Maxfiylik Siyosatida ko'rsatilgan qoidalarga rozilik bildirasiz.
                  </p>
                </div>
              </section>

              <section className="bg-white rounded-3xl border-2 border-[#D84315]/30 p-6 sm:p-8 shadow-xs bg-gradient-to-b from-orange-50/20 to-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D84315]/10 text-[#D84315] text-xs font-black mb-3">
                  <Lock className="w-3.5 h-3.5" />
                  Google OAuth 2.0 orqali kirish
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-4">
                  2. Google OAuth orqali kirish va ma'lumotlardan foydalanish
                </h2>

                <div className="space-y-4 text-sm text-slate-800 leading-relaxed">
                  <p>
                    OBOX foydalanuvchilarga qulaylik yaratish maqsadida Google hisobi orqali bitta tugma bilan ro'yxatdan o'tish va kirish imkoniyatini taqdim etadi.
                  </p>

                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Google tomonidan OBOX ga taqdim etiladigan ma'lumotlar:
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 font-medium">
                      <li><strong>Ism va Familiya:</strong> Profilingiz va e'lonlaringizda sotuvchi/xaridor nomini ko'rsatish uchun.</li>
                      <li><strong>Tasdiqlangan Email manzili:</strong> Akkauntni identifikatsiya qilish va xabarnomalar yuborish uchun.</li>
                      <li><strong>Profil rasmi:</strong> Profilingiz avatarini avtomatik sozlash uchun.</li>
                    </ul>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <h3 className="font-black text-amber-950 text-sm">
                      Google API Services User Data Policy talablariga rioya qilish
                    </h3>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      OBOX Google API orqali olingan barcha ma'lumotlarni faqatgina{' '}
                      <a
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline text-amber-950"
                      >
                        Google API Services User Data Policy
                      </a>{' '}
                      qoidalariga, xususan, Cheklangan Foydalanish (Limited Use) talablariga muvofiq ishlatadi. Biz Google ma'lumotlarini hech qachon uchinchi shaxslarga sotmaymiz yoki reklama brokerlariga bermaymiz.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-[#D84315]" />
                  3. Ma'lumotlarni saqlash va Xavfsizlik (Supabase)
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    Barcha shaxsiy ma'lumotlar, parollar va sessiyalar zamonaviy <strong>Supabase</strong> PostgreSQL bazasida Row Level Security (RLS) shifrlash qoidalari asosida saqlanadi. Ma'lumotlar uzatish TLS 1.3 / HTTPS protokollari bilan himoyalangan.
                  </p>
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Trash2 className="w-5 h-5 text-[#D84315]" />
                  4. Ma'lumotlarni o'chirish huquqi
                </h2>
                <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                  <p>
                    Foydalanuvchi istalgan vaqtda o'z profilini va unga bog'liq barcha ma'lumotlarni to'liq o'chirish huquqiga ega. Buni profilingizdagi <em>Sozlamalar → Akkauntni o'chirish</em> bo'limi orqali yoki{' '}
                    <a href="mailto:support@onbozar.uz" className="text-[#D84315] font-bold underline">
                      support@onbozar.uz
                    </a>{' '}
                    emailiga xat yozish orqali amalga oshirishingiz mumkin.
                  </p>
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4 flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-[#D84315]" />
                  5. Bog'lanish ma'lumotlari
                </h2>
                <div className="space-y-2 text-xs sm:text-sm text-slate-800 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p><strong>Loyiha:</strong> OBOX (OnBozar Marketplace)</p>
                  <p><strong>Veb-sayt:</strong> <a href="https://onbozar.uz" className="text-[#D84315] font-bold underline">https://onbozar.uz</a></p>
                  <p><strong>Elektron pochta:</strong> <a href="mailto:support@onbozar.uz" className="text-[#D84315] font-bold underline">support@onbozar.uz</a></p>
                  <p><strong>Manzil:</strong> Toshkent, O'zbekiston Respublikasi</p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="OBOX Logo" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-bold text-slate-700">© 2026 OBOX (OnBozar). Barcha huquqlar himoyalangan.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleGoHome}
              className="text-[#D84315] font-bold hover:underline"
            >
              Asosiy sahifa
            </button>
            <span>•</span>
            <a href="mailto:support@onbozar.uz" className="hover:text-slate-900">
              support@onbozar.uz
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
};

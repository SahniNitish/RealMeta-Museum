import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Login</span>
        </Link>

        <h1 className="font-display text-4xl text-foreground mb-2">Terms of Use</h1>
        <p className="text-muted-foreground mb-10">Last updated: May 15, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the MetaVisitAR platform ("Service") operated by RealMeta Inc. ("Company", "we", "us"),
              you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              MetaVisitAR is a software-as-a-service (SaaS) platform that enables museums and cultural institutions to create
              AI-powered interactive guides for their visitors. The Service includes artwork upload and AI analysis, multi-language
              audio descriptions, QR code generation, visitor analytics, and a mobile-accessible visitor interface.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">3. Museum Admin Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, you must register an administrator account and provide accurate information about yourself
              and your museum. You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">4. Content Ownership and License</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain full ownership of all content you upload to the Service, including artwork images, descriptions,
              and metadata. By uploading content, you grant RealMeta Inc. a non-exclusive, worldwide license to host, display,
              and process your content solely for the purpose of providing the Service. We will not use your content for any
              other purpose without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">5. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses artificial intelligence to analyze artwork images, generate descriptions, and create translations.
              AI-generated content is provided as a starting point and may contain inaccuracies. You are responsible for reviewing
              and editing all AI-generated content before publishing it to visitors. RealMeta Inc. is not liable for any errors
              in AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Upload content that infringes on intellectual property rights of others</li>
              <li>Upload illegal, harmful, or offensive content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Use the Service to distribute malware or conduct attacks</li>
              <li>Resell or sublicense access to the Service without authorization</li>
              <li>Interfere with or disrupt the Service or servers connected to it</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">7. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your content is stored securely using Amazon Web Services (AWS) infrastructure, including encrypted storage (S3)
              and managed databases (DocumentDB). We implement industry-standard security measures to protect your data.
              However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service
              may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We will make
              reasonable efforts to notify you of planned downtime in advance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, you may request an export of your data
              within 30 days. After 30 days, we reserve the right to delete your content from our systems. We may suspend or
              terminate your account immediately if you violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, RealMeta Inc. shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or business opportunities,
              arising from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario, Canada,
              without regard to conflict of law principles. Any disputes shall be resolved in the courts of Ontario, Canada.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify registered users of material changes
              via email. Your continued use of the Service after changes become effective constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at{' '}
              <a href="mailto:support@realmeta.ca" className="text-primary hover:text-primary/80 underline">
                support@realmeta.ca
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

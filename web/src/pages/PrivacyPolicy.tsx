import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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

        <h1 className="font-display text-4xl text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: May 15, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              RealMeta Inc. ("Company", "we", "us") operates the MetaVisitAR platform. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy
              carefully. By using the Service, you consent to the practices described herein.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">2. Information We Collect</h2>

            <h3 className="font-medium text-foreground mt-4 mb-2">a) Museum Admin Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Name, email address, and password (hashed with bcrypt)</li>
              <li>Museum name, location, description, and website</li>
              <li>Uploaded artwork images, descriptions, and metadata</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">b) Visitor Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Photos taken via the visitor scanning feature (processed temporarily for artwork identification)</li>
              <li>Language preferences selected during visits</li>
              <li>Basic usage analytics (pages visited, artworks viewed, scan activity)</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">c) Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Browser type and version</li>
              <li>Device type (mobile/desktop)</li>
              <li>IP address (for security and analytics)</li>
              <li>Access timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Provide the Service:</strong> Host museum content, generate QR codes, serve visitor pages</li>
              <li><strong>AI Processing:</strong> Analyze uploaded artwork images using AI services (Anthropic Claude, OpenAI, Hugging Face) to generate descriptions, titles, and metadata</li>
              <li><strong>Translation:</strong> Translate artwork descriptions into multiple languages using OpenAI and Google Translate</li>
              <li><strong>Audio Generation:</strong> Generate text-to-speech audio descriptions using ElevenLabs</li>
              <li><strong>Image Matching:</strong> Generate CLIP embeddings from uploaded images for visitor artwork identification</li>
              <li><strong>Analytics:</strong> Provide museum admins with visitor engagement statistics</li>
              <li><strong>Communication:</strong> Send email verification links and password reset emails via Amazon SES</li>
              <li><strong>Security:</strong> Detect and prevent unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the following third-party services to operate the platform. Each has its own privacy policy:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Amazon Web Services (AWS):</strong> Cloud hosting, file storage (S3), database (DocumentDB), content delivery (CloudFront), email (SES)</li>
              <li><strong>Anthropic (Claude):</strong> AI artwork recognition and description generation</li>
              <li><strong>OpenAI:</strong> AI artwork recognition (fallback), translation services</li>
              <li><strong>Hugging Face:</strong> AI artwork recognition (fallback), CLIP image embeddings</li>
              <li><strong>ElevenLabs:</strong> Text-to-speech audio generation</li>
              <li><strong>Google Translate:</strong> Translation fallback service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Artwork images and descriptions may be sent to these services for processing. We do not sell your data to
              any third party. Third-party AI services process data according to their respective privacy policies and
              data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">5. Visitor Photo Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              When visitors use the scan feature, their photos are sent to our server for artwork identification.
              Visitor photos are processed in real-time and are <strong>not permanently stored</strong>. They are used
              solely for matching against the museum's uploaded artwork database via CLIP embeddings and AI analysis.
              Temporary files are deleted immediately after processing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">6. Data Storage and Retention</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Museum content</strong> (images, descriptions, audio) is stored in AWS S3 with encryption at rest</li>
              <li><strong>Account data</strong> is stored in Amazon DocumentDB with TLS encryption in transit</li>
              <li><strong>Passwords</strong> are hashed using bcrypt and never stored in plain text</li>
              <li><strong>JWT tokens</strong> expire after 7 days</li>
              <li><strong>Verification tokens</strong> expire after 24 hours</li>
              <li><strong>Password reset tokens</strong> expire after 1 hour</li>
              <li>Data is retained as long as your account is active. Upon account deletion, your data will be removed within 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>HTTPS encryption for all communications</li>
              <li>TLS encryption for database connections</li>
              <li>Bcrypt password hashing with 10-round salt</li>
              <li>JWT-based authentication with expiring tokens</li>
              <li>AWS security groups and VPC network isolation</li>
              <li>CloudFront with HTTPS-only access</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Request an export of your content in a standard format</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent for data processing at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@realmeta.ca" className="text-primary hover:text-primary/80 underline">
                privacy@realmeta.ca
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses localStorage to store your authentication token. We do not use tracking cookies or
              third-party advertising cookies. No cookie consent banner is required as we do not use cookies for
              tracking purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The admin portion of the Service is not intended for use by anyone under the age of 18. The visitor
              interface may be used by all ages as it does not collect personal information. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">11. Canadian Privacy Law Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              RealMeta Inc. is a Canadian company and complies with the Personal Information Protection and Electronic
              Documents Act (PIPEDA). We process personal information in accordance with Canadian privacy law, including
              obtaining consent for collection, limiting use to stated purposes, and implementing appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify registered users of material changes
              via email. The "Last updated" date at the top of this page indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or concerns about this Privacy Policy, contact us at:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm space-y-1">
              <p><strong className="text-foreground">RealMeta Inc.</strong></p>
              <p>Email: <a href="mailto:privacy@realmeta.ca" className="text-primary hover:text-primary/80 underline">privacy@realmeta.ca</a></p>
              <p>Toronto, Ontario, Canada</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

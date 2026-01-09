import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import {
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  Share2,
  ExternalLink,
  Smartphone,
  Info,
  ImageDown
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function AdminQRCodes() {
  const { museum } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "svg">("png");
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // Production URL for visitor access
  const productionUrl = "https://real-meta-museum.vercel.app";
  const visitorUrl = museum?.qrCode
    ? `${productionUrl}/visit/${museum.qrCode}`
    : "";

  const handleCopyUrl = async () => {
    if (!visitorUrl) return;

    try {
      await navigator.clipboard.writeText(visitorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadPNG = () => {
    const canvas = document.querySelector("#qr-canvas canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${museum?.name?.replace(/\s+/g, "_") || "museum"}_qr_code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadSVG = () => {
    const svg = document.querySelector("#qr-svg svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = `${museum?.name?.replace(/\s+/g, "_") || "museum"}_qr_code.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const canvas = document.querySelector("#qr-canvas canvas") as HTMLCanvasElement;
    if (!canvas) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${museum?.name || "Museum"}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            img {
              max-width: 300px;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
            }
            p {
              color: #666;
              font-size: 14px;
            }
            .url {
              font-size: 12px;
              color: #999;
              word-break: break-all;
              max-width: 300px;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${canvas.toDataURL("image/png")}" alt="QR Code" />
            <h1>${museum?.name || "Museum"}</h1>
            <p>Scan to explore our collection</p>
            <p class="url">${visitorUrl}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleCopyUrl();
      return;
    }

    try {
      await navigator.share({
        title: `${museum?.name || "Museum"} - Visitor Access`,
        text: "Scan this QR code to explore our museum collection!",
        url: visitorUrl
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="px-8 py-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl text-foreground flex items-center gap-3"
            >
              <QrCode className="w-8 h-8 text-primary" />
              QR Codes
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground mt-1"
            >
              Generate and download QR codes for visitor access
            </motion.p>
          </div>
        </header>

        <div className="p-8">
          {!museum?.qrCode ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <QrCode className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">No QR Code Available</h3>
              <p className="text-muted-foreground">
                Your museum QR code will appear here once your museum is set up.
              </p>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* QR Code Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-8"
              >
                <h2 className="font-display text-xl text-foreground mb-6">Your Museum QR Code</h2>

                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                    <div id="qr-svg">
                      <QRCodeSVG
                        value={visitorUrl}
                        size={220}
                        level="H"
                        includeMargin={false}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>
                    {/* Hidden canvas for download */}
                    <div id="qr-canvas" className="hidden">
                      <QRCodeCanvas
                        value={visitorUrl}
                        size={512}
                        level="H"
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    </div>
                  </div>

                  <h3 className="font-display text-lg text-foreground mb-1">
                    {museum?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {museum?.location}
                  </p>

                  {/* URL Display */}
                  <div className="w-full p-3 bg-muted/50 rounded-xl mb-6">
                    <p className="text-xs text-muted-foreground mb-1">Visitor URL</p>
                    <p className="text-sm text-foreground break-all font-mono">
                      {visitorUrl}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <Button
                      variant="gold"
                      className="gap-2"
                      onClick={handleDownloadPNG}
                    >
                      <ImageDown className="w-4 h-4" />
                      Download PNG
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleDownloadSVG}
                    >
                      <Download className="w-4 h-4" />
                      Download SVG
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleCopyUrl}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy URL
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handlePrint}
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                  </div>

                  {/* Share Button */}
                  <Button
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                    Share QR Code
                  </Button>

                  {/* Test Link */}
                  <a
                    href={visitorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Test visitor experience
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>

              {/* Instructions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                {/* How to Use */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    How to Use
                  </h2>
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Download the QR Code</p>
                        <p className="text-sm text-muted-foreground">
                          Choose PNG for printing or SVG for high-quality displays
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Print & Display</p>
                        <p className="text-sm text-muted-foreground">
                          Place the QR code at your museum entrance or near exhibits
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div>
                        <p className="font-medium text-foreground">Visitors Scan</p>
                        <p className="text-sm text-muted-foreground">
                          Visitors scan with their phone camera to access the experience
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center shrink-0">
                        4
                      </span>
                      <div>
                        <p className="font-medium text-foreground">AI-Powered Identification</p>
                        <p className="text-sm text-muted-foreground">
                          Visitors can scan artworks to get instant information and audio guides
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* Visitor Experience Preview */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Visitor Experience
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <QrCode className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Scan QR Code</p>
                        <p className="text-xs text-muted-foreground">Opens visitor page in browser</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm">📝</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Optional Registration</p>
                        <p className="text-xs text-muted-foreground">Name, email for analytics (skippable)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm">📷</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Scan Artwork</p>
                        <p className="text-xs text-muted-foreground">Point camera at any artwork</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm">🎧</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Get Information</p>
                        <p className="text-xs text-muted-foreground">AI identifies artwork + audio guide in 16 languages</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                  <h3 className="font-medium text-foreground mb-3">Tips for Best Results</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Print at minimum 2x2 inches (5x5 cm) for easy scanning
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Place at eye level near museum entrance
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Ensure good lighting around the QR code
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      Test scanning from different distances
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

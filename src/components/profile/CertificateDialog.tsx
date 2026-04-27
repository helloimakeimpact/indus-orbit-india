import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SEGMENT_META, type Segment } from "@/components/auth/segments";
import { Download, Award, ShieldCheck, Orbit, Check, Image as ImageIcon } from "lucide-react";
import logo from "@/assets/indus-orbit-logo.png";
import QRCodeLib from "qrcode";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

type CertificateData = {
  isLead: boolean;
  totalChapters: number;
  totalMissions: number;
  displayName: string;
  segment: Segment | null;
};

export function CertificateDialog({ 
  userId, 
  isVerified, 
  orbitSegment,
  displayName 
}: { 
  userId: string;
  isVerified: boolean;
  orbitSegment: Segment | null;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bgTheme, setBgTheme] = useState<"dark" | "light">("dark");
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR code data URL once per user
    const url = typeof window !== 'undefined' 
      ? `${window.location.origin}/app/profile?id=${userId}` 
      : `https://indus-orbit-india.com/app/profile?id=${userId}`;
    
    QRCodeLib.toDataURL(url, { margin: 2, scale: 4 }, (err, dataUrl) => {
      if (!err) setQrDataUrl(dataUrl);
    });
  }, [userId]);

  useEffect(() => {
    if (!open || !isVerified) return;
    
    async function fetchData() {
      setLoading(true);
      
      const [chRes, msRes] = await Promise.all([
        supabase.from("chapter_members").select("role").eq("user_id", userId),
        supabase.from("mission_members").select("role").eq("user_id", userId)
      ]);

      const chapters = chRes.data || [];
      const missions = msRes.data || [];

      const isChapterLead = chapters.some(c => c.role === "lead");
      const isMissionLead = missions.some(m => m.role === "lead");

      setData({
        isLead: isChapterLead || isMissionLead,
        totalChapters: chapters.length,
        totalMissions: missions.length,
        displayName,
        segment: orbitSegment
      });
      
      setLoading(false);
    }

    fetchData();
  }, [open, userId, isVerified, orbitSegment, displayName]);

  const handleDownload = async () => {
    const el = document.getElementById("certificate-node");
    if (!el) return;
    try {
      setDownloading(true);
      // Use a fixed dimension capture to prevent scaling issues
      const dataUrl = await toPng(el, { 
        width: 800,
        height: el.scrollHeight,
        pixelRatio: 2,
        cacheBust: true,
      });
      
      const pdf = new jsPDF({ 
        orientation: "landscape", 
        unit: "px", 
        format: [800, el.scrollHeight] 
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, 800, el.scrollHeight);
      pdf.save(`Indus_Orbit_Certificate_${displayName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (!isVerified) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-[var(--saffron)] text-[var(--saffron)] hover:bg-[var(--saffron)]/10">
          <Award className="h-4 w-4" />
          Generate Certificate
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto border-none bg-transparent p-0 shadow-none hide-scrollbar">
        <VisuallyHidden>
          <DialogTitle>Platform Certificate</DialogTitle>
          <DialogDescription>Your official Indus Orbit ecosystem certificate.</DialogDescription>
        </VisuallyHidden>

        {/* Background Selector */}
        <div className="mb-4 mt-8 flex items-center justify-center gap-3">
          <span className="text-sm font-medium text-white drop-shadow-md">Theme:</span>
          {[
            { id: "dark", label: "Dark Mode" },
            { id: "light", label: "Light Mode" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setBgTheme(t.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                bgTheme === t.id 
                  ? "bg-white text-black border-white" 
                  : "bg-black/50 text-white border-white/20 hover:bg-black/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div 
          className="relative overflow-hidden rounded-3xl p-12"
          id="certificate-node"
          style={{ 
            width: "800px", 
            height: "auto", 
            margin: "0 auto",
            backgroundColor: bgTheme === "dark" ? "#0e0a1f" : "#fcfaf5",
            color: bgTheme === "dark" ? "#fcfaf5" : "#0e0a1f",
            boxShadow: bgTheme === "dark" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "0 25px 50px -12px rgba(0,0,0,0.1)",
            border: bgTheme === "dark" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}
        >
          {/* Abstract Orbits */}
          <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none" style={{ color: bgTheme === "dark" ? "#ffffff" : "#000000" }}>
            <Orbit className="h-96 w-96" />
          </div>
          <div className="absolute -left-20 -bottom-20 opacity-5 pointer-events-none" style={{ color: bgTheme === "dark" ? "#ffffff" : "#000000" }}>
            <Orbit className="h-96 w-96" />
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 flex flex-col items-center text-center rounded-2xl p-8">
            <div className="mb-8 flex items-center justify-center gap-4">
              <img src={logo} alt="Indus Orbit" className="h-16 w-16" style={{ filter: bgTheme === "dark" ? "invert(1) drop-shadow(0 4px 3px rgba(0,0,0,0.07))" : "drop-shadow(0 4px 3px rgba(0,0,0,0.07))" }} />
              <h2 className="font-display text-4xl font-semibold tracking-wide" style={{ color: bgTheme === "dark" ? "#fcfaf5" : "#0e0a1f" }}>Indus Orbit</h2>
            </div>

            <div className="mb-10" style={{ color: "#f97316" }}>
              <ShieldCheck className="mx-auto h-12 w-12 mb-3" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }} />
              <p className="text-sm font-semibold uppercase tracking-[0.3em]">Official Certification</p>
            </div>

            <p className="text-lg mb-2" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.8)" : "rgba(14,10,31,0.8)" }}>This is to certify that</p>
            <h1 className="font-display text-5xl font-semibold mb-6">{displayName}</h1>

            <p className="text-xl font-light italic mb-10 max-w-lg" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.9)" : "rgba(14,10,31,0.9)" }}>
              is recognized as a Verified {data?.segment ? SEGMENT_META[data.segment].label : "Member"} within the Indus Orbit ecosystem, actively contributing to India's intelligence layer.
            </p>

            {/* Metrics */}
            {!loading && data && (
              <div className="flex gap-10 pt-8 mb-8 w-full justify-center" style={{ borderTop: bgTheme === "dark" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)" }}>
                {data.isLead && (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold" style={{ color: "#f97316" }}>Platform Lead</span>
                    <span className="text-xs uppercase tracking-wider mt-1" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.6)" : "rgba(14,10,31,0.6)" }}>Status</span>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{data.totalChapters}</span>
                  <span className="text-xs uppercase tracking-wider mt-1" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.6)" : "rgba(14,10,31,0.6)" }}>Chapters</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{data.totalMissions}</span>
                  <span className="text-xs uppercase tracking-wider mt-1" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.6)" : "rgba(14,10,31,0.6)" }}>Missions</span>
                </div>
              </div>
            )}
            {/* Vision / Mission */}
            <div className="mt-6 rounded-2xl p-6 w-full max-w-xl" style={{ backgroundColor: bgTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", border: bgTheme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)" }}>
              <p className="text-sm leading-relaxed" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.8)" : "rgba(14,10,31,0.8)" }}>
                <strong style={{ color: bgTheme === "dark" ? "#fcfaf5" : "#0e0a1f" }}>The Indus Orbit Mission:</strong> Building the digital and physical gravity that pulls India’s next generation of builders into the same orbit. Connection. Synergy. Society.
              </p>
            </div>

            <div className="mt-12 flex w-full justify-between items-end pt-6 px-4" style={{ borderTop: bgTheme === "dark" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)" }}>
              <div className="flex items-center gap-4 text-left">
                <div className="p-1 rounded-lg" style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
                  {qrDataUrl && (
                    <img 
                      src={qrDataUrl} 
                      alt="Profile QR" 
                      style={{ width: "64px", height: "64px", display: "block" }} 
                    />
                  )}
                </div>
                <div>
                  <p className="font-display text-lg" style={{ color: bgTheme === "dark" ? "#fcfaf5" : "#0e0a1f" }}>Indus Orbit Trust Layer</p>
                  <p className="text-xs uppercase tracking-widest mt-1" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.7)" : "rgba(14,10,31,0.7)" }}>Scan to verify or join</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono" style={{ color: "#f97316", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>ID: {userId.split('-')[0].toUpperCase()}</p>
                <p className="text-xs mt-1" style={{ color: bgTheme === "dark" ? "rgba(252,250,245,0.7)" : "rgba(14,10,31,0.7)" }}>{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Button 
            className="bg-white text-black hover:bg-gray-200"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="mr-2 h-4 w-4" /> 
            {downloading ? "Generating PDF..." : "Save as PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

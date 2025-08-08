import React, { useEffect, useRef, useState } from "react";
import { FormData } from "../EmailGenerator";
import { AnimatedBlobLoader } from "@/components/ui/AnimatedBlobLoader";

interface Step4GenerationProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
}

export const Step4Generation: React.FC<Step4GenerationProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const [status, setStatus] = useState("Starting…");
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false); // prevents double-run in StrictMode

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    abortRef.current = new AbortController();

    const run = async () => {
      setStatus("Contacting generator…");

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: formData.domain,
            emailType: formData.emailType,
            designAesthetic: formData.designAesthetic,
            tone: formData.tone,
            userContext: formData.userContext,
            imageContext: (formData as any).imageContext,
            products: formData.products || [],
            brandData: (formData as any).brandData || {},
            customHeroImage: formData.useCustomHero ?? true,
          }),
          signal: abortRef.current?.signal,
        });

        if (!res.ok) {
          setStatus(`Error: ${res.status} ${res.statusText}`);
          return;
        }

        // Expected: { success, subjectLine?, emails:[{ index, subject?, content, html }] }
        const data = await res.json();
        console.log("[Generator response]", data); // 🔎 help us see what came back

        const first = data?.emails?.[0];
        if (!first) {
          setStatus("Error: No email returned");
          return;
        }

        // Robust subject extraction
        const subjectFromTop = data?.subjectLine;
        const subjectFromEmail = first?.subject;
        const subject =
          (typeof subjectFromTop === "string" && subjectFromTop.trim()) ||
          (typeof subjectFromEmail === "string" && subjectFromEmail.trim()) ||
          "(No Subject)";

        updateFormData({
          subjectLine: subject, // save for Step 5 header
          generatedEmails: [
            {
              index: 1,
              subject, // mirror so Step 5 can fall back
              content: first.content || "",
              html: first.html || "",
            },
          ],
        });

        setStatus("Done!");
        onNext();
      } catch (err: any) {
        console.error("Generate failed:", err);
        setStatus("Error: " + (err?.message || "unknown"));
      }
    };

    run();

    return () => abortRef.current?.abort();
  }, [formData, updateFormData, onNext]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
      <h1
        className="text-2xl font-normal text-gray-100 z-10 text-center"
        style={{ textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)" }}
      >
        Generating your email...
      </h1>
      <p className="text-sm text-gray-400 animate-pulse mt-2 z-10">{status}</p>
      <AnimatedBlobLoader />
    </div>
  );
};

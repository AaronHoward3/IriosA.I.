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

  useEffect(() => {
    // Create a fresh controller per mount (important for React Strict Mode)
    const controller = new AbortController();
    abortRef.current = controller;
    let finished = false;

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
          signal: controller.signal,
        });

        if (!res.ok) {
          setStatus(`Error: ${res.status} ${res.statusText}`);
          return;
        }

        // Parse safely (avoid hanging if backend ever returns non-JSON)
        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON from backend:", text);
          setStatus("Error: Invalid JSON from backend");
          return;
        }

        const first = data?.emails?.[0];
        if (!first) {
          setStatus("Error: No email returned");
          return;
        }

        const subjectFromTop = data?.subjectLine;
        const subjectFromEmail = first?.subject;
        const subject =
          (typeof subjectFromTop === "string" && subjectFromTop.trim()) ||
          (typeof subjectFromEmail === "string" && subjectFromEmail.trim()) ||
          "(No Subject)";

        updateFormData({
          subjectLine: subject,
          generatedEmails: [
            {
              index: 1,
              subject,
              content: first.content || "",
              html: first.html || "",
            },
          ],
        });

        finished = true;
        setStatus("Done!");
        onNext();
      } catch (err: any) {
        // IMPORTANT: Ignore the Strict Mode test-run abort — don't show an error
        if (err?.name === "AbortError") {
          console.warn("Step 4 fetch aborted (likely Strict Mode pre-render). Ignored.");
          return;
        }
        console.error("Generate failed:", err);
        setStatus("Error: " + (err?.message || "unknown"));
      }
    };

    run();

    // Cleanup: only abort if still in-flight; prevents killing the "real" run
    return () => {
      if (!finished) controller.abort();
    };
    // Depend only on the stable props; avoid retrigger loops mid-request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

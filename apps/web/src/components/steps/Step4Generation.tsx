import React, { useEffect, useRef, useState } from "react";
import { FormData } from "../EmailGenerator";
import { AnimatedBlobLoader } from "@/components/ui/AnimatedBlobLoader";
import { supabase } from "@/lib/supabaseClient"; // ➜ added earlier
const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3001"; // ➜ added earlier

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
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const stopFake = startFakeProgress({
      useCustomHero: !!(formData as any).useCustomHero,
      setStatus,
      timersRef,
    });

    let didAbort = false;
    const run = async () => {
      setStatus("Contacting generator…");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`${API_ROOT}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            domain: formData.domain,
            emailType: formData.emailType,
            designAesthetic: formData.designAesthetic,
            tone: (formData as any).tone,
            userContext: formData.userContext,
            imageContext: (formData as any).imageContext,
            products: formData.products || [],
            brandData: (formData as any).brandData || {},
            customHeroImage: (formData as any).useCustomHero ?? true,
            savedHeroImageId: (formData as any).savedHeroImageId || null, // ➜ NEW: enables “reuse image” (no image credit)
          }),
          signal: controller.signal,
        });

        if (res.status === 402) {
          stopFake();
          setStatus("No email credits left. Redirecting to Manage Plan…");
          window.location.href = "/settings?plan=1";
          return;
        }

        if (!res.ok) {
          stopFake();
          setStatus(`Error: ${res.status} ${res.statusText}`);
          return;
        }

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          stopFake();
          console.error("Invalid JSON from backend:", text);
          setStatus("Error: Invalid JSON from backend");
          return;
        }

        const first = data?.emails?.[0];
        if (!first) {
          stopFake();
          setStatus("Error: No email returned");
          return;
        }

        const subjectFromTop = data?.subjectLine;
        const subjectFromEmail = first?.subject;
        const subject =
          (typeof subjectFromTop === "string" && subjectFromTop.trim()) ||
          (typeof subjectFromEmail === "string" && subjectFromEmail.trim()) ||
          "(No Subject)";

        stopFake();
        finishedRef.current = true;

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

        setStatus("Done!");
        onNext();
      } catch (err: any) {
        if (err?.name === "AbortError") {
          didAbort = true;
          return;
        }
        stopFake();
        console.error("Generate failed:", err);
        setStatus("Error: " + (err?.message || "unknown"));
      }
    };

    run();

    return () => {
      if (!finishedRef.current && !didAbort) controller.abort();
      stopFake();
    };
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

/* fake progress engine unchanged... */
function startFakeProgress({ useCustomHero, setStatus, timersRef }) {
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const addTimer = (ms, fn) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  const stop = () => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  };

  if (!useCustomHero) {
    const total = randInt(12_000, 30_000);
    const t0 = randInt(400, 800);
    const t1 = randInt(Math.floor(total * 0.30), Math.floor(total * 0.45));
    const t2 = randInt(Math.floor(total * 0.55), Math.floor(total * 0.70));
    const t3 = randInt(Math.floor(total * 0.80), Math.floor(total * 0.92));
    addTimer(t0, () => setStatus("Creating layout…"));
    addTimer(t1, () => setStatus("Writing content…"));
    addTimer(t2, () => setStatus("Refining email…"));
    addTimer(t3, () => setStatus("Finalizing…"));
  } else {
    const tCreate = randInt(500, 1_200);
    const tWrite = tCreate + randInt(1_200, 4_000);
    const tRefine = tWrite + randInt(1_500, 4_000);
    const tHero = Math.max(randInt(15_000, 20_000), tRefine + 1_000);
    const tFinalize = Math.max(randInt(108_000, 114_000), tHero + 5_000);
    addTimer(tCreate, () => setStatus("Creating layout…"));
    addTimer(tWrite, () => setStatus("Writing content…"));
    addTimer(tRefine, () => setStatus("Refining email…"));
    addTimer(tHero, () => setStatus("Generating custom hero image…"));
    addTimer(tFinalize, () => setStatus("Finalizing…"));
  }
  return stop;
}

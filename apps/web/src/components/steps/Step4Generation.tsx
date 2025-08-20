import React, { useEffect, useRef, useState } from "react";
import { FormData } from "../EmailGenerator";
import { AnimatedBlobLoader } from "@/components/ui/AnimatedBlobLoader";
import { supabase } from "@/lib/supabaseClient"; // ➜ added
const API_ROOT = import.meta.env.VITE_API_URL ?? "http://localhost:3001"; // ➜ added

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
    // Create a fresh controller per mount (important for React Strict Mode)
    const controller = new AbortController();
    abortRef.current = controller;

    // 1) Kick off the fake progress timeline
    const stopFake = startFakeProgress({
      useCustomHero: !!(formData as any).useCustomHero,
      setStatus,
      timersRef,
    });

    // 2) Start the real request (we cancel fake updates as soon as this resolves)
    let didAbort = false;
    const run = async () => {
      setStatus("Contacting generator…");
      try {
        // ➜ added: supabase auth token
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
          }),
          signal: controller.signal,
        });

        // ➜ added: out-of-credits handling
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

        // Stop fake updates immediately; show Done and advance
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
          // Ignore the Strict Mode pre-render abort
          didAbort = true;
          return;
        }
        stopFake();
        console.error("Generate failed:", err);
        setStatus("Error: " + (err?.message || "unknown"));
      }
    };

    run();

    // Cleanup: cancel timers and abort in-flight request
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

/* ---------------- FAKE PROGRESS ENGINE ---------------- */

function startFakeProgress({
  useCustomHero,
  setStatus,
  timersRef,
}: {
  useCustomHero: boolean;
  setStatus: (s: string) => void;
  timersRef: React.MutableRefObject<number[]>;
}) {
  // Utility helpers
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const addTimer = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  // Always clear all scheduled timers
  const stop = () => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  };

  // Schedule with slight randomness so it doesn’t look scripted
  if (!useCustomHero) {
    // --- Non-hero path: total ~12–30s, with staggered steps ---
    const total = randInt(12_000, 30_000);

    const t0 = randInt(400, 800); // Creating layout early
    const t1 = randInt(Math.floor(total * 0.30), Math.floor(total * 0.45)); // Writing content
    const t2 = randInt(Math.floor(total * 0.55), Math.floor(total * 0.70)); // Refining email
    const t3 = randInt(Math.floor(total * 0.80), Math.floor(total * 0.92)); // Finalizing

    addTimer(t0, () => setStatus("Creating layout…"));
    addTimer(t1, () => setStatus("Writing content…"));
    addTimer(t2, () => setStatus("Refining email…"));
    addTimer(t3, () => setStatus("Finalizing…"));
  } else {
    // --- Custom-hero path: about 130s total
    // Requirements:
    // - "Generating custom hero image…" starts around 15–20s
    // - "Finalizing…" appears around ~110s
    // (We still randomize early steps a bit for natural flow)
    const tCreate = randInt(500, 1_200); // Creating layout
    const tWrite = tCreate + randInt(1_200, 4_000); // Writing content
    const tRefine = tWrite + randInt(1_500, 4_000); // Refining email

    // Must be >= ~15–20s and after refine
    const tHero = Math.max(randInt(15_000, 20_000), tRefine + 1_000);

    // Finalizing should appear ~110s and after hero
    const tFinalize = Math.max(randInt(108_000, 114_000), tHero + 5_000);

    addTimer(tCreate, () => setStatus("Creating layout…"));
    addTimer(tWrite, () => setStatus("Writing content…"));
    addTimer(tRefine, () => setStatus("Refining email…"));
    addTimer(tHero, () => setStatus("Generating custom hero image…"));
    addTimer(tFinalize, () => setStatus("Finalizing…"));

    // (We intentionally do not schedule a fake "Done"—navigation occurs when the real request completes.)
  }

  return stop;
}

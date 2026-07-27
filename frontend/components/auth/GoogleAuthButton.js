"use client";

import { useEffect, useRef, useCallback } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/**
 * Google OAuth Sign-In button using Google Identity Services (GIS).
 *
 * Props:
 *   text        – "signin_with" | "signup_with" | "continue_with" (default: "signin_with")
 *   onCredential – async (credential) => void – called with the Google ID token
 *   className   – optional additional class names
 */
export default function GoogleAuthButton({ text = "signin_with", onCredential, className = "" }) {
  const btnRef = useRef(null);
  const initializedRef = useRef(false);

  const handleCredential = useCallback(async (response) => {
    if (response?.credential && onCredential) {
      try {
        await onCredential(response.credential);
      } catch {
        // Errors handled by the caller
      }
    }
  }, [onCredential]);

  // Load GIS script once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.getElementById("gis-script")) return;

    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // Initialize and render button when GIS is ready
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !btnRef.current || initializedRef.current) return;

    const tryInit = () => {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          cancel_on_tap_outside: false,
        });

        window.google.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: text,
          size: "large",
          width: btnRef.current.offsetWidth || 400,
          logo_alignment: "center",
        });

        initializedRef.current = true;
      }
    };

    // Retry a few times if GIS not yet loaded
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      tryInit();
      if (initializedRef.current || attempts > 20) clearInterval(iv);
    }, 500);

    tryInit();

    return () => clearInterval(iv);
  }, [handleCredential, text]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-xs text-red-400 text-center">
        Google Sign-In is not configured.
      </p>
    );
  }

  return (
    <div
      ref={btnRef}
      className={`w-full min-h-[40px] flex justify-center ${className}`}
    />
  );
}

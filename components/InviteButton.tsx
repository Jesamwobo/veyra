"use client";
import { useState } from "react";

export default function InviteButton() {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = window.location.origin;
    const text = "Join me on Veyra: complete missions, earn VYR and send it to friends.";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Veyra", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled sharing */
    }
  }

  return (
    <button type="button" className="btn-primary" onClick={invite}>
      {copied ? "Link copied" : "Invite friends"}
    </button>
  );
}

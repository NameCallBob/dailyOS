"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { setMode } from "@/lib/mode";

export function LandingActions() {
  const router = useRouter();
  const [pending, setPending] = useState<"trial" | null>(null);

  function startTrial() {
    setPending("trial");
    setMode("trial");
    router.push("/dashboard");
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row">
      <Button size="lg" className="w-full sm:w-auto" loading={pending === "trial"} onClick={startTrial}>
        免費試用
      </Button>
      <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => router.push("/login")}>
        登入
      </Button>
    </div>
  );
}

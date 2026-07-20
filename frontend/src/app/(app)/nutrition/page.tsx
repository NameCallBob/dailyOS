import type { Metadata } from "next";

import { NutritionPageClient } from "@/features/nutrition/nutrition-page-client";

export const metadata: Metadata = { title: "飲食" };

export default function NutritionPage() {
  return <NutritionPageClient />;
}

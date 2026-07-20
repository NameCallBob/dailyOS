"use client";

import { NAV_GROUPS } from "@/lib/nav";
import { OPTIONAL_NAV_ITEMS } from "../constants";

export interface StepModulesProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/** 第二步：啟用模組（依 nav.ts 分組呈現，dashboard / settings 一律啟用不在此列）。 */
export function StepModules({ value, onChange }: StepModulesProps) {
  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="sr-only">啟用模組</legend>
      {NAV_GROUPS.map((group) => {
        const items = OPTIONAL_NAV_ITEMS.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-2">
            <p className="text-label uppercase text-ink-muted">{group}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((item) => {
                const selected = value.includes(item.key);
                return (
                  <label
                    key={item.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors ${
                      selected ? "border-ink bg-paper-sunken text-ink" : "border-line-strong text-ink-soft hover:bg-paper-sunken"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(item.key)}
                      className="h-4 w-4 accent-ink"
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

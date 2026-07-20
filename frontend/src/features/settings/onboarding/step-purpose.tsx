"use client";

import { PURPOSE_OPTIONS, type PurposeValue } from "../constants";

export interface StepPurposeProps {
  value: PurposeValue[];
  onChange: (value: PurposeValue[]) => void;
}

/** 第一步：使用目的（可複選），用於預先建議要啟用的模組。 */
export function StepPurpose({ value, onChange }: StepPurposeProps) {
  function toggle(purpose: PurposeValue) {
    onChange(value.includes(purpose) ? value.filter((p) => p !== purpose) : [...value, purpose]);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">使用目的</legend>
      <div role="group" aria-label="使用目的" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PURPOSE_OPTIONS.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
              className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selected ? "border-ink bg-paper-sunken" : "border-line-strong hover:bg-paper-sunken"
              }`}
            >
              <span className="flex items-center gap-2 text-body font-medium text-ink">
                <span aria-hidden>{selected ? "☑" : "☐"}</span>
                {option.label}
              </span>
              <span className="text-caption text-ink-muted">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

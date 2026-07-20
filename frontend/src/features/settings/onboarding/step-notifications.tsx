"use client";

import { Select } from "@/components/ui/select";
import { NOTIFICATION_CHANNEL_DEFS, buildTimezoneOptions, type NotificationChannelKey } from "../constants";
import type { NotificationChannels } from "../schema";

export interface StepNotificationsProps {
  channels: NotificationChannels;
  onChangeChannels: (channels: NotificationChannels) => void;
  timezone: string;
  onChangeTimezone: (timezone: string) => void;
}

/** 第三步：通知偏好（各類型開關 + 時區；安靜時段細節於設定頁可再調整）。 */
export function StepNotifications({ channels, onChangeChannels, timezone, onChangeTimezone }: StepNotificationsProps) {
  function toggle(key: NotificationChannelKey) {
    onChangeChannels({ ...channels, [key]: !channels[key] });
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col divide-y divide-line">
        <legend className="sr-only">通知類型</legend>
        {NOTIFICATION_CHANNEL_DEFS.map((channel) => (
          <label
            key={channel.key}
            htmlFor={`onboarding-channel-${channel.key}`}
            className="flex cursor-pointer items-center justify-between gap-4 py-2.5"
          >
            <span className="flex flex-col">
              <span className="text-body text-ink">{channel.label}</span>
              <span className="text-caption text-ink-muted">{channel.description}</span>
            </span>
            <input
              id={`onboarding-channel-${channel.key}`}
              type="checkbox"
              role="switch"
              checked={channels[channel.key]}
              onChange={() => toggle(channel.key)}
              className="h-5 w-9 shrink-0 cursor-pointer accent-ink"
            />
          </label>
        ))}
      </fieldset>
      <Select
        label="時區"
        options={buildTimezoneOptions(timezone)}
        value={timezone}
        onChange={(e) => onChangeTimezone(e.target.value)}
      />
    </div>
  );
}

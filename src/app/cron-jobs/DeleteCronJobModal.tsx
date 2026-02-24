"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";

export function DeleteCronJobModal({
  open,
  jobLabel,
  onClose,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  jobLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationModal
      open={open}
      onClose={onClose}
      title="Delete cron job"
      error={error ?? undefined}
      confirmLabel="Delete"
      confirmBusyLabel="Deleting…"
      onConfirm={onConfirm}
      busy={busy}
    >
      <p className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">
        Delete cron job <code className="font-mono">{jobLabel}</code>? This removes it from the Gateway scheduler. You
        can recreate it later.
      </p>
    </ConfirmationModal>
  );
}

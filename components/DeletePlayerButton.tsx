"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface DeletePlayerButtonProps {
  playerId: string;
  playerName: string;
}

export function DeletePlayerButton({
  playerId,
  playerName,
}: DeletePlayerButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const PASSWORD = "boxcric@14";

  useEffect(() => {
    setMounted(true);
  }, []);

  function validatePassword() {
    if (password !== PASSWORD) {
      setPasswordError("Incorrect password");
      return false;
    }
    setPasswordError(null);
    return true;
  }

  async function handleDelete() {
    // Validate password first
    if (!validatePassword()) {
      return;
    }

    setDeleting(true);
    setError(null);
    setPasswordError(null);

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete player");
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete player");
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  function handleClose() {
    setShowConfirm(false);
    setError(null);
    setPasswordError(null);
    setPassword("");
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 active:scale-95"
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "🗑️ Delete"}
      </button>

      {showConfirm && mounted
        ? createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
                aria-hidden="true"
              />

              {/* Confirmation Modal */}
              <div
                className="fixed left-1/2 top-1/2 z-[10000] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 text-lg font-bold text-slate-800">
                  Delete Player?
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  Are you sure you want to delete <strong>{playerName}</strong>?
                  Please enter the password to confirm.
                </p>

                {/* Password Input */}
                <div className="mb-4">
                  <label
                    htmlFor="delete-password"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !deleting) {
                        handleDelete();
                      }
                    }}
                    placeholder="Enter password"
                    className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                    disabled={deleting}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-1 text-xs text-red-600">{passwordError}</p>
                  )}
                </div>

                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting || !password}
                    className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={deleting}
                    className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}


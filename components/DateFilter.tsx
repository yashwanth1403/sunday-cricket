"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get("date") || "";

  const [dateValue, setDateValue] = useState(selectedDate);

  // Sync state with URL params when they change
  useEffect(() => {
    setDateValue(selectedDate);
  }, [selectedDate]);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    setDateValue(date);

    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", date);
    } else {
      params.delete("date");
    }
    router.push(`/matches?${params.toString()}`);
  }

  function handleClear() {
    setDateValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label
        htmlFor="date-filter"
        className="text-sm font-medium text-slate-700 sm:mr-2"
      >
        Filter by Date:
      </label>
      <div className="flex gap-2">
        <input
          id="date-filter"
          type="date"
          value={dateValue}
          onChange={handleDateChange}
          className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {selectedDate && (
          <button
            onClick={handleClear}
            className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

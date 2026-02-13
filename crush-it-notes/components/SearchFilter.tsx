"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export default function SearchFilter({
  value,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: SearchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    // Auto-expand if there's a value (e.g., when coming back to the page)
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !value
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleIconClick = () => {
    setIsExpanded(true);
  };

  const handleClear = () => {
    onClear();
    setIsExpanded(false);
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-6 right-8 z-50 pointer-events-auto"
    >
      <div
        className={[
          "bg-white/90 backdrop-blur rounded-2xl shadow-lg border-2 transition-all duration-300 ease-out",
          isFocused || value ? "border-rose-400" : "border-rose-200",
          isExpanded ? "w-auto" : "w-auto",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            type="button"
            onClick={handleIconClick}
            className="shrink-0 text-rose-600 hover:text-rose-700 transition-colors"
            title="Search notes"
          >
            <Search className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setIsExpanded(true);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder="Search by author or recipient..."
            className={[
              "bg-transparent outline-none text-rose-900 placeholder-rose-400 text-sm transition-all duration-300",
              isExpanded ? "w-64 opacity-100" : "w-0 opacity-0",
            ].join(" ")}
            style={{
              pointerEvents: isExpanded ? "auto" : "none",
            }}
          />

          {value && isExpanded && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 flex items-center justify-center transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4 text-rose-700" />
            </button>
          )}
        </div>

        {value && isExpanded && (
          <div className="px-4 pb-3 pt-0 border-t border-rose-100">
            <div className="text-xs text-rose-800/70 mt-2">
              Showing {resultCount} of {totalCount} note
              {totalCount !== 1 ? "s" : ""}
              {resultCount === 0 && " (no matches)"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

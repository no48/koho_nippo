"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

type AutocompleteInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  field: "origin" | "destination";
  required?: boolean;
};

export function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  field,
  required = false,
}: AutocompleteInputProps) {
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch all suggestions on mount
  useEffect(() => {
    const fetchAllSuggestions = async () => {
      try {
        const response = await fetch(
          `/api/reports/suggestions?field=${field}&query=`
        );
        if (response.ok) {
          const data = await response.json();
          setAllSuggestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      }
    };
    fetchAllSuggestions();
  }, [field]);

  // Filter suggestions based on input
  const filteredResult = (() => {
    if (value.length < 1) {
      return allSuggestions.slice(0, 10);
    }
    return allSuggestions
      .filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
      .slice(0, 10);
  })();

  if (
    filteredResult.length !== filteredSuggestions.length ||
    filteredResult.some((s, i) => s !== filteredSuggestions[i])
  ) {
    setFilteredSuggestions(filteredResult);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      onChange(filteredSuggestions[selectedIndex]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? "bg-gray-100" : ""
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

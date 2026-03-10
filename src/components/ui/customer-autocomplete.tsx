"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

type Customer = {
  id: number;
  name: string;
};

type CustomerAutocompleteProps = {
  id: string;
  value: string;
  onSelect: (customerId: string, customerName: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function CustomerAutocomplete({
  id,
  value,
  onSelect,
  placeholder,
  required = false,
}: CustomerAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch all customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/customers");
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter customers based on input
  useEffect(() => {
    if (inputValue.length < 1) {
      setFilteredCustomers(customers.slice(0, 10));
    } else {
      const filtered = customers.filter((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 10));
    }
  }, [inputValue, customers]);

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
    if (!showSuggestions || filteredCustomers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const customer = filteredCustomers[selectedIndex];
      setInputValue(customer.name);
      onSelect(customer.id.toString(), customer.name);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (customer: Customer) => {
    setInputValue(customer.name);
    onSelect(customer.id.toString(), customer.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {showSuggestions && filteredCustomers.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredCustomers.map((customer, index) => (
            <li
              key={customer.id}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? "bg-gray-100" : ""
              }`}
              onClick={() => handleSuggestionClick(customer)}
            >
              {customer.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

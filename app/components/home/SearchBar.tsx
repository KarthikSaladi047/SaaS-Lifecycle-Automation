"use client";
import React from "react";

type SearchBarProps = {
  searchQuery: string;
  onChange: (query: string) => void;
  onClear: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onChange, onClear }) => (
  <div className="relative w-64">
    <input
      type="text"
      placeholder="Search Anything..."
      value={searchQuery}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1 pr-8 border border-white text-white placeholder-balck bg-transparent rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
    />
    {searchQuery && (
      <button
        onClick={onClear}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-yellow-400 text-sm"
      >
        ×
      </button>
    )}
  </div>
);

export default SearchBar;

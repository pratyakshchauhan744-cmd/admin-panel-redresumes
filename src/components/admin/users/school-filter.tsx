"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Search } from "lucide-react";

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

interface SchoolFilterProps {
  schools: SchoolOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SchoolFilter({ schools, value, onChange }: SchoolFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const options = [
    { id: "all", name: "All schools", code: "" },
    { id: "other", name: "Other", code: "No school / direct signups" },
    ...schools,
  ];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((school) =>
    `${school.name} ${school.code}`.toLocaleLowerCase().includes(normalizedSearch)
  );
  const selectedSchool = options.find((school) => school.id === value);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, listId, open]);

  const selectSchool = (schoolId: string) => {
    onChange(schoolId);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full sm:w-64"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Filter by school: ${selectedSchool?.name ?? "Unknown school"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setSearch("");
          setActiveIndex(0);
          setOpen(!open);
        }}
        className="flex w-full items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/80 transition-all cursor-pointer"
      >
        <Building2 className="w-4 h-4 shrink-0 text-zinc-500" />
        <span className="flex-1 truncate text-left">{selectedSchool?.name ?? "Unknown school"}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-64 rounded-xl border border-zinc-700 bg-zinc-950 shadow-xl shadow-black/40">
          <div className="relative p-2 border-b border-zinc-800">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search schools"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={filteredOptions.length ? `${listId}-${activeIndex}` : undefined}
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (filteredOptions.length) {
                    const direction = event.key === "ArrowDown" ? 1 : -1;
                    setActiveIndex((index) => (index + direction + filteredOptions.length) % filteredOptions.length);
                  }
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const school = filteredOptions[activeIndex];
                  if (school) selectSchool(school.id);
                }
              }}
              placeholder="Search school name or code..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/80"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Schools" className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.map((school, index) => (
              <li key={school.id} role="presentation">
                <button
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={value === school.id}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSchool(school.id)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs cursor-pointer ${
                    activeIndex === index ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words">{school.name}</span>
                    {school.code && <span className="block mt-0.5 text-[10px] text-zinc-500">{school.code}</span>}
                  </span>
                  {value === school.id && <Check className="w-3.5 h-3.5 shrink-0 text-rose-400" />}
                </button>
              </li>
            ))}
          </ul>
          {filteredOptions.length === 0 && (
            <p role="status" className="px-4 py-5 text-center text-xs text-zinc-500">No schools found.</p>
          )}
        </div>
      )}
    </div>
  );
}

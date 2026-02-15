"use client";

// ─── Choice Chip ─────────────────────────────────────────────────────────────

export function Choice({ label, subtitle, selected, onClick, large }: {
  label: string; subtitle?: string; selected?: boolean; onClick: () => void; large?: boolean;
}) {
  return (
    <button onClick={onClick} className={`rounded-2xl border-2 text-left transition-all duration-200 w-full active:scale-[0.97] ${large ? "p-5" : "p-4"} ${selected ? "border-slate-900 bg-slate-900 text-white shadow-lg" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:shadow-md hover:bg-slate-50"}`}>
      <span className={`${large ? "text-lg" : "text-base"} font-medium`}>{label}</span>
      {subtitle && <span className={`block text-sm mt-0.5 ${selected ? "text-slate-300" : "text-slate-400"}`}>{subtitle}</span>}
    </button>
  );
}

// ─── Continue Button (with processing guard) ─────────────────────────────────

export function ContinueBtn({ onClick, disabled, label, processing }: {
  onClick: () => void; disabled?: boolean; label?: string; processing?: boolean;
}) {
  const isDisabled = disabled || processing;
  return (
    <button onClick={onClick} disabled={isDisabled}
      className={`mt-8 w-full py-4 rounded-2xl text-lg transition-all duration-200 ${isDisabled ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-lg hover:shadow-xl font-medium"}`}>
      {processing ? "Processing..." : (label || "Continue")}
    </button>
  );
}

// ─── Bypass Link ─────────────────────────────────────────────────────────────

export function BypassLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
      {label}
    </button>
  );
}

// ─── Field Label ─────────────────────────────────────────────────────────────

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-sm text-slate-500 mb-1.5 block">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

// ─── Select Field ────────────────────────────────────────────────────────────

export function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 px-3 text-base rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

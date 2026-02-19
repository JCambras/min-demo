"use client";
import { TrendingUp, TrendingDown } from "lucide-react";

export function DetailDrawer({ id, activeId, children }: { id: string; activeId: string | null; children: React.ReactNode }) {
  if (activeId !== id) return null;
  return <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in text-sm">{children}</div>;
}

export function ComingSoon() {
  return <p className="text-xs text-slate-400 italic">Detailed view coming soon — historical trends, breakdowns, and drill-through to source records.</p>;
}

export function HealthRing({ score }: { score: number }) {
  const r = 80, cx = 100, cy = 100, stroke = 12;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const bg = score >= 80 ? "from-green-50 to-emerald-50" : score >= 60 ? "from-amber-50 to-orange-50" : "from-red-50 to-rose-50";
  return (
    <div className={`relative flex items-center justify-center w-[200px] h-[200px] rounded-full bg-gradient-to-br ${bg}`}>
      <svg width="200" height="200" viewBox="0 0 200 200" className="absolute">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="text-center z-10">
        <p className="text-5xl font-light" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">HEALTH</p>
      </div>
    </div>
  );
}

export function Delta({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek;
  if (diff === 0) return <span className="text-xs text-slate-400">—</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}{diff}
    </span>
  );
}

export function MiniHealthRing({ score, size = 60 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const cx = size / 2, cy = size / 2, stroke = size * 0.06;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`} className="transition-all duration-700 ease-out" />
      </svg>
      <p className="text-center z-10 font-light leading-none" style={{ fontSize: size * 0.3, color }}>{score}</p>
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-amber-100 text-amber-700", medium: "bg-slate-100 text-slate-600" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[severity] || styles.medium}`}>{severity}</span>;
}

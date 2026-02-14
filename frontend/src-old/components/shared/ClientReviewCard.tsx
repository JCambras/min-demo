"use client";
import { Pencil } from "lucide-react";
import type { ClientInfo } from "@/lib/types";

interface ClientReviewCardProps {
  client: ClientInfo;
  label: string;
  onClick?: () => void;
  showFinancials?: boolean;
}

export function ClientReviewCard({ client, label, onClick, showFinancials = false }: ClientReviewCardProps) {
  const name = `${client.firstName} ${client.lastName}`.trim();
  const Tag = onClick ? "button" : "div";

  // Format DOB from ISO to readable
  const fmtDOB = (d: string) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Build address string, filtering empty parts
  const addrParts = [client.street, client.city, [client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean);
  const address = addrParts.join(", ");

  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left bg-white border border-slate-200 rounded-2xl p-5 transition-all ${onClick ? "hover:border-slate-400 hover:shadow-sm cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
        {onClick && <Pencil size={14} className="text-slate-300" />}
      </div>
      <p className="font-medium text-slate-800">{name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
        {client.email && <span>{client.email}</span>}
        {client.phone && <span>{client.phone}</span>}
        {address && <span>{address}</span>}
        {client.dob && <span>DOB: {fmtDOB(client.dob)}</span>}
        {(client.maritalStatus || client.employmentStatus) && <span>{[client.maritalStatus, client.employmentStatus].filter(Boolean).join(" · ")}</span>}
        {client.citizenship && <span>{client.citizenship}</span>}
      </div>
      {showFinancials && (client.annualIncome || client.netWorth || client.riskTolerance) && (
        <div className="mt-2 pt-2 border-t border-slate-50 grid grid-cols-3 gap-2 text-xs text-slate-400">
          {client.annualIncome && <span>Income: {client.annualIncome}</span>}
          {client.netWorth && <span>NW: {client.netWorth}</span>}
          {client.riskTolerance && <span>Risk: {client.riskTolerance}</span>}
        </div>
      )}
    </Tag>
  );
}

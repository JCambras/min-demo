"use client";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { FieldLabel, SelectField } from "@/components/shared/FormControls";
import { fmtSSN, fmtPhone, isValidEmail, isValidDOB } from "@/lib/format";
import { US_STATES } from "@/lib/constants";
import type { ClientInfo } from "@/lib/types";

export function ClientForm({ client, setClient, showSSN, setShowSSN, label, autofillFrom }: {
  client: ClientInfo;
  setClient: (c: ClientInfo) => void;
  showSSN: boolean;
  setShowSSN: (v: boolean) => void;
  label: string;
  autofillFrom?: ClientInfo;
}) {
  const u = (field: keyof ClientInfo, val: string) => setClient({ ...client, [field]: val });
  const canAutoFillAddr = autofillFrom && !client.street && autofillFrom.street;
  const canCopyFinancial = autofillFrom && !client.annualIncome && autofillFrom.annualIncome;
  const canFillTrustedFromPrimary = autofillFrom && !client.trustedContactName && autofillFrom.firstName;

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>

      {canAutoFillAddr && (
        <button onClick={() => setClient({ ...client, street: autofillFrom!.street, city: autofillFrom!.city, state: autofillFrom!.state, zip: autofillFrom!.zip })}
          className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700 hover:bg-blue-100 transition-colors text-left">
          Auto-fill address from {autofillFrom!.firstName}
        </button>
      )}

      {/* Identity */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Identity</p>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel label="First name" required /><Input className="h-11 rounded-xl" value={client.firstName} onChange={(e) => u("firstName", e.target.value)} /></div>
          <div><FieldLabel label="Last name" required /><Input className="h-11 rounded-xl" value={client.lastName} onChange={(e) => u("lastName", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Email" required />
            <Input type="email" className={`h-11 rounded-xl ${client.email && !isValidEmail(client.email) ? "border-red-300" : ""}`} value={client.email} onChange={(e) => u("email", e.target.value)} />
            {client.email && !isValidEmail(client.email) && <p className="text-xs text-red-400 mt-1">Enter a valid email</p>}
          </div>
          <div><FieldLabel label="Phone" required /><Input type="tel" className="h-11 rounded-xl" value={client.phone} onChange={(e) => u("phone", fmtPhone(e.target.value))} placeholder="(555) 123-4567" /></div>
        </div>
        <div><FieldLabel label="Street address" required /><Input className="h-11 rounded-xl" value={client.street} onChange={(e) => u("street", e.target.value)} /></div>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3"><FieldLabel label="City" required /><Input className="h-11 rounded-xl" value={client.city} onChange={(e) => u("city", e.target.value)} /></div>
          <div><FieldLabel label="State" required /><SelectField value={client.state} onChange={(v) => u("state", v)} options={US_STATES} placeholder="—" /></div>
          <div className="col-span-2"><FieldLabel label="Zip" required /><Input className="h-11 rounded-xl" value={client.zip} onChange={(e) => u("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel label="Date of birth" required />
            <Input type="date" className={`h-11 rounded-xl ${client.dob && !isValidDOB(client.dob) ? "border-red-300" : ""}`} value={client.dob} onChange={(e) => u("dob", e.target.value)} />
            {client.dob && !isValidDOB(client.dob) && <p className="text-xs text-red-400 mt-1">Must be 18+</p>}
          </div>
          <div>
            <FieldLabel label="SSN" required />
            <div className="relative">
              <Input type={showSSN ? "text" : "password"} className="h-11 rounded-xl pr-10 font-mono" placeholder="XXX-XX-XXXX" value={client.ssn} onChange={(e) => u("ssn", fmtSSN(e.target.value))} maxLength={11} />
              <button type="button" onClick={() => setShowSSN(!showSSN)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSSN ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div><FieldLabel label="Citizenship" required /><SelectField value={client.citizenship} onChange={(v) => u("citizenship", v)} options={["US Citizen", "US Resident Alien", "Non-Resident Alien"]} /></div>
      </div>

      {/* Government ID */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Government ID</p>
        <div><FieldLabel label="ID type" required /><SelectField value={client.idType} onChange={(v) => u("idType", v)} options={["Driver's License", "State ID", "Passport", "Military ID"]} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><FieldLabel label="ID number" required /><Input className="h-11 rounded-xl font-mono" value={client.idNumber} onChange={(e) => u("idNumber", e.target.value)} /></div>
          <div><FieldLabel label="Issuing state" required /><SelectField value={client.idState} onChange={(v) => u("idState", v)} options={US_STATES} placeholder="—" /></div>
          <div><FieldLabel label="Expiration" required /><Input type="date" className="h-11 rounded-xl" value={client.idExpiration} onChange={(e) => u("idExpiration", e.target.value)} /></div>
        </div>
      </div>

      {/* Personal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Personal</p>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel label="Marital status" required /><SelectField value={client.maritalStatus} onChange={(v) => u("maritalStatus", v)} options={["Single", "Married", "Divorced", "Widowed", "Domestic Partnership"]} placeholder="Select..." /></div>
          <div><FieldLabel label="Employment status" required /><SelectField value={client.employmentStatus} onChange={(v) => u("employmentStatus", v)} options={["Employed", "Self-Employed", "Retired", "Unemployed", "Student", "Homemaker"]} placeholder="Select..." /></div>
        </div>
        {(client.employmentStatus === "Employed" || client.employmentStatus === "Self-Employed") && (
          <div><FieldLabel label="Employer name" /><Input className="h-11 rounded-xl" value={client.employer} onChange={(e) => u("employer", e.target.value)} /></div>
        )}
      </div>

      {/* Financial Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Financial Profile</p>
        {canCopyFinancial && (
          <button onClick={() => setClient({ ...client, annualIncome: autofillFrom!.annualIncome, netWorth: autofillFrom!.netWorth, liquidNetWorth: autofillFrom!.liquidNetWorth, investmentExperience: autofillFrom!.investmentExperience, riskTolerance: autofillFrom!.riskTolerance, investmentObjective: autofillFrom!.investmentObjective })}
            className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700 hover:bg-blue-100 transition-colors text-left">
            Copy financial profile from {autofillFrom!.firstName}
          </button>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div><FieldLabel label="Annual income" required /><SelectField value={client.annualIncome} onChange={(v) => u("annualIncome", v)} options={["Under $50K", "$50K–$100K", "$100K–$200K", "$200K–$500K", "$500K–$1M", "Over $1M"]} placeholder="Select..." /></div>
          <div><FieldLabel label="Net worth" required /><SelectField value={client.netWorth} onChange={(v) => u("netWorth", v)} options={["Under $100K", "$100K–$500K", "$500K–$1M", "$1M–$5M", "$5M–$10M", "Over $10M"]} placeholder="Select..." /></div>
          <div><FieldLabel label="Liquid net worth" required /><SelectField value={client.liquidNetWorth} onChange={(v) => u("liquidNetWorth", v)} options={["Under $50K", "$50K–$250K", "$250K–$500K", "$500K–$1M", "$1M–$5M", "Over $5M"]} placeholder="Select..." /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><FieldLabel label="Investment experience" required /><SelectField value={client.investmentExperience} onChange={(v) => u("investmentExperience", v)} options={["None", "Limited (1–3 yrs)", "Moderate (3–10 yrs)", "Extensive (10+ yrs)"]} placeholder="Select..." /></div>
          <div><FieldLabel label="Risk tolerance" required /><SelectField value={client.riskTolerance} onChange={(v) => u("riskTolerance", v)} options={["Conservative", "Mod. Conservative", "Moderate", "Mod. Aggressive", "Aggressive"]} placeholder="Select..." /></div>
          <div><FieldLabel label="Investment objective" required /><SelectField value={client.investmentObjective} onChange={(v) => u("investmentObjective", v)} options={["Capital Preservation", "Income", "Growth & Income", "Growth", "Aggressive Growth"]} placeholder="Select..." /></div>
        </div>
      </div>

      {/* Trusted Contact */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trusted Contact <span className="normal-case text-slate-300 font-normal">(FINRA Rule 4512)</span></p>
        {canFillTrustedFromPrimary && (
          <button onClick={() => setClient({ ...client, trustedContactName: autofillFrom!.firstName, trustedContactLastName: autofillFrom!.lastName, trustedContactPhone: autofillFrom!.phone, trustedContactRelationship: "Spouse" })}
            className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700 hover:bg-blue-100 transition-colors text-left">
            Use {autofillFrom!.firstName} {autofillFrom!.lastName} as trusted contact
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel label="First name" required /><Input className="h-11 rounded-xl" value={client.trustedContactName} onChange={(e) => u("trustedContactName", e.target.value)} /></div>
          <div><FieldLabel label="Last name" required /><Input className="h-11 rounded-xl" value={client.trustedContactLastName} onChange={(e) => u("trustedContactLastName", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel label="Phone" required /><Input type="tel" className="h-11 rounded-xl" placeholder="(555) 123-4567" value={client.trustedContactPhone} onChange={(e) => u("trustedContactPhone", fmtPhone(e.target.value))} /></div>
          <div><FieldLabel label="Relationship" required /><SelectField value={client.trustedContactRelationship} onChange={(v) => u("trustedContactRelationship", v)} options={["Spouse", "Child", "Parent", "Sibling", "Attorney", "CPA", "Other"]} placeholder="Select..." /></div>
        </div>
      </div>
    </div>
  );
}

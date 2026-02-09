import type { ClientInfo, AccountRequest } from "./types";
import { custodian } from "./custodian";

// ─── Input Formatting ────────────────────────────────────────────────────────

export function fmtSSN(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function fmtPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function fmtDollar(v: string): string {
  const d = v.replace(/[^\d]/g, "");
  if (!d) return "";
  return Number(d).toLocaleString();
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function isValidDOB(d: string): boolean {
  if (!d) return false;
  const date = new Date(d);
  const now = new Date();
  const age = (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age >= 18 && age < 120;
}

export function isClientValid(c: ClientInfo): boolean {
  return !!(
    c.firstName && c.lastName &&
    c.email && isValidEmail(c.email) &&
    c.phone && c.street && c.city && c.state && c.zip &&
    c.dob && isValidDOB(c.dob) &&
    c.ssn && c.ssn.replace(/\D/g, "").length === 9 &&
    c.idNumber && c.idState && c.idExpiration &&
    c.maritalStatus && c.employmentStatus &&
    c.annualIncome && c.netWorth && c.liquidNetWorth &&
    c.investmentExperience && c.riskTolerance && c.investmentObjective &&
    c.trustedContactName && c.trustedContactLastName &&
    c.trustedContactPhone && c.trustedContactRelationship
  );
}

export function missingFields(c: ClientInfo): string[] {
  const m: string[] = [];
  if (!c.firstName) m.push("First name");
  if (!c.lastName) m.push("Last name");
  if (!c.email || !isValidEmail(c.email)) m.push("Email");
  if (!c.phone) m.push("Phone");
  if (!c.street) m.push("Street");
  if (!c.city) m.push("City");
  if (!c.state) m.push("State");
  if (!c.zip) m.push("Zip");
  if (!c.dob || !isValidDOB(c.dob)) m.push("DOB");
  if (!c.ssn || c.ssn.replace(/\D/g, "").length !== 9) m.push("SSN");
  if (!c.idNumber) m.push("ID #");
  if (!c.idState) m.push("ID State");
  if (!c.idExpiration) m.push("ID Exp.");
  if (!c.maritalStatus) m.push("Marital status");
  if (!c.employmentStatus) m.push("Employment");
  if (!c.annualIncome) m.push("Income");
  if (!c.netWorth) m.push("Net worth");
  if (!c.liquidNetWorth) m.push("Liquid NW");
  if (!c.investmentExperience) m.push("Inv. experience");
  if (!c.riskTolerance) m.push("Risk tolerance");
  if (!c.investmentObjective) m.push("Inv. objective");
  if (!c.trustedContactName) m.push("Trusted contact first");
  if (!c.trustedContactLastName) m.push("Trusted contact last");
  if (!c.trustedContactPhone) m.push("Trusted contact phone");
  if (!c.trustedContactRelationship) m.push("Trusted contact relationship");
  return m;
}

// ─── Document Helpers ────────────────────────────────────────────────────────

export function docsFor(a: AccountRequest, setupACH: boolean): string[] {
  const d = [
    `${custodian.docPrefix} ${a.type} Account Application`,
    custodian.formCRS,
    "Advisory Business Practices Addendum",
  ];
  // TOD accounts have death designation built in; JTWROS has survivorship. Only add bene form for others.
  if (!a.type.includes("TOD") && !a.type.includes("JTWROS") && a.type !== "Community Property") {
    d.push("Beneficiary Designation Form");
  }
  if (setupACH) d.push(`${custodian.achLabel} Authorization`);
  if (a.funding === "Rollover") {
    d.push("Rollover Recommendation Form");
    d.push("Prohibited Transaction Exemption (PTE) Form");
  }
  if (a.funding === "In-kind TOA" || a.funding === "Cash TOA") {
    d.push(custodian.transferForm);
    d.push("Letter of Authorization (LOA)");
  }
  return d;
}

// ─── Time Helpers ────────────────────────────────────────────────────────────

export function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

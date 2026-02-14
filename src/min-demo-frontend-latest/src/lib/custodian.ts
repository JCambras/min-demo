// ─── Custodian Configuration ─────────────────────────────────────────────────
// Change ACTIVE_CUSTODIAN to switch the entire platform's custodian references.
// Every document name, compliance label, and DocuSign template adapts.

export type CustodianId = "schwab" | "fidelity" | "pershing" | "altus";

export interface CustodianConfig {
  id: CustodianId;
  name: string;           // "Charles Schwab & Co."
  shortName: string;      // "Schwab"
  brandName: string;      // "Charles Schwab" (for document headers)
  platform: string;       // "Schwab Advisor Services" / "Fidelity Institutional"
  tdaLegacy?: boolean;    // true if this is a TD Ameritrade legacy firm
  docPrefix: string;      // "Charles Schwab" / "Fidelity" — used in "Fidelity IRA Account Application"
  achLabel: string;       // What they call ACH: "MoneyLink" / "EFT" / "Electronic Funds Transfer"
  custodyRef: string;     // How to reference in compliance: "Charles Schwab & Co., Inc."
  docusignCC?: string;    // CC address for DocuSign envelopes
  transferForm: string;   // "Transfer of Assets (TOA) Form" — some custodians call it differently
  formCRS: string;        // Form CRS text — same across custodians but referenced differently
}

const CUSTODIANS: Record<CustodianId, CustodianConfig> = {
  schwab: {
    id: "schwab",
    name: "Charles Schwab & Co.",
    shortName: "Schwab",
    brandName: "Charles Schwab",
    platform: "Schwab Advisor Services",
    docPrefix: "Charles Schwab",
    achLabel: "MoneyLink",
    custodyRef: "Charles Schwab & Co., Inc.",
    docusignCC: "Schwab DocuSign CC",
    transferForm: "Transfer of Assets (TOA) Form",
    formCRS: "Form CRS (Client Relationship Summary)",
  },
  fidelity: {
    id: "fidelity",
    name: "Fidelity Investments",
    shortName: "Fidelity",
    brandName: "Fidelity",
    platform: "Fidelity Institutional",
    docPrefix: "Fidelity",
    achLabel: "Electronic Funds Transfer (EFT)",
    custodyRef: "Fidelity Brokerage Services LLC",
    docusignCC: "Fidelity Advisor DocuSign",
    transferForm: "Transfer of Assets (TOA) Form",
    formCRS: "Form CRS (Client Relationship Summary)",
  },
  pershing: {
    id: "pershing",
    name: "Pershing LLC",
    shortName: "Pershing",
    brandName: "Pershing",
    platform: "Pershing Advisor Solutions",
    docPrefix: "Pershing",
    achLabel: "ACH Authorization",
    custodyRef: "Pershing LLC, a BNY Mellon Company",
    docusignCC: "Pershing Operations",
    transferForm: "Account Transfer Form (ACAT)",
    formCRS: "Form CRS (Client Relationship Summary)",
  },
  altus: {
    id: "altus",
    name: "Altus Financial",
    shortName: "Altus",
    brandName: "Altus",
    platform: "Altus Custody Services",
    docPrefix: "Altus",
    achLabel: "ACH / Wire Transfer",
    custodyRef: "Altus Financial Ltd.",
    transferForm: "Transfer of Assets (TOA) Form",
    formCRS: "Form CRS (Client Relationship Summary)",
  },
};

// ─── Active Custodian ────────────────────────────────────────────────────────
// This is the single knob. Change it here, everything else follows.

export const ACTIVE_CUSTODIAN: CustodianId = (
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CUSTODIAN as CustodianId) || "schwab"
);

export const custodian: CustodianConfig = CUSTODIANS[ACTIVE_CUSTODIAN] || CUSTODIANS.schwab;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAllCustodians(): CustodianConfig[] {
  return Object.values(CUSTODIANS);
}

export function getCustodian(id: CustodianId): CustodianConfig {
  return CUSTODIANS[id] || CUSTODIANS.schwab;
}

import { NextResponse } from "next/server";
import * as crypto from "crypto";
import type { ClientInfo } from "@/lib/types";
import { custodian } from "@/lib/custodian";
import { writeAuditLog } from "@/lib/audit";
import { getCRMContext } from "@/lib/crm/factory";
import type { SFContext } from "@/lib/sf-client";

// ─── Config (from environment) ───────────────────────────────────────────────
const DS_AUTH = process.env.DOCUSIGN_AUTH_URL || "https://account-d.docusign.com";
const DS_BASE = process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net";
const DS_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID || "";
const DS_USER_ID = process.env.DOCUSIGN_USER_ID || "";
const DS_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY || "";
const DS_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY || "";

// ─── JWT Auth ─────────────────────────────────────────────────────────────────
function base64url(data: string | Buffer): string {
  const b = typeof data === "string" ? Buffer.from(data) : data;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const segments = `${base64url(JSON.stringify({ typ: "JWT", alg: "RS256" }))}.${base64url(JSON.stringify({
    iss: DS_INTEGRATION_KEY, sub: DS_USER_ID, aud: "account-d.docusign.com",
    iat: now, exp: now + 3600, scope: "signature impersonation",
  }))}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(segments);
  const jwt = `${segments}.${base64url(sign.sign(DS_PRIVATE_KEY))}`;
  const res = await fetch(`${DS_AUTH}/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Token failed");
  return data.access_token;
}

// ─── HTML Document Generators ─────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; line-height: 1.5; padding: 50px; max-width: 850px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a2e; padding-bottom: 15px; margin-bottom: 30px; }
  .header h1 { font-size: 22px; font-weight: 700; color: #1a1a2e; }
  .header .logo { font-size: 12px; color: #666; text-align: right; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 14px; }
  .field-row { display: flex; gap: 20px; margin-bottom: 10px; }
  .field { flex: 1; }
  .field-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-value { font-size: 13px; font-weight: 500; padding: 6px 0; border-bottom: 1px solid #eee; min-height: 24px; }
  .sig-block { margin-top: 40px; padding: 25px; border: 2px solid #1a1a2e; border-radius: 8px; page-break-inside: avoid; }
  .sig-block h3 { font-size: 14px; margin-bottom: 15px; }
  .sig-line { margin-top: 20px; }
  .sig-anchor { color: #fff; font-size: 1px; }
  .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 9px; color: #999; text-align: center; }
  .checkbox { display: inline-block; width: 12px; height: 12px; border: 1px solid #999; margin-right: 6px; vertical-align: middle; }
  .checkbox.checked { background: #1a1a2e; }
  .note { font-size: 11px; color: #666; background: #f8f8f8; padding: 12px; border-radius: 6px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { padding: 8px 10px; text-align: left; font-size: 12px; border-bottom: 1px solid #eee; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; font-weight: 600; }
`;

function mask(ssn: string): string {
  if (!ssn) return "—";
  return "●●●-●●-" + ssn.replace(/\D/g, "").slice(-4);
}

// Use ClientInfo from shared types — aliased for backward compat in this file
type ClientData = ClientInfo;

interface BeneData { name: string; relationship: string; percentage: number; beneType: string; }
interface AccountData { type: string; owner: string; funding?: string; fundingAmount?: string; purpose?: string; amount?: string; allocation?: string; }
interface SignerInfo { name: string; email: string; index: number; }

function field(label: string, value: string) {
  return `<div class="field"><div class="field-label">${label}</div><div class="field-value">${value || "—"}</div></div>`;
}

function sigBlock(signers: SignerInfo[]) {
  return signers.map(s => `
    <div class="sig-block">
      <h3>${s.name}</h3>
      <p style="font-size:11px;color:#666;margin-bottom:10px;">${s.email}</p>
      <div class="sig-line">
        <div class="field-label">Signature</div>
        <div style="height:40px;border-bottom:2px solid #1a1a2e;position:relative;">
          <span class="sig-anchor">/sn${s.index}/</span>
        </div>
      </div>
      <div class="sig-line" style="margin-top:12px;">
        <div class="field-label">Date Signed</div>
        <div style="height:24px;border-bottom:1px solid #ccc;width:200px;position:relative;">
          <span class="sig-anchor">/dt${s.index}/</span>
        </div>
      </div>
    </div>
  `).join("");
}

// ── Account Application ───────────────────────────────────────────────────────
function genAccountApp(acct: AccountData, client: ClientData, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>${custodian.brandName} ${acct.type} Account Application</h1><p style="color:#666;font-size:12px;margin-top:4px;">New Account — ${date}</p></div>
      <div class="logo">Prepared by<br/><strong>Min</strong><br/>AdviceOne Wealth</div>
    </div>
    <div class="section">
      <div class="section-title">Account Information</div>
      <div class="field-row">${field("Account Type", acct.type)}${field("Account Owner", acct.owner)}${field("Registration", acct.type)}</div>
      ${acct.funding ? `<div class="field-row">${field("Funding Method", acct.funding)}${field("Est. Amount", acct.fundingAmount ? "$" + Number(acct.fundingAmount).toLocaleString() : "—")}${field("Allocation", acct.allocation || "—")}</div>` : ""}
      ${acct.purpose ? `<div class="field-row">${field("Source Institution", acct.purpose)}${field("Source Account #", acct.amount || "—")}${field("", "")}</div>` : ""}
    </div>
    <div class="section">
      <div class="section-title">Account Holder</div>
      <div class="field-row">${field("Full Legal Name", `${client.firstName} ${client.lastName}`)}${field("Date of Birth", client.dob)}${field("SSN", mask(client.ssn))}</div>
      <div class="field-row">${field("Email", client.email)}${field("Phone", client.phone)}${field("Citizenship", client.citizenship)}</div>
      <div class="field-row">${field("Address", `${client.street}, ${client.city}, ${client.state} ${client.zip}`)}${field("Marital Status", client.maritalStatus)}${field("Employment", client.employmentStatus)}</div>
      ${client.employer ? `<div class="field-row">${field("Employer", client.employer)}${field("", "")}${field("", "")}</div>` : ""}
    </div>
    <div class="section">
      <div class="section-title">Government ID</div>
      <div class="field-row">${field("ID Type", client.idType)}${field("ID Number", client.idNumber)}${field("Issuing State", client.idState)}</div>
      <div class="field-row">${field("Expiration", client.idExpiration)}${field("", "")}${field("", "")}</div>
    </div>
    <div class="section">
      <div class="section-title">Financial Profile — Suitability</div>
      <div class="field-row">${field("Annual Income", client.annualIncome)}${field("Net Worth", client.netWorth)}${field("Liquid Net Worth", client.liquidNetWorth)}</div>
      <div class="field-row">${field("Inv. Experience", client.investmentExperience)}${field("Risk Tolerance", client.riskTolerance)}${field("Inv. Objective", client.investmentObjective)}</div>
    </div>
    <div class="section">
      <div class="section-title">Trusted Contact Person <span style="font-weight:normal;text-transform:none;letter-spacing:0;">(SEC Rule 4512)</span></div>
      <div class="field-row">${field("Name", `${client.trustedContactName} ${client.trustedContactLastName}`)}${field("Phone", client.trustedContactPhone)}${field("Relationship", client.trustedContactRelationship)}</div>
    </div>
    <div class="note">By signing below, I certify that all information provided is accurate and complete. I authorize the opening of this account and agree to be bound by the terms and conditions of the account agreement.</div>
    ${sigBlock(signers)}
    <div class="footer">Generated by Min · AdviceOne Wealth Management · ${date}</div>
  </body></html>`;
}

// ── Form CRS ──────────────────────────────────────────────────────────────────
function genFormCRS(client: ClientData, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>Form CRS — Client Relationship Summary</h1><p style="color:#666;font-size:12px;margin-top:4px;">AdviceOne Wealth Management · ${date}</p></div>
      <div class="logo">SEC Required<br/>Disclosure</div>
    </div>
    <div class="section">
      <div class="section-title">Introduction</div>
      <p style="font-size:12px;">AdviceOne Wealth Management is registered with the Securities and Exchange Commission (SEC) as an investment adviser. Brokerage and investment advisory services and fees differ, and it is important for you to understand the differences.</p>
      <div class="note">Free and simple tools are available to research firms and financial professionals at <strong>Investor.gov/CRS</strong>, which also provides educational materials about broker-dealers, investment advisers, and investing.</div>
    </div>
    <div class="section">
      <div class="section-title">What investment services and advice can you provide me?</div>
      <p style="font-size:12px;">We offer investment advisory services including portfolio management, financial planning, and retirement planning. We provide advice on a regular basis and monitor your portfolio on an ongoing basis. We require a minimum account size for our advisory services. Our advisory services are provided on a discretionary basis, meaning we make investment decisions for your account without requiring your pre-approval.</p>
    </div>
    <div class="section">
      <div class="section-title">What fees will I pay?</div>
      <p style="font-size:12px;">We charge an ongoing asset-based fee that is a percentage of the value of your account, billed quarterly. The more assets in your advisory account, the more you will pay in fees. We therefore have an incentive to encourage you to increase the assets in your account. You will also pay transaction costs and custodian fees charged by ${custodian.name}</p>
    </div>
    <div class="section">
      <div class="section-title">What are your legal obligations to me?</div>
      <p style="font-size:12px;">When we act as your investment adviser, we have a fiduciary duty to act in your best interest and not put our interest ahead of yours. At the same time, the way we make money creates conflicts of interest. You should understand and ask us about these conflicts.</p>
    </div>
    <div class="section">
      <div class="section-title">Acknowledgment</div>
      <p style="font-size:12px;">I, <strong>${client.firstName} ${client.lastName}</strong>, acknowledge that I have received and reviewed this Form CRS disclosure document.</p>
    </div>
    ${sigBlock(signers)}
    <div class="footer">Form CRS · AdviceOne Wealth Management · Generated by Min · ${date}</div>
  </body></html>`;
}

// ── Beneficiary Designation ───────────────────────────────────────────────────
function genBeneForm(acct: AccountData, benes: BeneData[], signers: SignerInfo[], date: string): string {
  const rows = benes.length > 0 ? benes.map(b => `<tr><td>${b.name}</td><td>${b.relationship}</td><td>${b.percentage}%</td><td>${b.beneType}</td></tr>`).join("") : `<tr><td colspan="4" style="color:#999;text-align:center;">No beneficiaries designated</td></tr>`;
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>Beneficiary Designation Form</h1><p style="color:#666;font-size:12px;margin-top:4px;">${acct.owner} — ${acct.type} · ${date}</p></div>
      <div class="logo">${custodian.brandName}<br/>Beneficiary Form</div>
    </div>
    <div class="section">
      <div class="section-title">Account</div>
      <div class="field-row">${field("Account Type", acct.type)}${field("Account Owner", acct.owner)}</div>
    </div>
    <div class="section">
      <div class="section-title">Beneficiary Designations</div>
      <table><thead><tr><th>Name</th><th>Relationship</th><th>Share %</th><th>Type</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="note">I hereby designate the above-named beneficiaries to receive the assets of this account upon my death. This designation supersedes all prior beneficiary designations for this account.</div>
    ${sigBlock(signers)}
    <div class="footer">Beneficiary Designation · Generated by Min · ${date}</div>
  </body></html>`;
}

// ── Rollover Recommendation ───────────────────────────────────────────────────
function genRolloverRec(acct: AccountData, client: ClientData, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>Rollover Recommendation Form</h1><p style="color:#666;font-size:12px;margin-top:4px;">DOL PTE 2020-02 Compliance · ${date}</p></div>
      <div class="logo">Fiduciary<br/>Disclosure</div>
    </div>
    <div class="section">
      <div class="section-title">Client Information</div>
      <div class="field-row">${field("Client", `${client.firstName} ${client.lastName}`)}${field("Account Type", acct.type)}${field("Est. Rollover Amount", acct.fundingAmount ? "$" + Number(acct.fundingAmount).toLocaleString() : "—")}</div>
    </div>
    <div class="section">
      <div class="section-title">Rollover Recommendation</div>
      <p style="font-size:12px;margin-bottom:10px;">After careful evaluation, we recommend that you roll over your retirement plan assets to an ${acct.type} custodied at ${custodian.name} This recommendation is based on the following factors:</p>
      <p style="font-size:12px;">• <strong>Investment Options:</strong> Broader range of investment choices compared to employer plan</p>
      <p style="font-size:12px;">• <strong>Fees:</strong> Competitive advisory fees and low-cost custodial services</p>
      <p style="font-size:12px;">• <strong>Consolidation:</strong> Simplified account management and holistic planning</p>
      <p style="font-size:12px;">• <strong>Service:</strong> Personalized investment advice and ongoing portfolio management</p>
    </div>
    <div class="section">
      <div class="section-title">Financial Profile</div>
      <div class="field-row">${field("Risk Tolerance", client.riskTolerance)}${field("Inv. Objective", client.investmentObjective)}${field("Time Horizon", client.investmentExperience)}</div>
    </div>
    <div class="note"><strong>Important:</strong> You are not required to roll over your retirement plan assets. Other options may include leaving assets in your current plan, rolling to a new employer's plan, or taking a distribution (subject to taxes and potential penalties).</div>
    ${sigBlock(signers)}
    <div class="footer">Rollover Recommendation · PTE 2020-02 · Generated by Min · ${date}</div>
  </body></html>`;
}

// ── TOA Form ──────────────────────────────────────────────────────────────────
function genTOAForm(acct: AccountData, client: ClientData, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>Transfer of Assets (TOA) Authorization</h1><p style="color:#666;font-size:12px;margin-top:4px;">${date}</p></div>
      <div class="logo">ACAT / Non-ACAT<br/>Transfer</div>
    </div>
    <div class="section">
      <div class="section-title">Delivering Firm</div>
      <div class="field-row">${field("Institution", acct.purpose || "—")}${field("Account Number", acct.amount || "—")}${field("Account Type", acct.type)}</div>
      <div class="field-row">${field("Est. Value", acct.fundingAmount ? "$" + Number(acct.fundingAmount).toLocaleString() : "—")}${field("Transfer Type", acct.funding || "—")}${field("", "")}</div>
    </div>
    <div class="section">
      <div class="section-title">Receiving Firm</div>
      <div class="field-row">${field("Custodian", custodian.custodyRef)}${field("Account Type", acct.type)}${field("Account Holder", `${client.firstName} ${client.lastName}`)}</div>
    </div>
    <div class="section">
      <div class="section-title">Transfer Instructions</div>
      <p style="font-size:12px;">I hereby authorize and instruct the delivering firm to transfer all eligible assets from the account listed above to my new account at ${custodian.name} ${acct.funding === "Cash TOA" ? "All positions should be liquidated prior to transfer." : "All positions should be transferred in-kind where possible."}</p>
    </div>
    <div class="note">Please allow 5–10 business days for ACAT transfers. Non-ACAT transfers may take longer. A recent account statement must be on file.</div>
    ${sigBlock(signers)}
    <div class="footer">Transfer of Assets Authorization · Generated by Min · ${date}</div>
  </body></html>`;
}

// ── ACH Authorization ─────────────────────────────────────────────────────────
function genACHForm(client: ClientData, bankName: string, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header">
      <div><h1>ACH / MoneyLink Authorization</h1><p style="color:#666;font-size:12px;margin-top:4px;">${date}</p></div>
      <div class="logo">Electronic<br/>Funds Transfer</div>
    </div>
    <div class="section">
      <div class="section-title">Account Holder</div>
      <div class="field-row">${field("Name", `${client.firstName} ${client.lastName}`)}${field("Email", client.email)}</div>
    </div>
    <div class="section">
      <div class="section-title">Bank Account</div>
      <div class="field-row">${field("Bank Name", bankName)}${field("Account Type", "Checking")}</div>
    </div>
    <div class="note">I authorize ${custodian.name} to initiate credit and debit entries to the bank account listed above. This authorization will remain in effect until I revoke it in writing.</div>
    ${sigBlock(signers)}
    <div class="footer">ACH Authorization · Generated by Min · ${date}</div>
  </body></html>`;
}

// ── Generic doc (Advisory Addendum, PTE, LOA, etc.) ───────────────────────────
function genGenericDoc(title: string, description: string, signers: SignerInfo[], date: string): string {
  return `<html><head><style>${CSS}</style></head><body>
    <div class="header"><div><h1>${title}</h1><p style="color:#666;font-size:12px;margin-top:4px;">${date}</p></div><div class="logo">AdviceOne<br/>Wealth</div></div>
    <div class="section"><p style="font-size:12px;">${description}</p></div>
    <div class="note">By signing below, I acknowledge that I have received, reviewed, and agree to the terms outlined in this document.</div>
    ${sigBlock(signers)}
    <div class="footer">${title} · Generated by Min · ${date}</div>
  </body></html>`;
}

// ─── Envelope Builder ─────────────────────────────────────────────────────────
interface EnvelopeInput {
  account: AccountData;
  client: ClientData;
  client2?: ClientData;
  beneficiaries: BeneData[];
  documents: string[];
  signerNames: string[];
  signerEmails: string[];
  emailSubject: string;
  bankName?: string;
}

// Document generator registry — keyed by lowercase substrings that match docsFor() output.
// Adding a new document type = adding one entry here + one in docsFor().
type DocGenContext = { env: EnvelopeInput; signers: SignerInfo[]; date: string };
type DocGenEntry = { match: (dn: string) => boolean; gen: (ctx: DocGenContext) => string };

const DOC_GENERATORS: DocGenEntry[] = [
  { match: dn => dn.includes("account application"), gen: ({ env, signers, date }) => genAccountApp(env.account, env.client, signers, date) },
  { match: dn => dn.includes("form crs"), gen: ({ env, signers, date }) => genFormCRS(env.client, signers, date) },
  { match: dn => dn.includes("beneficiary"), gen: ({ env, signers, date }) => genBeneForm(env.account, env.beneficiaries, signers, date) },
  { match: dn => dn.includes("rollover recommendation"), gen: ({ env, signers, date }) => genRolloverRec(env.account, env.client, signers, date) },
  { match: dn => dn.includes("transfer of assets") || dn.includes("toa form"), gen: ({ env, signers, date }) => genTOAForm(env.account, env.client, signers, date) },
  { match: dn => dn.includes("ach") || dn.includes("moneylink"), gen: ({ env, signers, date }) => genACHForm(env.client, env.bankName || "On File", signers, date) },
  { match: dn => dn.includes("letter of authorization") || dn.includes("loa"), gen: ({ signers, date }) => genGenericDoc("Letter of Authorization (LOA)", "I hereby authorize the transfer of assets as detailed in the accompanying Transfer of Assets form. I confirm that I am the account holder and have the authority to initiate this transfer. I understand that the transfer process may take 5–10 business days for ACAT-eligible assets.", signers, date) },
  { match: dn => dn.includes("pte") || dn.includes("prohibited transaction"), gen: ({ signers, date }) => genGenericDoc("Prohibited Transaction Exemption (PTE 2020-02)", "This document confirms that the rollover recommendation provided complies with the Department of Labor's Prohibited Transaction Exemption 2020-02. The investment professional has acted in the client's best interest, charged reasonable compensation, and made no misleading statements regarding the transaction.", signers, date) },
  { match: dn => dn.includes("advisory") || dn.includes("addendum"), gen: ({ signers, date }) => genGenericDoc("Advisory Business Practices Addendum", `This addendum supplements your investment advisory agreement with AdviceOne Wealth Management. It outlines our business practices including: fee schedules, billing practices, custody arrangements through ${custodian.name}, proxy voting policies, and our privacy policy. By signing, you acknowledge receipt and understanding of these business practices.`, signers, date) },
];

function buildEnvelope(env: EnvelopeInput) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const signers: SignerInfo[] = env.signerEmails.map((email, i) => ({ name: env.signerNames[i] || email, email, index: i + 1 }));
  const ctx: DocGenContext = { env, signers, date };

  const docHtmls = env.documents.map(docName => {
    const dn = docName.toLowerCase();
    const generator = DOC_GENERATORS.find(g => g.match(dn));
    const html = generator ? generator.gen(ctx) : genGenericDoc(docName, "This document requires your review and signature.", signers, date);
    return { name: docName, html };
  });

  const documents = docHtmls.map((d, i) => ({
    documentId: String(i + 1), name: d.name, fileExtension: "html",
    documentBase64: Buffer.from(d.html).toString("base64"),
  }));

  const recipients = signers.map(s => ({
    email: s.email, name: s.name, recipientId: String(s.index), routingOrder: String(s.index),
    tabs: {
      signHereTabs: [{ anchorString: `/sn${s.index}/`, anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "-10", recipientId: String(s.index) }],
      dateSignedTabs: [{ anchorString: `/dt${s.index}/`, anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "-10", recipientId: String(s.index) }],
    },
  }));

  return { emailSubject: env.emailSubject, documents, recipients: { signers: recipients }, status: "sent" };
}

async function createEnvelope(token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${DS_BASE}/restapi/v2.1/accounts/${DS_ACCOUNT_ID}/envelopes`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.errorCode || "Envelope failed");
  return { envelopeId: data.envelopeId, status: data.status };
}

// ─── Status Check ─────────────────────────────────────────────────────────────
async function getEnvelopeStatus(token: string, envelopeId: string) {
  const res = await fetch(`${DS_BASE}/restapi/v2.1/accounts/${DS_ACCOUNT_ID}/envelopes/${envelopeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Status check failed");
  return {
    envelopeId: data.envelopeId,
    status: data.status,
    statusDateTime: data.statusChangedDateTime,
    sentDateTime: data.sentDateTime,
    deliveredDateTime: data.deliveredDateTime,
    completedDateTime: data.completedDateTime,
    emailSubject: data.emailSubject,
  };
}

// ─── API Route ────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    if (action === "sendEnvelopes") {
      const token = await getToken();
      const results = [];
      for (const env of data.envelopes) {
        const payload = buildEnvelope({
          account: env.account,
          client: data.client,
          client2: data.client2,
          beneficiaries: env.beneficiaries || [],
          documents: env.documents,
          signerNames: env.signerNames,
          signerEmails: env.signerEmails,
          emailSubject: env.emailSubject,
          bankName: data.bankName,
        });
        const result = await createEnvelope(token, payload);
        results.push({ name: env.name, ...result });
      }
      // Write audit log for DocuSign sends
      try {
        const crmCtx = await getCRMContext();
        const sfAuth = crmCtx.auth as SFContext;
        writeAuditLog(sfAuth, "sendDocusign", { envelopeCount: results.length, clientName: data.client?.firstName, householdId: data.householdId }, "success", `Sent ${results.length} envelope(s)`);
      } catch { /* audit failure must not block response */ }
      return NextResponse.json({ success: true, envelopes: results, count: results.length });
    }

    if (action === "checkStatus") {
      const token = await getToken();
      const statuses = [];
      for (const id of data.envelopeIds) {
        const status = await getEnvelopeStatus(token, id);
        statuses.push(status);
      }
      return NextResponse.json({ success: true, statuses });
    }

    if (action === "test") {
      const token = await getToken();
      return NextResponse.json({ success: true, message: "DocuSign connected!", tokenLength: token.length });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("DocuSign error:", error);
    // Write audit log for failed DocuSign actions
    try {
      const crmCtx = await getCRMContext();
      const sfAuth = crmCtx.auth as SFContext;
      writeAuditLog(sfAuth, "docusignError", {}, "error", error instanceof Error ? error.message : "DocuSign error");
    } catch { /* audit failure must not block response */ }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "DocuSign error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const token = await getToken();
    return NextResponse.json({ success: true, message: "DocuSign JWT auth working!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

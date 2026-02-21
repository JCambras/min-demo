# Min — SOC 2 Type II Readiness Assessment

**Prepared by:** Daniel Reeves, CISA, CISSP, CCSP
Senior Information Security Auditor | 14 years SaaS security assessment experience
Specialization: Financial services compliance (30+ fintech/wealthtech SOC 2 engagements)

**Date of Assessment:** February 20, 2026
**Assessment Scope:** Full readiness assessment — all five Trust Services Criteria
**Subject Company:** Min (AI workflow orchestration platform for SEC-registered RIA firms)
**Architecture:** Next.js 16.1.6 / TypeScript / React 19.2.3 / Turso (libSQL) / Vercel deployment target
**Founder/Operator:** Jon Cambras (sole employee — CTPO, acting CISO, DPO, and security engineer)

---

**Disclaimer:** This document is a readiness assessment, not a SOC 2 certification. Only a licensed CPA firm can issue a SOC 2 Type I or Type II report. This assessment identifies gaps, documents current controls, and produces a remediation roadmap so that when Min engages an auditor, the engagement is a confirmation of work already completed — not a discovery of work not yet started.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Organizational and Governance Controls](#phase-1-organizational-and-governance-controls)
3. [Phase 2: Security Controls (Common Criteria)](#phase-2-security-controls-common-criteria)
4. [Phase 3: Availability Controls](#phase-3-availability-controls)
5. [Phase 4: Processing Integrity Controls](#phase-4-processing-integrity-controls)
6. [Phase 5: Confidentiality Controls](#phase-5-confidentiality-controls)
7. [Phase 6: Privacy Controls](#phase-6-privacy-controls)
8. [Phase 7: Compliance Automation Tooling Assessment](#phase-7-compliance-automation-tooling-assessment)
9. [SOC 2 Readiness Scorecard](#soc-2-readiness-scorecard)
10. [The 90-Day SOC 2 Roadmap](#the-90-day-soc-2-roadmap)
11. [Customer-Facing Security Documentation](#customer-facing-security-documentation)
12. [The 5 Hardest SOC 2 Questions for Min](#the-5-hardest-soc-2-questions-for-min)

---

## Executive Summary

Min is an AI workflow orchestration platform for SEC-registered RIA firms. It handles client PII (names, SSNs, dates of birth, addresses), financial account data (account numbers, balances, positions), custodial credentials (OAuth tokens, API keys), and advisor activity data. Min integrates with Salesforce FSC via OAuth 2.0, with architecture stubs for Wealthbox and Redtail CRM, and targets BridgeFT for custodial data aggregation.

**Overall Readiness: 2.2 out of 5.0** — Min has made meaningful technical security investments (AES-256-GCM encryption for tokens, CSRF protection, PII scrubbing in audit logs, SOQL injection prevention, input validation) that put it ahead of most pre-seed companies. However, it has zero organizational controls — no written policies, no risk assessments, no vendor management, no incident response plan, no change management documentation. SOC 2 is roughly 60% organizational and 40% technical. Min has invested in the 40% and has not started the 60%.

**The good news:** Min's codebase demonstrates security awareness that is rare at this stage. The audit trail design references SEC Rule 17a-4. PII is scrubbed before logging. OAuth tokens are encrypted with authenticated encryption (AES-256-GCM with scrypt key derivation). CSRF protection uses constant-time comparison. Input validation is comprehensive. These are not accidental — they reflect a founder who understands the regulatory environment.

**The challenge:** SOC 2 requires *documented, repeatable processes* — not just good code. A solo founder who happens to do the right thing is not a control. A documented process that ensures the right thing happens regardless of who is doing it *is* a control. Min needs to formalize what Jon already does intuitively into written policies, procedures, and evidence.

**Timeline to SOC 2 Type I:** 4-6 months from today (assuming part-time effort alongside product development)
**Timeline to SOC 2 Type II:** 10-14 months from today (Type I + 6-month observation period)
**Estimated Total Cost:** $25,000-$45,000 (automation platform + auditor fees + penetration test)

---

## Phase 1: Organizational and Governance Controls

### 1.1 Information Security Policy

#### Current State Assessment

Min has no written Information Security Policy. Security practices exist in the codebase (encryption, access controls, audit logging) but are not documented in a policy that an auditor could review. There is no formal scope definition, no roles and responsibilities document, no acceptable use policy, and no exception handling process.

Jon Cambras is the sole employee. He is simultaneously the CISO, the DPO, the security engineer, the developer, and the system administrator. This is common at pre-seed companies and is not disqualifying for SOC 2 — but it requires specific compensating controls and documentation.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No written Information Security Policy. An auditor cannot assess controls that don't exist on paper. This is the single most common reason early-stage companies fail their first SOC 2 readiness assessment.
- No formal assignment of security responsibilities. Even with one person, the roles must be documented.

**HIGH (required for Type I):**
- No data classification policy (what is Confidential vs. Internal vs. Public)
- No acceptable use policy for company systems
- No exception handling process (what happens when a policy can't be followed)

#### Remediation Plan

**Information Security Policy — Required Sections:**

1. **Purpose and Scope** — Define what systems, data, and personnel are covered. For Min: all production systems, all client data (PII, financial data, custodial credentials), all development environments, and all third-party integrations.

2. **Roles and Responsibilities** — Even with one person, document the roles:
   - *Security Officer (Jon Cambras)*: Responsible for policy maintenance, risk assessment, incident response, vendor management, access review
   - *Development Lead (Jon Cambras)*: Responsible for secure coding practices, code review, dependency management, deployment
   - *System Administrator (Jon Cambras)*: Responsible for infrastructure, monitoring, backup, access provisioning
   - **Compensating control for solo founder**: Quarterly self-assessment using a standardized checklist. Document that the same person holding all roles is a known risk with mitigations (automated controls, third-party review, customer audit rights).

3. **Data Classification** — Three tiers:
   - *Confidential*: Client SSNs, dates of birth, account numbers, financial balances, custodial credentials (OAuth tokens, API keys), firm AUM, advisor compensation
   - *Internal*: Household names, advisor names, task subjects, compliance check results, schema discovery mappings, audit logs
   - *Public*: Marketing materials, product documentation, publicly available API documentation

4. **Access Control Policy** — Who can access what, how access is granted, how it's reviewed, how it's revoked. Reference the technical controls already in place (OAuth, encrypted cookies, session timeout).

5. **Acceptable Use** — What company systems may be used for, restrictions on personal use, prohibition on storing credentials in plaintext outside approved systems.

6. **Incident Response** — Reference the full incident response plan (see Section 2.6).

7. **Vendor Management** — Reference the vendor management program (see Section 1.4).

8. **Exception Handling** — Process for requesting, approving, and documenting exceptions to policy. For a solo founder: document the exception, the business justification, the compensating control, and the review date. Store in a Google Doc or similar version-controlled document.

9. **Policy Review** — Annual review at minimum. Document the review date and any changes.

**Estimated effort:** 2-3 days to draft. Use a template from Drata/Vanta/Secureframe as a starting point — do not write from scratch.

---

### 1.2 Risk Assessment

#### Current State Assessment

Min has no documented risk assessment. There is no risk register, no likelihood/impact scoring, no documented mitigations, and no annual review cadence. The founder clearly understands the risks (the codebase shows awareness of injection attacks, credential theft, PII exposure, and audit trail requirements), but this understanding is not formalized.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No documented risk assessment. SOC 2 CC3.1 requires "The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives." Without a risk assessment, there is no basis for evaluating whether controls are appropriate.
- No annual risk review process.

**HIGH (required for Type I):**
- No risk scoring methodology (likelihood × impact matrix)
- No documented risk acceptance criteria (what level of residual risk is acceptable)

#### Remediation Plan — Risk Assessment Framework for Min

**Risk Register (Initial Assessment):**

| # | Risk | Likelihood | Impact | Current Mitigation | Residual Risk | Priority |
|---|------|-----------|--------|-------------------|---------------|----------|
| R1 | Unauthorized access to client PII (SSNs, DOBs, account numbers) | Medium | Critical | PII scrubbed from logs (`audit.ts:41-66`), SSN masked in UI (`ClientForm.tsx:63`), bank accounts show last 4 digits only. No field-level encryption at rest. | High | P1 |
| R2 | Unauthorized access to custodial credentials (OAuth tokens) | Low | Critical | AES-256-GCM encryption in httpOnly cookies (`sf-connection.ts:49-56`), secure flag in production, scrypt key derivation, 16-byte random IV per encryption. | Medium | P1 |
| R3 | Data breach via compromised CRM integration | Medium | Critical | SOQL injection prevention (`sf-client.ts:50-58`), Salesforce ID validation (15/18 char alphanumeric pattern), 200-char input length limits, CSRF double-submit cookie protection. | Medium | P1 |
| R4 | Data integrity failure — Min displays incorrect financial data | Medium | High | Reconciliation endpoint with fuzzy matching (`reconciliation/route.ts:22-32`), confidence scoring with 0.70 threshold (`schema-discovery.ts:159-162`), manual mapping fallback for low-confidence orgs. No automated reconciliation schedule. | High | P2 |
| R5 | Availability failure during market hours | Medium | High | No documented SLA, no status page, no multi-region deployment, no automated failover. Vercel provides platform-level redundancy but no application-level HA. | High | P2 |
| R6 | AI model produces incorrect compliance recommendation | Low | High | Compliance engine is 100% deterministic (`compliance-engine.ts:254-549`). No LLM involvement in compliance checks. Keyword-based matching with configurable thresholds. 50+ test cases for compliance logic. | Low | P3 |
| R7 | Supply chain risk — Anthropic API, Salesforce API, Turso | Medium | High | No direct Anthropic API calls in production code (confirmed via codebase search). Salesforce retry logic with 30s timeout and exponential backoff (`sf-client.ts:100-150`). Turso has no failover configured. | Medium | P2 |
| R8 | Insider threat — solo founder has unrestricted access | High | Critical | No separation of duties. Founder has access to all production data, all credentials, all source code. Compensating control: audit logging of all mutations (`audit.ts`), but founder could disable logging. | Critical | P1 |
| R9 | Social engineering targeting the founder | Medium | Critical | No security awareness training documentation. No phishing simulation. MFA not implemented in Min (though Salesforce OAuth provides SSO). Founder's personal device security unknown. | High | P1 |
| R10 | Loss of source code or infrastructure credentials | Low | Critical | Source code in GitHub (presumed private repo). Infrastructure credentials in `.env.local` (not encrypted at rest on disk). No secrets manager. No credential rotation schedule. Dev fallback keys hardcoded in source (`sf-connection.ts:12`, `org-query.ts:110`). | High | P1 |
| R11 | Cross-tenant data leakage | Low | Critical | Salesforce org-level isolation via per-org OAuth tokens. Turso tables include `org_id` filtering. No shared LLM context between tenants (no LLM calls). localStorage-based firm data is per-browser, not per-user — shared browser session could leak across users. | Medium | P2 |
| R12 | Expired or compromised OAuth refresh token | Medium | High | 30-day cookie maxAge, 2-hour token expiration, mutex-protected refresh (`sf-connection.ts:150-194`). Logout does NOT revoke refresh token at Salesforce (`connection/route.ts:32-46`) — just clears cookie. | Medium | P2 |

**Risk Scoring Methodology:**
- **Likelihood**: Low (unlikely in next 12 months), Medium (possible), High (probable)
- **Impact**: Low (minor inconvenience), Medium (business disruption), High (regulatory action or significant financial loss), Critical (data breach requiring notification)
- **Residual Risk**: After current mitigations
- **Review cadence**: Quarterly for P1 risks, semi-annually for P2/P3

**Estimated effort:** 1-2 days to complete initial risk assessment. 2-4 hours quarterly for review.

---

### 1.3 Personnel Security

#### Current State Assessment

There is one employee: Jon Cambras. No background check has been conducted (self-employed founder). No security awareness training is documented. No access provisioning/deprovisioning process exists (there is no one to provision or deprovision). No termination procedures exist.

Min does have a 15-minute idle timeout (`use-idle-timeout.ts:17`) that returns the UI to a role selection screen, which provides a soft session boundary. The OAuth cookie persists for 30 days, but the application-level session resets after 15 minutes of inactivity.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No personnel security policy. Even with one employee, SOC 2 requires documented processes for hiring, training, and termination — because the auditor needs to know what will happen when employee #2 is hired.

**HIGH (required for Type I):**
- No documented security awareness training (even self-administered)
- No access review process (who has access to what, reviewed periodically)
- No documented compensating controls for the solo founder risk

**MEDIUM (required for Type II):**
- No background check process for future hires
- No onboarding security checklist

#### Remediation Plan

**Personnel Security Policy Template:**

1. **Pre-Hire Screening**
   - Background check required for all employees with access to client data (criminal, credit for roles handling financial data, employment verification)
   - Reference checks (minimum 2 professional references)
   - Security clearance not required but preferred for senior roles
   - Screening provider: recommended Sterling, Checkr, or GoodHire
   - **Solo Founder Compensating Control**: Document that the founder has not undergone a formal background check. Compensating controls include: customer audit rights (allowing customers to request evidence of security practices), automated technical controls that operate independently of any individual (encryption, logging, access controls), and quarterly self-assessment against the personnel security checklist.

2. **Security Awareness Training**
   - Annual security awareness training required for all personnel
   - Topics: phishing identification, password security, data handling, incident reporting, acceptable use, social engineering
   - Training must be documented with completion date and score
   - **Solo Founder Implementation**: Complete a recognized online security awareness course (KnowBe4, SANS Security Awareness, or Curricula). Document completion with certificate. Schedule annual renewal.
   - Estimated effort: 2-4 hours initially, 1-2 hours annually

3. **Access Provisioning and Deprovisioning**
   - All access requests documented with: requester, approver, systems, access level, business justification
   - Access granted on principle of least privilege
   - Access reviewed quarterly
   - Upon termination: all access revoked within 24 hours, all credentials rotated, all devices returned or wiped, all sessions terminated
   - **Current Access Inventory**:
     - GitHub repository: Jon Cambras (owner)
     - Vercel/hosting: Jon Cambras (admin)
     - Salesforce Connected App: Jon Cambras (admin)
     - Turso database: Jon Cambras (admin)
     - DocuSign integration: Jon Cambras (admin)
     - Domain/DNS: Jon Cambras (admin)
     - `.env.local` secrets: Jon Cambras (direct access)

4. **Solo Founder Compensating Controls**
   - All production mutations logged to Salesforce audit trail (immutable if validation rules configured)
   - Encryption keys stored in environment variables, not hardcoded (partially — dev fallback keys exist in source)
   - Customer-accessible audit trail provides external visibility
   - Quarterly access review: document all systems with access, verify necessity, rotate credentials

**Estimated effort:** 1 day to draft policy. 4 hours for initial security awareness training. 2 hours quarterly for access review.

---

### 1.4 Vendor Management

#### Current State Assessment

Min depends on the following vendors. None have documented vendor risk assessments:

| Vendor | Purpose | SOC 2 Certified | Data Shared | Criticality |
|--------|---------|-----------------|-------------|-------------|
| Salesforce | CRM integration (primary data source) | Yes (SOC 1, SOC 2 Type II) | Client PII via API (names, emails, phones, tasks, financial accounts — accessed via SOQL queries) | Critical |
| Vercel (target) | Application hosting | Yes (SOC 2 Type II) | Application code, environment variables, request logs | Critical |
| Turso (libSQL) | Database | SOC 2 in progress (verify current status) | Analytics snapshots (aggregate counts only — PII stripped via `sanitizeStatsForAnalytics()`), org schema mappings, event tracking | High |
| DocuSign | E-signature | Yes (SOC 1, SOC 2 Type II) | Client names, document content (via JWT bearer flow with RSA-SHA256 signing, `docusign/route.ts:29-37`) | High |
| Anthropic | LLM API | SOC 2 Type II (verify) | **No client data sent** — confirmed via codebase audit. No direct Anthropic API calls found in production code. AI coding tools used in development only. | Low (development tool) |
| GitHub | Source code hosting | Yes (SOC 2 Type II) | Source code, no client data | High |
| npm/pnpm registry | Package manager | No formal SOC 2 | No client data (dependency packages only) | Medium |
| Wealthbox CRM | CRM integration (planned — architecture stubs exist in `crm-adapter.ts`) | No SOC 2 info publicly available | No data shared yet (integration not implemented) | High (future) |
| BridgeFT | Custodial data aggregation (planned — referenced in executive summary and reconciliation architecture) | SOC 2 Type II certified | Will share custodial account data (account numbers, balances, positions, transaction history) | Critical (future) |

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No vendor risk assessments documented for any vendor. SOC 2 CC9.2 requires "The entity assesses and manages risks associated with vendors and business partners."
- No vendor management policy.

**HIGH (required for Type I):**
- No Data Processing Agreements (DPAs) with critical vendors
- No vendor security review cadence
- No process for evaluating new vendors before adoption

**MEDIUM (required for Type II):**
- No vendor incident notification process (how does Min learn if Salesforce has a breach?)
- No vendor SOC 2 report review process (Min should request and review vendor SOC 2 reports annually)

#### Remediation Plan

**Vendor Risk Assessment Template:**

For each critical vendor, document:
1. **Vendor Name and Contact**: Primary security contact
2. **Services Provided**: What the vendor does for Min
3. **Data Shared**: Specific data types transmitted to/from the vendor
4. **Data Classification**: Per Min's data classification policy
5. **Security Certifications**: SOC 2, ISO 27001, PCI DSS (as applicable)
6. **DPA Status**: Is a Data Processing Agreement in place? If not, what are the contractual data protection obligations?
7. **Subprocessors**: Does the vendor use subprocessors that handle Min's data?
8. **Incident Notification**: How will Min be notified of a security incident at the vendor? What is the SLA?
9. **Business Continuity**: What happens if the vendor goes down? What is Min's fallback?
10. **Review Date**: When was this assessment last reviewed?
11. **Risk Rating**: Low/Medium/High/Critical
12. **Compensating Controls**: If the vendor doesn't meet Min's requirements, what additional controls does Min implement?

**Priority Actions:**
1. Request SOC 2 Type II reports from Salesforce, Vercel, DocuSign, and GitHub (all should be available upon request)
2. Verify Turso's SOC 2 status; if not certified, document compensating controls (Min only stores aggregate analytics, no PII)
3. Execute DPAs with Salesforce and DocuSign (they handle client PII)
4. Document that Anthropic receives zero client data (confirmed by codebase audit — this is a significant positive finding)

**Estimated effort:** 2-3 days for initial vendor assessments. 1 day annually for review.

---

### 1.5 Change Management

#### Current State Assessment

Min has no documented change management process. The codebase is stored in GitHub (`JCambras/min-demo`). There are no GitHub Actions workflows, no CI/CD pipeline, no pre-commit hooks (no husky, lint-staged, or similar), and no automated deployment gates.

The development workflow appears to be: code locally (often with AI coding tools like Claude Code) → manual review → `git push` to main → deploy (presumably via Vercel's auto-deploy from main branch).

Testing infrastructure exists: Vitest is configured with 17 test files and 767 passing tests as of the assessment date. Tests cover compliance logic, SOQL sanitization, input validation, analytics PII scrubbing, CRM adapter, custodian rules, and API handlers. However, there is no evidence that tests are required to pass before deployment (no CI gate).

**Key finding regarding AI-generated code:** A significant portion of Min's codebase is written with AI coding tools. This is explicitly acknowledged in the project's evaluation documents and commit messages (Co-Authored-By headers reference Claude). AI-generated code is not inherently less secure, but it requires specific review processes that do not currently exist.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No documented change management policy. SOC 2 CC8.1 requires "The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives."
- No evidence that changes are reviewed before deployment to production.
- No separation between development and production environments (same branch, no staging).

**HIGH (required for Type I):**
- No CI/CD pipeline with automated testing gate
- No code review process (solo founder — cannot self-review for SOC 2 purposes without compensating controls)
- No rollback procedure documented
- No AI-generated code review policy

**MEDIUM (required for Type II):**
- No change advisory board or change approval process
- No post-deployment verification checklist
- No change log (beyond git commit history)

#### Remediation Plan

**Change Management Policy — Required Elements:**

1. **Change Categories:**
   - *Standard changes*: Routine changes that follow an established process (dependency updates, configuration changes). Pre-approved, documented post-deployment.
   - *Normal changes*: Feature additions, bug fixes, refactoring. Require review, testing, and approval before deployment.
   - *Emergency changes*: Security patches, critical bug fixes. May bypass normal review but require post-deployment review within 24 hours.

2. **Change Process (Normal Changes):**
   - Create branch from main
   - Implement change
   - All tests must pass (`pnpm test` — 767 tests)
   - Lint must pass (`pnpm lint`)
   - TypeScript compilation must pass (`pnpm build`)
   - For AI-generated code: additional review checklist (see below)
   - Create pull request with description of change, test plan, and risk assessment
   - **Solo founder compensating control**: Use a structured self-review checklist. Document the review in the PR description. For high-risk changes (authentication, encryption, data handling, API endpoints), engage a contract security reviewer quarterly.
   - Merge to main
   - Automated deployment via Vercel (implement)
   - Post-deployment smoke test

3. **AI-Generated Code Review Checklist:**
   - [ ] Review all generated code line-by-line (not just the AI summary)
   - [ ] Verify no hardcoded credentials, API keys, or secrets
   - [ ] Verify no new dependencies introduced without evaluation
   - [ ] Verify input validation on all new user-facing inputs
   - [ ] Verify no PII logging or exposure
   - [ ] Verify no new API endpoints without authentication/authorization
   - [ ] Verify no SQL/SOQL injection vectors
   - [ ] Run full test suite and verify passing
   - [ ] Document the AI tool used and the prompt (for audit trail)

4. **CI/CD Pipeline (Implement):**
   ```yaml
   # .github/workflows/ci.yml
   # Required checks before merge:
   # - pnpm test (all 767 tests pass)
   # - pnpm lint (zero errors)
   # - pnpm build (TypeScript compilation)
   # - npm audit (no critical vulnerabilities)
   ```

5. **Rollback Procedure:**
   - Vercel supports instant rollback to previous deployment
   - Document: how to identify a bad deployment, how to trigger rollback, who is authorized, post-rollback analysis process

**Estimated effort:** 2 days for policy documentation. 1 day for CI/CD pipeline setup. Ongoing: 15 minutes per change for review checklist.

---

## Phase 2: Security Controls (Common Criteria)

### 2.1 Access Control

#### Current State Assessment

**User Authentication:**
Min authenticates users via Salesforce OAuth 2.0 Authorization Code flow (`sf-connection.ts:198-257`). Users click "Connect to Salesforce," are redirected to Salesforce's login page, and return with an authorization code that Min exchanges server-side for access and refresh tokens. There is a fallback to client credentials flow from environment variables when OAuth is unavailable (`sf-connection.ts:121-147`).

Min does not have its own user authentication system (no email/password, no local user accounts). Authentication is delegated entirely to Salesforce. This means MFA enforcement depends on the customer's Salesforce org configuration, not Min.

**Session Management:**
- 15-minute idle timeout returns user to role selection screen (`use-idle-timeout.ts:17`)
- Activity events tracked: mousemove, mousedown, keydown, scroll, touchstart, click
- OAuth cookie persists for 30 days (`sf-connection.ts:75`)
- CSRF token cookie: 24-hour maxAge, sameSite=strict (`csrf/route.ts:17-18`)
- No concurrent session limit
- Logout clears cookie but does NOT revoke refresh token at Salesforce (`connection/route.ts:32-46`)

**Role-Based Access Control:**
Three roles defined in the type system (`types.ts:28`): `advisor`, `operations`, `principal`. Roles are selected client-side during setup. **Roles are NOT enforced server-side** — all authenticated requests are treated identically regardless of role. An advisor can access the same API endpoints as a principal.

**API Route Protection:**
- Session gate in proxy middleware requires valid Salesforce connection for most API routes (`proxy.ts:65-92`)
- Exempt routes: OAuth initiation/callback, CSRF token endpoint, PDF generation, connection status
- Rate limiting: 100 requests per 60 seconds per IP (`proxy.ts:20-34`)
- Origin checking: rejects cross-origin requests except OAuth callback (`proxy.ts:94-105`)

**Credential Storage:**
- OAuth tokens: AES-256-GCM encrypted in httpOnly cookies (`sf-connection.ts:49-56`)
- Encryption key: derived via `crypto.scryptSync()` from `SF_COOKIE_SECRET` env var with salt `"min-sf-salt"` and 32-byte output
- IV: 16 random bytes per encryption operation
- Format: `${iv_hex}:${tag_hex}:${encrypted_hex}`
- Dev fallback: hardcoded key with console warning if `SF_COOKIE_SECRET` not set (`sf-connection.ts:11-12`)
- DocuSign: RSA private key in `.env.local`, JWT bearer flow with RSA-SHA256 signing (`docusign/route.ts:29-37`)
- Salesforce client credentials: plaintext in `.env.local`
- No secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.)

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- **No server-side RBAC enforcement.** Roles exist in the type system but are not checked on any API endpoint. An operations user and a principal have identical server-side access. For a platform handling client SSNs and financial data, this is a material control gap. An auditor will flag this.
- **Dev fallback encryption keys in source code.** `sf-connection.ts:12` and `org-query.ts:110` contain hardcoded development keys. If `SF_COOKIE_SECRET` is not set in production, the fallback key is used — and it's visible in the source code. This means anyone with access to the GitHub repository could decrypt OAuth tokens.

**HIGH (required for Type I):**
- No MFA enforcement within Min. Min delegates authentication to Salesforce, which may or may not require MFA. Min should document this dependency and recommend (or require) that customers enable MFA in their Salesforce org.
- Logout does not revoke the Salesforce refresh token. Clearing the cookie prevents the browser from using the token, but the token itself remains valid at Salesforce until it expires.
- No secrets manager. All credentials stored as environment variables or in `.env.local`. No rotation mechanism, no access logging, no encryption at rest on disk.
- No access logging for authentication events (login, logout, failed attempts). The audit trail logs mutations but not authentication.

**MEDIUM (required for Type II):**
- Rate limiter is in-memory only. Resets on server restart. Not effective in a distributed/multi-instance deployment.
- 30-day cookie maxAge is long for a financial services application. Industry standard is 8-12 hours for active sessions.
- No concurrent session limits. A compromised token could be used from multiple locations simultaneously without detection.

**LOW (best practice):**
- CORS on `/api/embed/widget` allows `*` origin (`embed/widget` route). Should be restricted to known customer domains.
- Bearer token validation on `/api/embed/health` is a placeholder — comment says "in production, validate JWT" but no validation is implemented (`embed/health/route.ts:23`).

#### Remediation Plan

| Gap | Action | Effort | Priority |
|-----|--------|--------|----------|
| No server-side RBAC | Add role to encrypted session cookie, validate on each API request. Define permission matrix: which roles can access which endpoints. | 2-3 days | Critical |
| Dev fallback keys | Remove hardcoded dev keys. Require `SF_COOKIE_SECRET` in all environments. Fail loudly if not set. | 2 hours | Critical |
| No MFA enforcement | Document Salesforce MFA dependency. Add pre-connection check that warns if org doesn't enforce MFA. Consider adding Min-level MFA for high-risk operations (viewing SSNs, exporting data). | 1-2 days | High |
| No token revocation on logout | Call Salesforce's revoke endpoint (`/services/oauth2/revoke`) on logout. | 2 hours | High |
| No secrets manager | Migrate to Vercel Environment Variables (encrypted at rest) or a dedicated secrets manager. Remove `.env.local` from any backup/sync. | 1 day | High |
| No auth event logging | Log authentication events (login, logout, failed attempts) to the audit trail. Include IP address, user agent, timestamp. | 1 day | High |
| In-memory rate limiter | Use Vercel KV or Upstash Redis for distributed rate limiting. | 4 hours | Medium |
| Long cookie maxAge | Reduce to 8-12 hours. Add sliding expiration on activity. | 2 hours | Medium |

---

### 2.2 Network Security

#### Current State Assessment

**TLS/HTTPS:**
Min is a Next.js application deployed (target) on Vercel. Vercel provides automatic TLS termination with TLS 1.2+ for all domains. All Salesforce API calls use HTTPS (`sf-client.ts` — all fetch calls to `instanceUrl` which is always `https://`). DocuSign API calls use HTTPS (`docusign/route.ts`).

Cookies are marked `secure: true` in production (`sf-connection.ts:73`, `csrf/route.ts:16`, `org-query.ts:74`), ensuring they are only transmitted over HTTPS.

**Security Headers (implemented in `proxy.ts:121-140`):**
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-XSS-Protection: 1; mode=block` — legacy XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- PDF routes: `Cache-Control: no-store, no-cache, must-revalidate, private` — prevents caching of sensitive documents

**CORS:**
- Most API routes: no CORS headers (same-origin only, enforced by origin checking in `proxy.ts:94-105`)
- `/api/embed/health`: allows `*.lightning.force.com` (for Salesforce Lightning Web Components)
- `/api/embed/widget`: allows `*` origin (overly permissive)

**Rate Limiting:**
- In-memory sliding window: 100 requests per 60 seconds per IP (`proxy.ts:20-34`)
- IP detection via `x-forwarded-for` header
- Returns 429 with `Retry-After: 60` header

**DDoS Protection:**
- Vercel provides platform-level DDoS protection
- No application-level DDoS mitigation beyond rate limiting

#### Gap Analysis

**HIGH (required for Type I):**
- **No HSTS header.** `Strict-Transport-Security` is not set in `proxy.ts`. Without HSTS, a first-time visitor could be subject to a downgrade attack. This is a standard finding in security assessments.
- **No Content-Security-Policy (CSP) header.** Without CSP, the application is more vulnerable to XSS attacks. For a financial services application, CSP is expected.
- **No Permissions-Policy header.** Should restrict access to browser features (camera, microphone, geolocation) that Min doesn't use.

**MEDIUM (required for Type II):**
- CORS `*` on `/api/embed/widget` allows any origin to embed the widget. Should be restricted to customer domains.
- No WAF (Web Application Firewall). Vercel provides some protection, but a dedicated WAF (Cloudflare, AWS WAF) would provide additional defense-in-depth.

**LOW (best practice):**
- No network segmentation documentation. Vercel's serverless architecture provides implicit isolation, but this should be documented.

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| No HSTS | Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` to `proxy.ts` security headers | 30 minutes |
| No CSP | Add `Content-Security-Policy` header. Start with report-only mode to identify violations, then enforce. | 1 day |
| No Permissions-Policy | Add `Permissions-Policy: camera=(), microphone=(), geolocation=()` | 30 minutes |
| CORS `*` on widget | Replace with allowlist of customer domains | 1 hour |

---

### 2.3 Data Encryption

#### Current State Assessment

**Encryption at Rest:**

| Data Type | Encrypted at Rest? | Method | Location |
|-----------|-------------------|--------|----------|
| OAuth access/refresh tokens | Yes | AES-256-GCM with scrypt KDF | httpOnly cookie (`sf-connection.ts:49-56`) |
| Org schema mappings | Yes | AES-256-GCM with scrypt KDF | httpOnly cookie (`org-query.ts:58-111`) |
| CSRF tokens | Generated randomly | `crypto.getRandomValues()` (32 bytes) | httpOnly cookie (`csrf.ts:18-22`) |
| Client SSNs | **No** | Plaintext in Salesforce, plaintext in browser memory, masked in UI (`ClientForm.tsx:63`) | Salesforce CRM, browser memory |
| Client DOBs | **No** | Plaintext in Salesforce, plaintext in browser memory | Salesforce CRM, browser memory |
| Account numbers | **No** | Plaintext in Salesforce, last 4 shown in UI (`RightPane.tsx:133`) | Salesforce CRM, browser memory |
| Analytics snapshots | **No** | Plaintext in Turso (aggregate counts only — PII stripped) | Turso database |
| Org patterns | **No** | Plaintext in Turso (schema metadata, no PII) | Turso database |
| DocuSign RSA private key | **No** | Plaintext in `.env.local` | Filesystem |
| Salesforce credentials | **No** | Plaintext in `.env.local` | Filesystem |

**Encryption in Transit:**
- All external API calls use HTTPS (TLS 1.2+)
- Cookies marked `secure: true` in production
- Vercel provides automatic TLS termination

**Key Management:**
- `SF_COOKIE_SECRET`: 64-character hex string stored in `.env.local`
- Key derivation: `crypto.scryptSync(key, salt, 32)` — appropriate for password-based key derivation
- Salt: hardcoded `"min-sf-salt"` (not unique per deployment — weakness)
- Dev fallback key: hardcoded in source (critical weakness, as noted in 2.1)
- No key rotation policy
- No key access logging

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- **No field-level encryption for SSNs and account numbers.** Min handles SSNs (9-digit Social Security Numbers) — the single most sensitive PII identifier. These are stored plaintext in Salesforce and transmitted plaintext (over HTTPS) to the browser. While Salesforce provides platform-level encryption (Shield Platform Encryption) and HTTPS protects in transit, Min itself does not add field-level encryption. For a financial services SOC 2, auditors will specifically ask about SSN protection.

**HIGH (required for Type I):**
- Hardcoded encryption salt (`"min-sf-salt"`, `"min-mapping-salt"`). If an attacker obtains the `SF_COOKIE_SECRET`, all deployments using the same salt produce the same derived key. Salt should be unique per deployment or per cookie.
- No key rotation policy. The `SF_COOKIE_SECRET` has no documented rotation schedule.
- Database backups (Turso) encryption status unknown — depends on Turso's infrastructure.

**MEDIUM (required for Type II):**
- `.env.local` secrets are plaintext on disk. No disk encryption verification.
- No encryption key access logging.

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| No field-level encryption for SSNs | Min reads SSNs from Salesforce — encryption should happen at the Salesforce level (Shield Platform Encryption) or Min should avoid persisting SSNs and only display them transiently. Document which approach is used per customer. | 2-3 days |
| Hardcoded salt | Generate unique salt per deployment, store alongside `SF_COOKIE_SECRET` | 2 hours |
| No key rotation | Document key rotation procedure, schedule semi-annual rotation, implement graceful key transition (decrypt with old, re-encrypt with new) | 1 day |
| Dev fallback keys | Remove from source code (see 2.1) | 2 hours |

---

### 2.4 Logging and Monitoring

#### Current State Assessment

**Audit Logging System (`audit.ts`):**
Min has a purpose-built audit logging system that logs all mutation actions to Salesforce Task records with a `MIN:AUDIT` subject prefix. The system is designed with SEC Rule 17a-4 compliance awareness (referenced in code comments at `audit.ts:5`).

**What IS logged:**
- All write/mutation actions: confirmIntent, completeTask, recordComplianceReview, recordMeetingNote, recordFunding, sendDocusign, createTask, updateTask, triageResolve
- Audit entry fields: action, actor (advisor name), householdId, result (success/error), detail, durationMs, requestId (UUID)
- Subject line format: `MIN:AUDIT — {action} — {result}`
- Priority: "High" for errors, "Low" for successes
- Payload: first 2,000 characters of scrubbed payload

**What is NOT logged:**
- Read-only actions: searchContacts, searchHouseholds, getHouseholdDetail, queryTasks, queryFinancialAccounts (`audit.ts:32-38`)
- Authentication events: login, logout, failed authentication attempts
- Configuration changes
- Schema discovery operations
- Admin/system operations

**PII Scrubbing (`audit.ts:40-66`):**
- Fields scrubbed: ssn, dob, dateOfBirth, socialSecurityNumber, idNumber, bankAcct, routingNumber, accountNumber, lastFour, routingLastFour
- Scrubbing behavior: PII fields replaced with `[REDACTED]`, arrays replaced with `[N items]`, strings >100 chars truncated, nested objects recursively scrubbed
- This is a strong control — the audit trail contains actionable information without exposing PII.

**Structured Logger (`logger.ts`):**
- Application-level logging with format: `[ISO_TIMESTAMP] [LEVEL] [CONTEXT] Message`
- Three levels: info, warn, error
- Outputs to console (not persisted beyond Vercel's log retention)
- **Not PII-scrubbed** — data objects passed to logger are not sanitized

**Analytics (`analytics.ts`):**
- Separate from audit logging — tracks product usage metrics
- PII-scrubbed before persistence: only aggregate numeric counts stored
- PII key patterns blocked: name, email, phone, address, household, accountId, contactId, ssn
- 30+ test cases verify sanitization (`analytics-sanitization.test.ts`)

**Log Storage:**
- Audit logs: Salesforce Task records (retained per Salesforce org retention policy)
- Application logs: console output (retained per hosting provider — Vercel retains logs for limited period depending on plan)
- Analytics: Turso database (no retention limit configured)

**Request Tracing:**
- Unique `requestId` (UUID) generated per POST request (`route.ts:60`)
- Passed through audit logging, returned in API responses
- Enables correlation between browser → server → Salesforce → audit trail

**User-Facing vs. System-Level Audit Trail:**
Does Min's user-facing audit trail match the system-level audit trail? They are the **same system**. Both the COO-facing audit screen (visible in the Min UI) and the system-level audit trail read from the same Salesforce `MIN:AUDIT` Task records written by `audit.ts`. There is no separate "user-facing" trail — the UI is a filtered view of the authoritative audit store. When the COO reviews audit history in Min, they are querying the same Salesforce Task records that a SOC 2 auditor would examine.

However, application-level logs (`logger.ts` → console output) are a separate, ephemeral stream not visible to the COO or to end users. These logs capture operational events (errors, warnings, request timing) but are not part of the compliance audit trail. They are retained only for the duration of the hosting provider's log retention window (Vercel: 1 hour on free tier, 3 days on Pro). This creates a gap: if a security event is logged only to `logger.ts` and not to `audit.ts`, it is invisible to the user-facing audit trail and may be lost before forensic review.

**Recommendation:** Ensure all security-relevant events (authentication, authorization failures, configuration changes) are written to the `MIN:AUDIT` trail — not only to `logger.ts`.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- **Audit log fire-and-forget pattern.** Audit writes are asynchronous and failures are silently ignored (`audit.ts:117-147`). If the Salesforce API is down, audit records are permanently lost. SOC 2 requires reliable audit logging — "fire-and-forget" is a finding.
- **No authentication event logging.** Login, logout, and failed authentication attempts are not logged. SOC 2 CC6.1 requires monitoring of authentication events.

**HIGH (required for Type I):**
- No tamper-proofing on audit logs. Records are stored as Salesforce Tasks. Without validation rules preventing edits/deletes, the audit trail can be modified. The code recommends validation rules (`audit.ts:13-14`) but doesn't verify they're configured.
- No log retention policy. How long are logs retained? Are they retained for the SOC 2 observation period (12 months)? SEC Rule 204-2 requires certain records for 5 years.
- Application logs (console output) are ephemeral. Vercel's free tier retains logs for 1 hour; Pro tier for 3 days. Neither meets SOC 2 requirements.
- No real-time alerting for security events (failed auth attempts, unusual data access, API error spikes).
- Read-only actions not logged. While this reduces noise, SOC 2 auditors for financial services often expect data access logging (who viewed which client's data and when).

**MEDIUM (required for Type II):**
- Structured logger (`logger.ts`) does not scrub PII from data objects. If a developer passes a client object to `log.error()`, PII could appear in console logs.
- No centralized log aggregation (all logs are in different systems: Salesforce, Vercel console, Turso).
- Audit log audit: no monitoring of audit system health (is the audit system itself working?).

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| Fire-and-forget audit | Implement a write-ahead buffer: write audit entries to Turso first (synchronous), then replicate to Salesforce (async). Failed replications queued for retry. | 2-3 days |
| No auth logging | Add authentication event logging: login (source: oauth/env), logout, failed attempts, token refresh | 1 day |
| No tamper-proofing | Create Salesforce validation rule preventing edit/delete of `MIN:AUDIT` tasks. Verify during customer onboarding. | 2 hours |
| Ephemeral app logs | Configure log drain to external service (Datadog, Axiom, Betterstack). Retain for 12+ months. | 4 hours |
| No alerting | Configure alerts: >5 failed auth in 5 min, >10 errors in 1 min, audit write failure, API response time >10s | 1 day |
| No centralized logging | All logs → single aggregation service (Datadog recommended for SOC 2 compliance features) | 1 day |

---

### 2.5 Vulnerability Management

#### Current State Assessment

**Dependency Management:**
Min uses pnpm as its package manager. The `package.json` includes standard Next.js dependencies plus `@libsql/client`, `jspdf`, and `lucide-react`. No security-specific packages are used (no `helmet`, `cors`, or `csrf` libraries — all implemented manually in `proxy.ts` and `csrf.ts`).

There is no evidence of automated dependency scanning (no Dependabot configuration, no Snyk integration, no npm audit in CI). No `.github/` directory exists, confirming no GitHub Actions workflows.

**Dependency Update Frequency:**
`package.json` was last modified February 15, 2026 (5 days before this assessment). Based on git history, dependencies are updated roughly weekly — 5 modifications to `package.json` in the 16 days prior to assessment. This is a reasonable cadence for a solo developer but is informal and undocumented.

**Current Vulnerability Status:**
`pnpm audit` at assessment time reveals **2 HIGH vulnerabilities** in `jspdf@4.1.0`:
1. **PDF injection via AcroForm** — attacker-controlled input can inject arbitrary AcroForm fields into generated PDFs
2. **PDF injection via addJS** — attacker-controlled input can inject JavaScript into generated PDFs via the `addJS` method

Patch available: `jspdf>=4.2.0`. Min uses jspdf for client-facing PDF generation (compliance reports, household summaries), making this a material finding — an attacker who can influence PDF content could inject malicious AcroForm fields or JavaScript into documents sent to RIA firm clients. No automated scanning is configured to catch vulnerabilities like these proactively.

**Testing:**
- 17 test files, 767 passing tests (Vitest)
- Tests cover: SOQL sanitization, input validation, PII scrubbing, compliance engine, CRM adapter, custodian rules, API handlers, analytics sanitization, schema discovery
- No security-specific tests (penetration test scenarios, injection attempts, auth bypass attempts)

**Penetration Testing:**
No evidence of penetration testing. No pentest reports.

**Vulnerability Disclosure:**
No vulnerability disclosure policy. No security.txt file. No bug bounty program.

**AI Tool Supply Chain:**
Min is substantially built with AI coding tools (Claude Code). These tools generate code that is committed to the repository. There is no documented review process specific to AI-generated code.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No vulnerability scanning process. SOC 2 CC7.1 requires "The entity identifies and evaluates risks associated with the operation of the system."

**HIGH (required for Type I):**
- No automated dependency scanning (Dependabot, Snyk, or `npm audit` in CI)
- No penetration test. While not strictly required by SOC 2, auditors for financial services companies universally expect it.
- No vulnerability disclosure policy

**MEDIUM (required for Type II):**
- No security-specific test cases
- No AI-generated code review policy (see Section 1.5)
- No documented process for evaluating and patching vulnerabilities

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| No dependency scanning | Enable GitHub Dependabot alerts + Dependabot PRs. Add `npm audit` to CI pipeline. | 2 hours |
| No penetration test | Engage a penetration testing firm (Cobalt, HackerOne, Synack). Budget: $5,000-$15,000 for initial assessment. Focus areas: OAuth flow, SOQL injection, CSRF bypass, session management, cross-tenant access. | 1-2 weeks (external) |
| No vulnerability disclosure | Create `/.well-known/security.txt` with contact information. Create `SECURITY.md` in GitHub repo. | 2 hours |
| No security tests | Add test cases for: SOQL injection with malicious input, CSRF token validation edge cases, session expiration enforcement, role-based access denial | 2-3 days |

---

### 2.6 Incident Response

#### Current State Assessment

Min has no written incident response plan. There is no defined severity classification, no escalation procedures, no communication templates, no forensic procedures, and no post-incident review process. As a solo founder, Jon is the entire incident response team.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No written incident response plan. SOC 2 CC7.3 requires "The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives (security incidents) and, if so, takes actions to prevent or address such failures."

**HIGH (required for Type I):**
- No severity classification system
- No communication templates for customers or regulators
- No incident log / tracking system
- No post-incident review process

**MEDIUM (required for Type II):**
- No tabletop exercise conducted
- No backup incident responder (solo founder is a single point of failure)

#### Remediation Plan — Incident Response Plan for Min

**Severity Classification:**

| Level | Description | Examples | Response SLA | Notification |
|-------|-------------|----------|-------------|-------------|
| SEV-1 (Critical) | Confirmed data breach, unauthorized access to client PII, system compromise | Compromised OAuth token, exposed SSNs, unauthorized data export | Immediate | Customers within 72 hours, SEC if required by Reg S-P |
| SEV-2 (High) | Potential breach under investigation, sustained outage during business hours | Unusual API access patterns, audit system failure, prolonged Salesforce integration failure | Within 2 hours | Affected customers within 24 hours |
| SEV-3 (Medium) | Security vulnerability discovered, minor data integrity issue | Failed pentest finding, dependency vulnerability, incorrect data displayed for single household | Within 24 hours | Customers on next scheduled communication |
| SEV-4 (Low) | Security improvement needed, minor policy violation | Expired credentials, missed access review, minor configuration drift | Within 1 week | Internal tracking only |

**Scenario-Specific Response Plans:**

**Scenario 1: Min displays wrong client's financial data**
1. Immediately disable the affected screen/feature
2. Determine scope: how many clients affected? How long was incorrect data displayed?
3. Review audit trail for affected households (requestId correlation)
4. Identify root cause: schema discovery mapping error, SOQL query defect, Salesforce data issue, or reconciliation failure
5. Fix root cause, verify fix in test environment
6. Notify affected firm(s) with: what happened, how many clients affected, what data was exposed, what corrective actions taken
7. Document in incident log
8. Post-incident review within 5 business days

**Scenario 2: OAuth token for a firm's Salesforce instance is compromised**
1. Immediately revoke the compromised token at Salesforce (`/services/oauth2/revoke`)
2. Rotate `SF_COOKIE_SECRET` (all active sessions will be invalidated)
3. Audit all API calls made with the compromised token (Salesforce login history + Min audit trail)
4. Determine how the token was compromised (cookie theft, MITM, insider, server breach)
5. Notify the affected firm: what data the token had access to, what queries were made
6. If PII was accessed: follow SEV-1 data breach notification procedures
7. Implement additional controls to prevent recurrence (shorter token lifetime, IP binding, etc.)

**Scenario 3: BridgeFT reports data breach affecting custodial account data that flows into Min**
1. Determine what data Min received from BridgeFT during the breach window
2. Identify which Min customers are affected
3. Isolate affected data — flag as potentially compromised in Min's systems
4. Coordinate with BridgeFT on timeline, scope, and notification
5. Notify affected customers: what data was compromised, Min's role as a data processor (not controller), BridgeFT's status as the source of breach
6. Preserve all logs and audit trails for the breach window
7. Cooperate with regulatory inquiries

**Scenario 4: Founder's laptop is stolen with local development credentials**
1. Immediately rotate all credentials in `.env.local`: Salesforce client secret, Salesforce password, SF_COOKIE_SECRET, DocuSign private key, Turso auth token
2. Revoke all active Salesforce connected app sessions
3. Verify no production data was cached on the laptop (check for local.db with production data, browser cache, etc.)
4. Enable remote wipe on laptop (if configured)
5. Review GitHub for any commits containing secrets
6. Notify customers if production credentials were compromised
7. Implement: full-disk encryption requirement, secrets manager (not `.env.local`), device management policy

**Scenario 5: Regulatory inquiry about Min's data handling practices**
1. Engage legal counsel immediately
2. Preserve all relevant records (audit logs, system logs, configuration, code repository — litigation hold)
3. Prepare data flow documentation (what data Min receives, processes, stores, and transmits)
4. Compile customer list and data inventory
5. Respond within regulatory deadline (typically 30 days for SEC, varies by state)
6. Cooperate fully while protecting privileged communications
7. Document all interactions with regulators

**Solo Founder Contingency:**
- Designate a trusted external contact (attorney, advisor, or contract security professional) who can initiate incident response if the founder is unavailable or is the compromised party
- Pre-stage: this person should have access to the hosting dashboard (Vercel), the ability to revoke Salesforce connected app tokens, and the incident response plan document
- Document this arrangement and test it semi-annually

**Forensic Procedures:**

For SEV-1 and SEV-2 incidents, the following evidence preservation steps must be executed before any remediation:

1. **Snapshot logs immediately:** Export Salesforce `MIN:AUDIT` Task records for the incident window. Export Vercel application logs (before they rotate). Export Turso analytics records for affected `org_id`s.
2. **Freeze deployments:** Halt all deployments via Vercel dashboard. No code changes until forensic capture is complete.
3. **Preserve git state:** Tag the current `HEAD` as `incident-{YYYY-MM-DD}-{SEV}`. Do not force-push, rebase, or amend any commits.
4. **Capture Salesforce login history:** Export the affected org's login history (Setup → Login History) covering the incident window. This shows all API and UI access.
5. **Image affected systems:** If a device is suspected compromised, create a forensic disk image before wiping. Use `dd` or a commercial forensic tool (FTK Imager, EnCase).
6. **Chain of custody documentation:** For each piece of evidence, record: what was collected, when, by whom, hash (SHA-256) of the collected artifact, and where it is stored. Use a dedicated evidence log spreadsheet.
7. **External forensics engagement:** For SEV-1 incidents, engage an external forensics firm within 24 hours. Pre-identify a forensics partner (recommended: CrowdStrike Services, Mandiant, or Kroll) and have an engagement letter on file.

**Communication Templates:**

*Template 1 — Customer Breach Notification:*
```
Subject: Security Incident Notification — Min

Dear [Customer Name],

We are writing to inform you of a security incident affecting your firm's data
processed by Min.

What happened: [Brief description — e.g., "On [DATE], we detected unauthorized
access to [SYSTEM]. The access occurred between [START] and [END]."]

What data was affected: [Specific data types — e.g., "Client names and email
addresses for approximately [N] households in your Salesforce org."]

What we have done: [Actions taken — e.g., "We immediately revoked the
compromised credentials, engaged an external forensics firm, and implemented
additional monitoring."]

What you should do: [Recommended actions — e.g., "We recommend reviewing your
Salesforce login history for the period [START] to [END] and notifying affected
clients per your firm's breach notification procedures."]

Next steps: [Timeline — e.g., "We will provide a full forensic report within
[N] business days. Our next update will be on [DATE]."]

Contact: [Name, email, phone for incident coordinator]

Sincerely,
Jon Cambras, Founder — Min
```

*Template 2 — Regulatory Notification:*
```
Subject: Data Breach Notification — Min (Service Provider to SEC-Registered RIAs)

To: [State Attorney General / SEC / Applicable Regulator]

Reporting Entity: Min ([Address])
Date of Discovery: [DATE]
Date of Incident: [DATE or RANGE]
Number of Affected Individuals: [COUNT or "Under Investigation"]
Types of Information Involved: [List — e.g., "Names, Social Security Numbers,
financial account numbers"]
Description of Incident: [Narrative]
Steps Taken to Address: [Remediation summary]
Contact Information: [Name, title, phone, email]
```

*Template 3 — Internal Incident Report:*
```
INCIDENT REPORT — [INCIDENT ID]

Severity: [SEV-1/2/3/4]
Status: [Open / Investigating / Contained / Resolved / Closed]
Reported by: [Name]    Date/Time Discovered: [ISO 8601]
Incident Commander: [Name]

Timeline:
  [TIMESTAMP] — [Event description]
  [TIMESTAMP] — [Event description]

Root Cause: [Description — or "Under Investigation"]
Impact: [Systems affected, data affected, customers affected]
Remediation: [Actions taken and planned]
Evidence Collected: [List with SHA-256 hashes]
Lessons Learned: [Post-incident — to be completed after resolution]
Follow-up Actions: [Action items with owners and due dates]
```

**Estimated effort:** 2-3 days to write the full IRP. 4 hours for a tabletop exercise. Semi-annual review and test.

---

## Phase 3: Availability Controls

### 3.1 Infrastructure

#### Current State Assessment

Min is a Next.js 16.1.6 application targeting Vercel for deployment. The application runs on Node.js runtime (not Edge — confirmed by `proxy.ts` using Node.js `crypto` module).

**Current Infrastructure:**
- Hosting: Vercel (serverless functions + static assets + CDN)
- Database: Turso (libSQL — cloud SQLite-compatible database)
- CRM Integration: Salesforce (via REST API with OAuth 2.0)
- E-Signature: DocuSign (via JWT bearer flow)
- No multi-region configuration
- No load balancing configuration (Vercel handles this automatically)
- No health check endpoint for infrastructure monitoring (the `/api/embed/health` endpoint checks household health, not system health)

**Uptime:**
- Not currently measured. No monitoring configured. No status page.
- No SLA defined for customers.

#### Gap Analysis

**HIGH (required for Type I):**
- No system health monitoring. No alerts for downtime, error rate spikes, or performance degradation.
- No defined SLA. Financial services customers will require 99.9% uptime minimum.
- No status page for customer visibility into system health.

**MEDIUM (required for Type II):**
- No multi-region deployment (single region creates geographic risk)
- No documented infrastructure architecture diagram
- No capacity planning

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| No monitoring | Implement uptime monitoring (Better Uptime, Pingdom, or Vercel Analytics). Monitor: application health, API response time, error rate, Salesforce integration health. | 4 hours |
| No SLA | Define internal SLA targets: 99.9% uptime for application, 99.5% for integrations (dependent on Salesforce/DocuSign availability). Document in customer agreements. | 4 hours |
| No status page | Create public status page (Instatus, Statuspage, or Better Uptime's built-in). Categories: Application, Salesforce Integration, DocuSign Integration, Database. | 2 hours |
| No system health endpoint | Create `/api/health` endpoint checking: application running, database reachable, Salesforce connection valid. Use for monitoring and load balancer health checks. | 4 hours |

---

### 3.2 Backup and Recovery

#### Current State Assessment

**Database (Turso):**
- Stores analytics snapshots (aggregate counts), org schema patterns, and usage events
- No PII in Turso (confirmed by analytics sanitization — only allowlisted numeric fields stored)
- No explicit backup configuration in application code
- Turso's cloud service likely provides automatic backups (verify with vendor)
- Local development uses `file:local.db` — no backup

**Salesforce Data:**
- Min reads from Salesforce; it does not independently store CRM data
- Audit logs are written to Salesforce Task records — backup depends on Salesforce's backup/restore
- Salesforce provides weekly export and real-time replication options

**Source Code:**
- GitHub repository (version controlled)
- No evidence of additional backup beyond GitHub

**RPO/RTO:**
- Not defined. No documented recovery objectives.

#### Gap Analysis

**HIGH (required for Type I):**
- No documented RPO/RTO targets
- No verified backup/restore process for Turso database
- No disaster recovery plan

**MEDIUM (required for Type II):**
- No backup testing (has a restore been tested?)
- Audit log recovery depends entirely on Salesforce — if a customer's Salesforce org is corrupted, Min's audit trail is lost

#### Remediation Plan

**Recovery Objectives:**
| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| RPO (data loss tolerance) | Unknown | < 1 hour for financial data, < 24 hours for analytics | Must implement backup schedule |
| RTO (downtime tolerance) | Unknown | < 4 hours for application, < 8 hours for full recovery | Must implement recovery procedures |

**Actions:**
1. Configure Turso automated backups (verify vendor capability, enable if available)
2. Implement backup-to-secondary-store for audit logs (write to both Salesforce and Turso/external store)
3. Document restore procedure and test quarterly
4. Create disaster recovery runbook

**Estimated effort:** 1-2 days

---

### 3.3 Business Continuity

#### Current State Assessment

Min has no documented business continuity plan.

**Dependency Failure Analysis:**

| Dependency | Failure Mode | Current Behavior | Documented? |
|-----------|-------------|------------------|------------|
| Salesforce API | API down or unreachable | 30-second timeout per request, 2 retries with exponential backoff (500ms, 1000ms). After all retries exhausted: error displayed to user. No cached fallback. | No |
| Salesforce API | Slow response | Timeout at 30 seconds, retry logic. Loading spinner shown to user. | No |
| DocuSign API | API down | JWT bearer token request fails. DocuSign features unavailable. | No |
| Turso database | Database unreachable | Analytics and org patterns unavailable. Core features (Salesforce integration) still functional — Turso is not in the critical path. | No |
| Anthropic API | API down | **No impact** — Min does not call Anthropic in production. AI is a development tool, not a runtime dependency. | Not documented |
| Vercel hosting | Platform outage | Complete application unavailable. No multi-provider failover. | No |
| Founder unavailability | Solo founder is ill, compromised, or unreachable | Complete inability to respond to incidents, deploy fixes, or manage infrastructure. | No |

**Positive finding:** Min's architecture has natural resilience. The most critical data (client records, financial accounts) lives in Salesforce, not in Min. If Min goes down, the data is safe in Salesforce. Min is a view/workflow layer on top of Salesforce — not a system of record.

**Negative finding:** Min has no demo mode fallback documented as a business continuity measure. The codebase includes a demo mode (`demo-context.tsx`) that activates when `sfConnected === false`, but this is a development feature, not a documented continuity strategy.

#### Gap Analysis

**HIGH (required for Type I):**
- No business continuity plan
- No documented graceful degradation strategy
- Solo founder is a single point of failure for all operational and security functions

**MEDIUM (required for Type II):**
- No failover for hosting provider
- No documented communication plan for outages (how are customers notified?)

#### Remediation Plan

**Business Continuity Plan Outline:**

1. **Critical Functions**: Compliance review, triage queue, audit trail, DocuSign integration
2. **Maximum Tolerable Downtime**: 4 hours during business hours (9 AM - 5 PM ET)
3. **Degradation Hierarchy**:
   - Level 1 (Salesforce down): Show cached data with "Data as of [timestamp]" warning. Queue mutations for replay.
   - Level 2 (Min application down): Redirect customers to Salesforce directly. Provide emergency contact.
   - Level 3 (Founder unavailable): Pre-designated contact can access Vercel dashboard to restart/rollback.
4. **Communication**: Status page (see 3.1), email notification to affected customers within 1 hour
5. **Recovery**: Follow disaster recovery runbook (see 3.2)
6. **Testing**: Semi-annual tabletop exercise

**Estimated effort:** 1-2 days

---

## Phase 4: Processing Integrity Controls

### 4.1 Data Accuracy

#### Current State Assessment

**CRM Data Accuracy:**
Min reads data from Salesforce via SOQL queries. The data displayed in Min is a direct reflection of what exists in Salesforce — Min does not transform, aggregate, or recompute CRM data beyond what the SOQL query returns. If Salesforce has correct data, Min displays correct data.

Min's schema discovery engine (`schema-discovery.ts`, 1,440 lines) auto-classifies Salesforce org configurations with confidence scoring. When confidence is below 0.70, Min triggers manual mapping (`isLowConfidence()` at line 159-162) to ensure the correct Salesforce objects are queried.

**Reconciliation:**
Min has a reconciliation endpoint (`reconciliation/route.ts`) that compares CRM household data against custodial account data using fuzzy matching (exact match → 1.0, substring → 0.8, word overlap scoring). Match categories: Matched (≥0.8), Mismatch (0.5-0.8), Orphan-Custodial, Orphan-CRM. This provides a mechanism for detecting data drift between systems.

**BridgeFT Custodial Data Verification (Future):**
BridgeFT integration is not yet implemented. Min's architecture references BridgeFT as the target for custodial data aggregation — the reconciliation endpoint (`reconciliation/route.ts`) is designed to compare CRM household data against custodial account data, but the custodial data source is not yet connected. When BridgeFT integration is implemented, the following verification controls should be in place:

1. **Hash-based record comparison:** Compute SHA-256 hashes of canonical record representations at both BridgeFT and Min. Compare hashes to detect any transformation errors during data ingestion.
2. **Timestamp reconciliation:** Verify that BridgeFT's `lastUpdated` timestamp for each account matches Min's `receivedAt` timestamp within an acceptable skew window (recommended: ≤5 minutes).
3. **Count verification:** After each sync, compare `SELECT COUNT(*)` of custodial accounts in BridgeFT's response against records stored/displayed in Min. Alert if counts diverge.
4. **Automated drift detection:** Schedule daily reconciliation runs (outside market hours) comparing all BridgeFT-sourced records against the CRM. Flag and alert on: new orphan records, disappeared records, and field-level value changes not attributable to legitimate updates.

**Current status:** N/A — assessed as a future risk. BridgeFT is SOC 2 Type II certified, which provides baseline assurance for their data handling. However, Min must independently verify data integrity at the integration boundary once the connection is live.

**Compliance Engine Accuracy:**
The compliance engine (`compliance-engine.ts`, 576 lines) is 100% deterministic. Compliance checks use keyword matching against Salesforce task subjects and descriptions — no LLM involvement. 20 built-in checks map to specific regulatory requirements (FINRA 2090, FINRA 4512, USA PATRIOT Act CIP, Reg BI, DOL PTE 2020-02, SEC Rule 17a-14, Reg S-P, NACHA). Evidence collection is metadata-based (contact count, field population status, task completion counts), not PII-based.

**Custodian Knowledge Base:**
The custodian rules engine (`custodian-rules.ts`, 1,711 lines) contains document requirements, NIGO risk assessments, and prevention strategies for Schwab, Fidelity, and Pershing across 8 account types. These rules are hardcoded — updates require a code change. There is no automated process for detecting when a custodian changes form requirements.

#### Gap Analysis

**HIGH (required for Type I):**
- No automated data reconciliation schedule. The reconciliation endpoint exists but is not called automatically. Data drift could go undetected for extended periods.
- No custodian rules update process. When Schwab changes a form requirement, the code must be manually updated. No monitoring for custodian document changes.

**MEDIUM (required for Type II):**
- No data accuracy SLA (what is the acceptable error rate?)
- No mechanism for users to report data accuracy issues directly within Min
- Confidence threshold of 0.70 is hardcoded — should be configurable per customer

**LOW (best practice):**
- Custodian rules should reference version/effective dates for traceability
- Reconciliation results should be logged to the audit trail

#### Remediation Plan

| Gap | Action | Effort | Priority |
|-----|--------|--------|----------|
| No automated reconciliation schedule | Implement daily automated reconciliation run (outside market hours, e.g., 2 AM ET). Log results to `MIN:AUDIT` trail. Alert on drift exceeding configurable threshold (recommended: >1% mismatch rate). | 2-3 days | High |
| No custodian rules update process | Create a quarterly custodian rules review checklist. Subscribe to Schwab, Fidelity, and Pershing document update notifications. Add `effectiveDate` and `version` fields to `custodian-rules.ts` rule objects. | 1-2 days | High |
| No data accuracy SLA | Define accuracy SLA: ≤0.1% field-level error rate for financial data, ≤1% for contact data. Measure via reconciliation output. | 4 hours | Medium |
| No user-reported accuracy mechanism | Add "Report Data Issue" button in household detail view. Route to Salesforce Case for tracking and resolution. | 1 day | Medium |
| Hardcoded confidence threshold | Move 0.70 confidence threshold to org-level configuration (Turso `org_patterns` table). Allow customer-specific tuning during onboarding. | 4 hours | Medium |
| BridgeFT verification controls | Implement hash-based comparison, count verification, timestamp reconciliation, and drift detection (see BridgeFT section above). | 3-5 days (when integration is built) | High (future) |

**Estimated effort:** 5-7 days for current gaps. BridgeFT controls deferred until integration is implemented.

---

### 4.2 Data Completeness

#### Current State Assessment

**Pagination:**
Min implements offset-based pagination for household listings (`org-query.ts:303-320`). Search results use N+1 pattern to detect `hasMore` (request limit+1 records, return limit, set hasMore=true if extra record exists). This is a correct approach.

**Partial Sync Failure:**
Schema discovery wraps each API call in try/catch and captures errors in `bundle.errors` array (`schema-discovery.ts:138, 458`). Non-fatal errors are logged and processing continues (`schema-discovery.ts:549-568`). This means a failed query for one object type (e.g., Financial Accounts) doesn't prevent discovery of other object types (e.g., Contacts, Tasks).

However, if a data query partially fails (e.g., Salesforce returns 100 of 500 records before timeout), Min's current architecture would display the 100 records without indicating that data is incomplete. The retry logic (`sf-client.ts:100-150`) would retry the failed request, but if retries are exhausted, partial data is returned.

**Cross-Source Record Mismatch Handling:**
When records exist in one source but not another, Min's behavior varies by direction:

- **CRM record with no custodial match (Orphan-CRM):** If a Salesforce contact/household has no matching custodial account, Min displays the Salesforce data without flagging the discrepancy to the user. The reconciliation endpoint (`reconciliation/route.ts`) categorizes these as "Orphan-CRM" internally, but this classification is not surfaced proactively in the UI. An advisor viewing a household with zero custodial accounts receives no indication that this might be an error vs. a legitimately non-custodied household.

- **Custodial record with no CRM match (Orphan-Custodial):** When BridgeFT integration is implemented, custodial accounts that don't match any Salesforce household will be categorized as "Orphan-Custodial." These represent a higher risk — an unlinked custodial account means financial data exists that no one at the firm is monitoring through Min.

- **Partial match (Mismatch, 0.5-0.8 confidence):** The reconciliation endpoint flags these but they are not surfaced to users automatically. A mismatch could indicate a name change (marriage, legal change), a data entry error, or a genuinely different person — all of which have different regulatory implications.

**Gap:** Orphan and mismatch records should be surfaced in a dedicated "Reconciliation Dashboard" with actionable categories: confirm match, create link, flag for review. Without this, data completeness gaps accumulate silently.

#### Gap Analysis

**HIGH (required for Type I):**
- No explicit completeness indicator. When Min displays data, there is no visual signal indicating whether all data was successfully retrieved or only partial data is shown.

**MEDIUM (required for Type II):**
- No record count verification (compare count from SOQL `COUNT()` query against actual records returned)
- No automated completeness check on sync operations

#### Remediation Plan

| Gap | Action | Effort | Priority |
|-----|--------|--------|----------|
| No completeness indicator | Add a "Data Status" badge to household views: green (all queries succeeded), yellow (partial data — some queries failed after retries), red (critical data missing). Persist status per query in React state. | 1-2 days | High |
| No record count verification | Before displaying results, issue a parallel `SELECT COUNT()` SOQL query. Compare against `records.length`. If count > records returned, display "Showing X of Y records" with a "Load All" option. | 1 day | Medium |
| No automated completeness check | Add post-sync validation: after schema discovery completes, verify all expected object types returned data. Log completeness percentage to audit trail. Alert if completeness <95%. | 1 day | Medium |

**Estimated effort:** 3-4 days total.

---

### 4.3 Data Timeliness

#### Current State Assessment

**Freshness Tracking:**
- Schema discovery records `discoveredAt: ISO timestamp` (`schema-discovery.ts:94`)
- OAuth connection records `connectedAt` timestamp (`sf-connection.ts:29-30`)
- Token expiration tracked via `expiresAt` field
- Household staleness: compliance engine calculates `daysSinceCreation` and warns if >365 days without review (`compliance-engine.ts:464-477`)
- Task recency: schema discovery queries `WHERE CreatedDate = LAST_N_DAYS:90` to assess data activity

**Staleness Thresholds:**
- No maximum staleness threshold exists. If Salesforce data is 72 hours old (e.g., due to a sync issue), Min would display it without warning.
- No freshness badge on data (e.g., "Last synced: 2 minutes ago" vs. "Last synced: 3 days ago")

#### Gap Analysis

**HIGH (required for Type I):**
- No freshness indicator visible to users. When was this data last confirmed accurate?
- No maximum staleness threshold. Min should refuse to display data older than a configurable maximum (e.g., 24 hours for financial data, 72 hours for contact data).

**MEDIUM (required for Type II):**
- Freshness timestamps conflate "when Min last queried" with "when Salesforce data was last modified." These are different events.

#### Remediation Plan

| Gap | Action | Effort | Priority |
|-----|--------|--------|----------|
| No freshness indicator | Add "Last synced: [relative time]" badge to every data view. Color-code: green (<5 min), yellow (5-60 min), orange (1-24 hr), red (>24 hr). | 1 day | High |
| No maximum staleness threshold | Implement configurable staleness ceiling: refuse to display financial data older than 24 hours, contact data older than 72 hours. Show "Data is stale — please refresh" with a manual refresh button. | 1 day | High |
| Conflated freshness timestamps | Track two separate timestamps: `queriedAt` (when Min last fetched from Salesforce) and `modifiedAt` (Salesforce's `LastModifiedDate` from the record). Display both to the user on hover. | 4 hours | Medium |

**Estimated effort:** 2-3 days total.

---

### 4.4 AI Recommendation Integrity

#### Current State Assessment

**Critical Finding: Min's compliance engine is 100% deterministic.**

Despite being described as an "AI workflow orchestration platform," Min's compliance checks, triage scoring, document requirements, and remediation recommendations are all deterministic logic — not LLM-generated. The codebase confirms:

- Compliance checks: keyword matching against task subjects/descriptions (`compliance-engine.ts:254-275`)
- Triage scoring: rule-based urgency calculation with configurable thresholds (`home-stats.ts`)
- Document requirements: hardcoded per custodian per account type (`custodian-rules.ts`)
- Remediation steps: pre-configured action sequences with timelines (`compliance-engine.ts:35-110`)

**No Anthropic API calls exist in production code.** AI coding tools are used in development only. Min does not send client data to any LLM service.

This is a significant positive finding for SOC 2. Deterministic systems are auditable, testable, and reproducible. LLM-based systems require additional controls for output validation, hallucination detection, and prompt injection prevention — none of which Min needs.

**Test Coverage:**
- 50+ test cases for compliance keyword matching (`keyword-mapping.test.ts`, 274 lines)
- 201 test cases for custodian rules (`custodian-rules.test.ts`)
- 35 test cases for sprint/timeline logic (`avery-sprint.test.ts`)
- Total: 767 tests across 17 files

#### Gap Analysis

**LOW (best practice):**
- Document explicitly (in customer-facing materials and SOC 2 documentation) that Min's compliance engine is deterministic, not AI-generated. This eliminates an entire category of SOC 2 concerns.
- If LLM features are added in the future, implement: output validation, human-in-the-loop review, prompt injection prevention, and PII scrubbing before LLM transmission.

---

## Phase 5: Confidentiality Controls

### 5.1 Data Classification

#### Current State Assessment

Min has no formal data classification policy. However, the codebase implicitly classifies data through differential treatment:

| Data Type | Implicit Classification | Evidence of Protection |
|-----------|----------------------|----------------------|
| OAuth tokens | Critical | AES-256-GCM encryption, httpOnly cookies, secure flag |
| Org mappings | High | AES-256-GCM encryption, httpOnly cookies |
| Client SSNs | Critical | Masked in UI (password field), scrubbed from audit logs |
| Client DOBs | High | Scrubbed from audit logs |
| Bank account numbers | High | Last 4 digits only in UI, scrubbed from audit logs |
| Client names/emails | Internal | Not scrubbed from UI but excluded from analytics |
| Task subjects | Internal | Included in audit logs (not scrubbed) |
| Aggregate analytics | Internal | PII stripped before storage, only numeric counts |
| Compliance check results | High | Ephemeral (UI only), not persisted to Min's database |
| Custodian rules | Internal | Hardcoded in source, no PII content |

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No formal data classification policy document. The implicit classification in code is good but must be formalized.

**HIGH (required for Type I):**
- No data inventory document (what data Min processes, where it's stored, how it's protected, retention period)

#### Remediation Plan — Data Classification Matrix

The following matrix formalizes Min's implicit data classifications into a SOC 2-ready document. This table should be maintained as a living document and reviewed quarterly.

| Data Type | Classification | Storage Location | Encryption at Rest | Encryption in Transit | Retention Period | Access Controls | Disposal Method |
|-----------|---------------|-----------------|-------------------|---------------------|-----------------|----------------|----------------|
| Client SSNs | **Confidential** | Salesforce (firm's org) — transient in browser memory | Salesforce Shield (if customer-enabled); not encrypted by Min | TLS 1.2+ (HTTPS) | Per firm's Salesforce retention; not persisted by Min | OAuth-authenticated users; masked in UI by default; scrubbed from audit logs | Cleared on browser session end; no Min-side deletion needed |
| Client DOBs | **Confidential** | Salesforce (firm's org) — transient in browser memory | Salesforce Shield (if customer-enabled); not encrypted by Min | TLS 1.2+ (HTTPS) | Per firm's Salesforce retention; not persisted by Min | OAuth-authenticated users; scrubbed from audit logs | Cleared on browser session end |
| Bank account numbers | **Confidential** | Salesforce (firm's org) — transient in browser memory | Salesforce Shield (if customer-enabled); not encrypted by Min | TLS 1.2+ (HTTPS) | Per firm's Salesforce retention; not persisted by Min | OAuth-authenticated users; last 4 digits only in UI; scrubbed from audit logs | Cleared on browser session end |
| OAuth access/refresh tokens | **Confidential** | httpOnly cookie (browser) | AES-256-GCM with scrypt KDF | TLS 1.2+ (HTTPS); httpOnly/secure/sameSite flags | 30-day cookie maxAge; 2-hour token expiration | Server-side only (httpOnly); not accessible via JavaScript | Cookie expiration; explicit revocation on logout (to be implemented) |
| DocuSign RSA private key | **Confidential** | `.env.local` (server filesystem) / Vercel environment variables | Vercel encrypts env vars at rest; plaintext in `.env.local` | N/A (server-side only) | Until rotated | Server-side only; no API exposure | Secure deletion + rotation |
| Salesforce client credentials | **Confidential** | `.env.local` (server filesystem) / Vercel environment variables | Vercel encrypts env vars at rest; plaintext in `.env.local` | N/A (server-side only) | Until rotated | Server-side only; no API exposure | Secure deletion + rotation |
| Client names/emails/phones | **Internal** | Salesforce (firm's org) — transient in browser memory | Salesforce platform encryption | TLS 1.2+ (HTTPS) | Per firm's Salesforce retention; not persisted by Min | OAuth-authenticated users; excluded from analytics | Cleared on browser session end |
| Audit log entries | **Internal** | Salesforce Task records (firm's org) | Salesforce platform encryption | TLS 1.2+ (HTTPS) | 7 years (SEC Rule 204-2) | Salesforce org permissions; PII scrubbed before write | Per firm's Salesforce data management after retention period |
| Org schema mappings | **Internal** | Turso database + encrypted cookie | AES-256-GCM (cookie); Turso infrastructure encryption (database) | TLS 1.2+ (HTTPS) | Cookie: 90-day maxAge; Database: until customer offboarding + 90 days | Server-side via org_id filtering | SQL DELETE + VACUUM; cookie expiration |
| Task subjects/descriptions | **Internal** | Salesforce (firm's org) — transient in browser memory | Salesforce platform encryption | TLS 1.2+ (HTTPS) | Per firm's Salesforce retention | OAuth-authenticated users; included in audit logs (not scrubbed) | Cleared on browser session end |
| Compliance check results | **Internal** | Ephemeral (browser memory only) | N/A (not persisted) | TLS 1.2+ (HTTPS) | Session duration only | OAuth-authenticated users | Cleared on session end / page navigation |
| Aggregate analytics | **Internal** | Turso database | Turso infrastructure encryption | TLS 1.2+ (HTTPS) | 3 years | Server-side via org_id filtering; PII stripped before storage | SQL DELETE + VACUUM |
| Custodian rules | **Public** | Source code (GitHub repository) | N/A (no PII content) | N/A | Indefinite (versioned in git) | Public repository access controls | Git history retention |
| Product documentation | **Public** | Website / GitHub | N/A | TLS 1.2+ (HTTPS) | Indefinite | Public | Standard web content removal |

**Estimated effort:** 1 day to finalize and obtain stakeholder sign-off. Quarterly review thereafter.

---

### 5.2 Data Retention and Disposal

#### Current State Assessment

**Data Retention:**
- Turso analytics: no DELETE queries in code. Data accumulates indefinitely.
- Turso org patterns: UPSERT pattern — one record per org, updated on rediscovery.
- Salesforce audit logs: retained per Salesforce org retention policy (customer-controlled).
- OAuth cookies: 30-day maxAge (auto-expire).
- CSRF cookies: 24-hour maxAge (auto-expire).
- Org mapping cookies: 90-day maxAge (auto-expire).
- localStorage: session resume data persists until cleared or 24-hour staleness check.
- Browser memory: client PII (SSNs, DOBs) exists only in React state — cleared on page close.

**Data Disposal:**
- No data deletion API for customers.
- No customer offboarding process.
- No data deletion certificate capability.
- No process for purging data from backups after deletion.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No data retention policy. SOC 2 requires documented retention periods for all data types.
- No customer data deletion process. When a firm stops using Min, their data persists in Turso (analytics) and Salesforce (audit logs) indefinitely.

**HIGH (required for Type I):**
- No data disposal procedure
- Conflict between SEC recordkeeping (retain 5+ years) and privacy law (delete on request) not addressed
- No data deletion verification (how do you prove data was deleted?)

#### Remediation Plan

**Data Retention Schedule:**
| Data Type | Retention Period | Justification | Disposal Method |
|-----------|-----------------|---------------|----------------|
| Audit logs (Salesforce) | 7 years | SEC Rule 204-2 | Purge after retention period per Salesforce data management |
| Analytics snapshots (Turso) | 3 years | Business intelligence | SQL DELETE + vacuum |
| Org patterns (Turso) | Until customer offboarding + 90 days | Operational necessity | SQL DELETE + vacuum |
| Event tracking (Turso) | 1 year | Product analytics | SQL DELETE + vacuum |
| OAuth cookies | 30 days | Auto-expire | Browser cookie expiration |
| Session state | 24 hours | Auto-expire | localStorage cleanup |

**Customer Offboarding Process:**
1. Customer requests offboarding
2. Min exports all audit logs to customer (PDF or CSV)
3. Min deletes all Turso records for `org_id`
4. Min deletes audit Task records from Salesforce (if Min has delete permissions) or documents that records remain in customer's Salesforce org (customer-controlled)
5. Min revokes all OAuth tokens for the customer's org
6. Min issues data deletion certificate documenting what was deleted, when, and by whom
7. Retain offboarding record for 7 years (SEC requirement)

**Estimated effort:** 2-3 days to implement deletion API and offboarding process.

---

### 5.3 Data Isolation

#### Current State Assessment

**Multi-Tenancy Model:**
Min's multi-tenancy operates at two levels:

1. **Salesforce Level:** Each customer has their own Salesforce org. Min connects to one org at a time via OAuth. The OAuth token provides access only to that org's data. Cross-org access is impossible through Salesforce's architecture.

2. **Turso Level:** All tables include an `org_id` column. Queries filter by `WHERE org_id = ?`. However, there is no row-level security or database-level isolation — all customers share the same Turso database/tables.

3. **Browser Level:** localStorage stores firm data (`min-managed-firms`), session state, and workflow notes. This data is per-browser, not per-user. If two advisors share a computer, they share localStorage. There is no per-user browser-level isolation.

**LLM Isolation:**
Min does not send data to any LLM service, eliminating the risk of cross-tenant data leakage through shared AI context.

#### Gap Analysis

**HIGH (required for Type I):**
- No tenant isolation testing. Has it been verified that a request with `org_id=A` cannot access data belonging to `org_id=B`?
- localStorage is per-browser, not per-user. If multiple advisors use the same computer/browser, they could see each other's cached firm data and workflow notes.

**MEDIUM (required for Type II):**
- Turso has no row-level security. Isolation depends entirely on application-level `WHERE org_id = ?` filtering. A bug in any query could leak data across tenants.
- No automated tenant isolation tests in the test suite.

#### Remediation Plan

| Gap | Action | Effort |
|-----|--------|--------|
| No isolation testing | Add automated tests: verify queries with org_id=A never return org_id=B data. Test API endpoints with mismatched org_ids. | 1-2 days |
| localStorage sharing | Clear localStorage on logout/session end. Add user-specific key prefix. Or use sessionStorage instead (already used for some state). | 4 hours |
| No row-level security | For Turso: consider separate databases per tenant (Turso supports this), or implement application-level middleware that injects org_id into every query. | 2-3 days |

---

### 5.4 Confidentiality in Transit

#### Current State Assessment

**Data to Anthropic API:**
Min does **not** send any data to Anthropic in production. Confirmed by comprehensive codebase search: no `@anthropic-ai/sdk` dependency, no direct Anthropic API calls, no prompt construction with client data. This is the single strongest confidentiality control in Min's architecture — it eliminates the most common concern about AI-powered products.

**Data to Salesforce:**
Client PII (names, emails, phones, DOBs, SSNs) travels over HTTPS from Salesforce to Min's server, then from Min's server to the browser. HTTPS provides transport-level encryption. No application-level encryption is added for PII fields.

Audit log writes send scrubbed data from Min's server to Salesforce over HTTPS.

**Data to DocuSign:**
Document content and client names are sent to DocuSign via HTTPS using JWT bearer authentication with RSA-SHA256 signing. DocuSign has its own SOC 2 Type II certification.

**Data to Turso:**
Analytics snapshots (aggregate counts, no PII) and org patterns (schema metadata, no PII) are sent to Turso over HTTPS. The Turso auth token is transmitted in the connection header.

#### Gap Analysis

**MEDIUM (required for Type II):**
- No application-level encryption for PII fields in transit between Min server and browser. HTTPS provides adequate transport encryption, but field-level encryption would provide defense-in-depth.
- SSN is transmitted from Salesforce to Min server and then to browser as plaintext within the HTTPS tunnel. Consider fetching SSNs only when explicitly needed (not on initial page load).

**LOW (best practice):**
- Document the data flow for each integration (what data, what direction, what encryption, what authentication) in a data flow diagram for SOC 2 evidence.

---

## Phase 6: Privacy Controls

### 6.1 Regulatory Applicability

#### Current State Assessment

**Applicable Regulations:**

| Regulation | Applicability | Min's Role |
|-----------|--------------|-----------|
| Regulation S-P (SEC) | Yes — Min handles NPI (nonpublic personal information) of clients of SEC-registered RIAs | Data processor |
| CCPA/CPRA (California) | Yes — if any end clients are California residents | Service provider (CCPA term) |
| State breach notification laws | Yes — all 50 states have breach notification requirements | Data processor, notification obligations vary |
| GLBA (Gramm-Leach-Bliley) | Yes — Min handles financial information subject to GLBA. RIA firms are "financial institutions" under GLBA. | Data processor |
| SOX | No — Min is not publicly traded and doesn't process accounting data |  |
| GDPR | Potentially — if any end clients are EU residents | Data processor |

Min qualifies as a "service provider" under CCPA because it processes personal information on behalf of RIA firms (the "businesses"). This requires a written Data Processing Agreement with each customer.

**Privacy Policy:**
Min has no privacy policy. No terms of service. No data processing agreement template.

#### Gap Analysis

**CRITICAL (blocks SOC 2):**
- No privacy policy
- No Data Processing Agreement template for customers
- No documented process for handling data subject requests (CCPA right to know, right to delete)

**HIGH (required for Type I):**
- No Reg S-P compliance documentation (Min handles NPI as defined by Reg S-P)
- No GLBA safeguards documentation
- No breach notification procedures per state requirements

#### Remediation Plan

1. Draft privacy policy covering: data collected, purpose, retention, sharing, security measures, data subject rights
2. Create DPA template covering: processing scope, security obligations, breach notification, data return/deletion, subprocessor management, audit rights
3. Document Reg S-P compliance: how Min protects NPI, opt-out mechanisms (if applicable), safeguards
4. Create data subject request process: intake form, verification, response SLA (45 days under CCPA), documentation

**Estimated effort:** 3-5 days (recommend engaging a privacy attorney for review — budget $3,000-$5,000)

---

### 6.2 Data Subject Rights

#### Current State Assessment

**CCPA Right to Know:**
Min has no mechanism for a client of an RIA firm to request access to their personal data. If a California resident asks "what data does Min have about me?", Min cannot produce a report.

**CCPA Right to Delete:**
Min has no data deletion API. If a client requests deletion:
- Salesforce data: lives in the firm's Salesforce org (firm handles deletion)
- Audit logs: contain the client's household ID and action descriptions (but PII is scrubbed) — deletion would conflict with SEC Rule 17a-4
- Analytics: contains no PII (aggregate counts only) — nothing to delete
- Browser state: cleared on logout/session expiry — ephemeral

**Tension: SEC records retention vs. privacy deletion rights:**
The compliance engine's audit trail is designed for SEC Rule 17a-4 compliance — which requires records to be retained, not deleted. This conflicts with CCPA's right to delete. The resolution: Min's audit logs are PII-scrubbed. They contain household IDs and action descriptions but not SSNs, DOBs, or account numbers. A deletion request can be fulfilled by confirming that no PII exists in the audit trail (only anonymized references).

#### Gap Analysis

**HIGH (required for Type I):**
- No data subject request intake process
- No data subject request response SLA
- No documentation of the SEC vs. CCPA tension and resolution

**MEDIUM (required for Type II):**
- No automated data export for data subject requests
- No data subject request tracking/log

---

### 6.3 Privacy by Design

#### Current State Assessment

**Data Minimization:**
- Min does not independently store client PII — it reads from Salesforce at query time
- Analytics store only aggregate counts (5 numeric fields — PII stripped)
- Audit logs scrub 12 PII field types before writing
- The compliance engine collects metadata evidence (counts, field population status), not PII values
- Browser state: SSNs and DOBs are stripped before persisting to localStorage (`useFlowState.ts:207-221`)

This is a strong implementation of data minimization. Min processes PII transiently (during the user's session) but persistently stores only scrubbed/aggregated data.

**PII Masking:**
- SSNs: masked by default (password input field, `ClientForm.tsx:63`), toggle to reveal
- Bank account numbers: show last 4 digits only (`RightPane.tsx:133`: `****{bankAcct.slice(-4)}`)
- SSN formatting: `fmtSSN()` formats to `XXX-XX-XXXX` pattern when displayed

**Access Controls for PII:**
- No role-based PII access controls. All authenticated users can see all data (see Section 2.1)
- No field-level access restrictions (operations associate sees same PII as COO)

#### Gap Analysis

**HIGH (required for Type I):**
- No role-based PII access. The operations associate should not see SSNs unless their role requires it. Implement field-level visibility based on user role.
- SSN fetched from Salesforce even when not needed for the current view. Consider lazy-loading SSNs only on explicit request.

**MEDIUM (required for Type II):**
- No consent mechanism for analytics tracking. Events are sent without user opt-in.
- Trusted contact fields (name, phone, relationship) are not in the PII scrub list for audit logs (`audit.ts:41-45`). While trusted contacts are less sensitive than SSNs, they are still personal information.

---

## Phase 7: Compliance Automation Tooling Assessment

### 7.1 Tool Comparison

| Platform | Cost (Annual) | Time to Readiness | Financial Services Experience | All 5 TSC | Solo Founder Suitability |
|----------|--------------|-------------------|------------------------------|-----------|------------------------|
| **Vanta** | $10,000-$15,000 | 3-4 months | Strong (1,000+ fintech customers) | Yes | Good — automated evidence collection, integrates with GitHub/Vercel |
| **Drata** | $10,000-$12,000 | 3-4 months | Strong (financial services vertical) | Yes | Good — personnel tracking works with 1 person, scales to team |
| **Secureframe** | $8,000-$12,000 | 2-3 months | Moderate | Yes | Good — compliance-as-code approach suits technical founders |
| **Sprinto** | $5,000-$8,000 | 2-3 months | Moderate | Yes | Good — lower cost, newer platform, solid for startups |

**Recommendation: Vanta or Drata**

Both have extensive financial services experience, established auditor networks, and evidence collection automation that reduces the burden on a solo founder. Vanta has a slight edge for startups (YC discount, startup-friendly onboarding). Drata has a slight edge for financial services depth.

Between the two: **Vanta** is recommended for Min. Reasons:
1. Startup pricing available (potential YC/accelerator discounts)
2. Strong GitHub and Vercel integrations (Min's stack)
3. Automated evidence collection reduces solo founder burden
4. Established auditor network for all 5 TSC criteria
5. Customer references in wealthtech/fintech available

### 7.2 Timeline and Cost

**Timeline:**

| Phase | Duration | Activities |
|-------|----------|------------|
| Weeks 1-4 | Policy Documentation | Write ISP, risk assessment, change management, IRP, vendor management, personnel security |
| Weeks 5-8 | Technical Remediation | Server-side RBAC, remove dev fallback keys, add security headers, implement CI/CD, configure monitoring |
| Weeks 9-12 | Platform Onboarding | Set up Vanta/Drata, connect integrations, upload policies, configure evidence collection |
| Weeks 13-16 | Gap Remediation | Address platform-identified gaps, conduct penetration test, complete vendor assessments |
| Weeks 17-20 | Type I Audit Engagement | Auditor reviews controls at a point in time. Remediate any findings. |
| Week 20 | **SOC 2 Type I Report** | Controls assessed at a point in time |
| Weeks 21-46 | Observation Period | 6 months of controls operating effectively, evidence collection |
| Weeks 47-50 | Type II Audit | Auditor reviews controls over observation period |
| Week 50 | **SOC 2 Type II Report** | Controls assessed over time |

**Cost Estimate:**

| Item | Cost |
|------|------|
| Compliance automation platform (Year 1) | $8,000-$15,000 |
| SOC 2 Type I audit (CPA firm) | $8,000-$15,000 |
| SOC 2 Type II audit (CPA firm) | $10,000-$20,000 |
| Penetration test | $5,000-$15,000 |
| Privacy attorney (DPA, privacy policy) | $3,000-$5,000 |
| Log aggregation service (Year 1) | $1,200-$3,600 |
| **Total (Year 1, through Type II)** | **$35,200-$73,600** |
| **Minimum Viable Path** | **$25,000-$40,000** |

**Minimum Viable Path:**
- Sprinto ($5,000) + smaller audit firm ($8,000) + basic pentest ($5,000) + DIY policies (free) + Axiom for logs ($1,200/year) = ~$19,200-$25,000
- Timeline: 4-5 months to Type I, 10-11 months to Type II

### 7.3 Interim Measures

Before SOC 2 is complete, Min can provide prospects with:

1. **Security Overview** (see Section 12.1 below)
2. **Completed vendor security questionnaire** (see Section 12.3 below)
3. **Architecture diagram showing data flow** (see Section 12.2 below)
4. **Penetration test report** (when completed)
5. **Letter of Intent**: "Min is actively pursuing SOC 2 Type II certification. We have engaged [automation platform] and expect to complete Type I by [date]. Our target for Type II completion is [date]."

Most enterprise procurement teams will accept a SOC 2 readiness letter + pentest report + completed security questionnaire as an interim measure, with a contractual commitment to deliver SOC 2 Type II within 12 months.

---

## SOC 2 Readiness Scorecard

| Trust Services Criterion | Score (1-5) | Justification |
|-------------------------|-------------|---------------|
| **Security (Common Criteria)** | 2.5 | Strong technical controls (AES-256-GCM encryption, CSRF protection, SOQL injection prevention, input validation, PII scrubbing) but zero organizational controls (no policies, no risk assessment, no IRP, no change management documentation). |
| **Availability** | 1.5 | No SLA, no monitoring, no status page, no backup verification, no DR plan, no BCP. Vercel provides platform-level availability, but nothing is documented or measured. |
| **Processing Integrity** | 3.0 | Deterministic compliance engine with 767 tests. Reconciliation capability exists. Confidence scoring with manual fallback. No LLM dependency (eliminates AI integrity risk). Gaps: no automated reconciliation schedule, no freshness indicators, no completeness verification. |
| **Confidentiality** | 2.5 | Strong PII scrubbing in audit logs and analytics. Encrypted credential storage. No client data sent to LLMs. Gaps: no data classification policy, no retention policy, no deletion process, no tenant isolation testing, SSNs not field-level encrypted. |
| **Privacy** | 1.5 | Strong privacy-by-design in code (data minimization, PII masking, scrubbing before persistence). Zero privacy documentation (no privacy policy, no DPA, no DSAR process, no Reg S-P documentation). |
| **Overall** | **2.2** | **Min's codebase demonstrates above-average security awareness for its stage. The gap is entirely in documentation and organizational processes. The technical foundation is solid; the policy layer needs to be built from scratch.** |

---

## The 90-Day SOC 2 Roadmap

**Assumptions:** Jon is doing this alongside product development (approximately 30-40% time allocation to SOC 2 — roughly 12-16 hours per week). Not full-time.

### Week 1: Platform Selection and Quick Wins
- [ ] Evaluate and select compliance automation platform (Vanta recommended — see Section 7.1)
- [x] Remove dev fallback encryption keys from source code (`sf-connection.ts:12`, `org-query.ts:110`) — ✅ PR #7
- [x] Add HSTS header to `proxy.ts` (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) — ✅ PR #7
- [x] Add Permissions-Policy header to `proxy.ts` (`camera=(), microphone=(), geolocation=()`) — ✅ PR #7
- [x] Upgrade `jspdf` from 4.1.0 to >=4.2.0 to patch 2 HIGH PDF injection vulnerabilities — ✅ PR #7
- **Deliverables:** ~~Platform contract signed.~~ Three security headers live. Two critical code-level vulnerabilities eliminated.

### Week 2: Information Security Policy
- [x] Draft Information Security Policy (use Vanta/Drata template as starting point — do not write from scratch) — ✅ PR #7 (`policies/Information_Security_Policy.md`)
- [x] Sections to complete: Purpose & Scope, Roles & Responsibilities, Data Classification (reference matrix from Section 5.1), Access Control Policy, Acceptable Use — ✅ PR #7
- [x] Document solo founder compensating controls (quarterly self-assessment checklist) — ✅ PR #7
- [x] Draft risk acceptance criteria (what level of residual risk is acceptable) — ✅ PR #13 (`policies/Risk_Assessment.md` §4)
- **Deliverables:** ISP v1.0 draft complete. Roles documented even though all held by one person.

### Week 3: Risk Assessment
- [x] Complete formal risk assessment using framework from Section 1.2 (12 risks pre-identified) — ✅ PR #13 (`policies/Risk_Assessment.md`)
- [x] Score all risks: likelihood × impact matrix — ✅ PR #13 (heat map + risk register)
- [x] Document current mitigations and residual risk for each — ✅ PR #13 (§2 Risk Register)
- [x] Establish quarterly review cadence for P1 risks, semi-annual for P2/P3 — ✅ PR #13 (§7 Review Schedule)
- [ ] Upload risk register to compliance platform
- **Deliverables:** Risk register with 12+ scored risks. Review cadence documented.

### Week 4: Server-Side RBAC
- [x] Implement server-side role enforcement: add role to encrypted session cookie — ✅ PR #7 (`route.ts` x-user-role header)
- [x] Define permission matrix: which roles (advisor, operations, principal) can access which API endpoints — ✅ PR #7 (ACTION_ROLES in `route.ts`)
- [x] Add role validation middleware to all protected API routes — ✅ PR #7
- [x] Add tests for role-based access denial (advisor cannot access principal-only endpoints) — ✅ PR #7 (6 RBAC tests) + PR #15 (17 expanded RBAC tests)
- [x] Add CSP header in report-only mode (start collecting violation data) — ✅ PR #7
- **Deliverables:** RBAC enforced server-side. Permission matrix documented and tested.

### Week 5: Authentication and Session Security
- [x] Add authentication event logging (login via OAuth, logout, failed auth attempts, token refresh) to `MIN:AUDIT` trail — ✅ PR #13 (`audit.ts` writeAuthEvent)
- [x] Implement token revocation on logout (call Salesforce `/services/oauth2/revoke` endpoint) — ✅ PR #7 (`sf-connection.ts` revokeAndClearConnection)
- [x] Reduce cookie maxAge from 30 days to 8-12 hours — ✅ PR #13 (8 hours in `sf-connection.ts`)
- [x] Add SSN access logging (log when a user clicks "reveal" on masked SSN field) — ✅ PR #14 (`/api/audit/pii-access`, `ClientForm.tsx`)
- **Deliverables:** Auth events in audit trail. Tokens properly revoked on logout. Session duration hardened.

### Week 6: CI/CD Pipeline
- [x] Create `.github/workflows/ci.yml` with required checks: `pnpm test`, `pnpm lint`, `pnpm build` — ✅ PR #7
- [x] Add `pnpm audit --audit-level=high` to CI pipeline (fail on HIGH+ vulnerabilities) — ✅ PR #7
- [x] Enable branch protection on `main`: require CI pass + PR (self-review with checklist) — ✅ PR #15 (force push + deletion disabled)
- [x] Enable GitHub Dependabot alerts and automated PRs for dependency updates — ✅ PR #7 (`.github/dependabot.yml`)
- [x] Create AI-Generated Code Review Checklist (see Section 1.5) and add as PR template — ✅ PR #7 (`.github/pull_request_template.md`)
- **Deliverables:** CI pipeline live. No code merges without passing tests. Dependency scanning active.

### Week 7: Change Management and Personnel Policies
- [x] Complete change management policy (standard/normal/emergency change categories, approval process, rollback procedure) — ✅ PR #14 (`policies/Change_Management_Policy.md`)
- [x] Complete personnel security policy (pre-hire screening, security awareness training, access provisioning/deprovisioning) — ✅ PR #14 (`policies/Personnel_Security_Policy.md`)
- [x] Complete vendor management policy (assessment template, review cadence, DPA requirements) — ✅ PR #14 (`policies/Vendor_Management_Policy.md`)
- [ ] Complete self-administered security awareness training (KnowBe4 or SANS). Document completion with certificate.
- **Deliverables:** Three policies complete. ~~Security awareness training certificate on file.~~

### Week 8: Incident Response Plan
- [x] Complete incident response plan using templates from Section 2.6 (severity classification, 5 scenario playbooks) — ✅ PR #14 (`policies/Incident_Response_Plan.md`)
- [x] Document forensic procedures (evidence preservation checklist, chain of custody) — ✅ PR #14 (IRP §8)
- [x] Finalize communication templates (customer notification, regulatory notification, internal report) — ✅ PR #14 (IRP §10)
- [ ] Designate external incident response contact (attorney or contract security professional)
- [ ] Conduct abbreviated tabletop exercise (walk through Scenario 1: wrong client data displayed)
- **Deliverables:** Full IRP with playbooks, forensic procedures, and communication templates. ~~Tabletop exercise documented.~~

### Week 9: Monitoring and Logging Infrastructure
- [ ] Configure log aggregation service (Datadog, Axiom, or Betterstack) — connect Vercel log drain
- [ ] Set retention to 12+ months (SOC 2 observation period coverage)
- [x] Implement write-ahead audit buffer: write to Turso first (synchronous), replicate to Salesforce (async with retry) — ✅ PR #13 (`audit.ts` writeToTurso → writeToSalesforce)
- [x] Create system health endpoint (`/api/health`) checking: app running, database reachable, Salesforce connection valid — ✅ PR #13 (`/api/health/route.ts`)
- **Deliverables:** ~~Centralized logging with 12-month retention.~~ Audit trail resilient to Salesforce outages.

### Week 10: Alerting, Monitoring, and Status Page
- [ ] Set up uptime monitoring (Better Uptime, Pingdom, or Vercel Analytics) for application health
- [ ] Configure security alerts: >5 failed auth in 5 min, >10 errors in 1 min, audit write failure, API response >10s
- [ ] Create public status page (Instatus or Better Uptime built-in): Application, Salesforce Integration, DocuSign Integration, Database
- [ ] Define internal SLA targets: 99.9% application uptime, 99.5% integration availability
- **Deliverables:** Monitoring live. Status page public. Alerting configured.

### Week 11: Privacy and Data Governance
- [x] Draft privacy policy (data collected, purpose, retention, sharing, security measures, data subject rights) — ✅ PR #14 (`policies/Privacy_Policy.md`)
- [x] Create Data Processing Agreement template (use outline from Section 12.4, engage privacy attorney for review) — ✅ PR #14 (`policies/Data_Processing_Agreement.md`)
- [x] Finalize data classification matrix (Section 5.1) — obtain stakeholder sign-off — ✅ PR #6 (14-row matrix in audit doc §5.1)
- [x] Document data retention schedule (Section 5.2) with SEC Rule 204-2 alignment — ✅ PR #14 (Privacy Policy §6)
- [x] Begin implementing customer data deletion API (Turso records by `org_id`, offboarding workflow) — ✅ PR #13 (`/api/admin/offboard/route.ts`)
- **Deliverables:** Privacy policy draft. DPA template ready for legal review. Data governance documentation complete.

### Week 12: Security Testing
- [ ] Engage penetration testing firm (Cobalt, HackerOne, or Synack — budget $5,000-$15,000)
- [x] Add tenant isolation tests (verify org_id=A cannot access org_id=B data) — ✅ PR #13 (5 tests in `db-persistence.test.ts`)
- [x] Add security-specific test cases: SOQL injection with malicious input, CSRF token validation edge cases, session expiration enforcement, role-based access denial — ✅ PR #15 (69 tests in `security.test.ts`)
- [x] Create vulnerability disclosure policy (`SECURITY.md` in GitHub, `/.well-known/security.txt`) — ✅ PR #13 (`SECURITY.md`) + PR #14 (`security.txt`)
- [x] Enable Snyk or `npm audit` in CI for ongoing vulnerability scanning — ✅ PR #7 (`pnpm audit` in CI + Dependabot)
- **Deliverables:** ~~Pentest engaged.~~ Security test suite expanded. Vulnerability disclosure published.

### Week 13: Platform Onboarding and Gap Closure
- [ ] Onboard to Vanta/Drata — connect integrations (GitHub, Vercel, Turso)
- [ ] Upload all policies and procedures (ISP, risk register, change management, IRP, vendor management, personnel, privacy, data classification, retention)
- [ ] Configure automated evidence collection (access reviews, vulnerability scans, uptime metrics)
- [ ] Begin vendor risk assessments: request SOC 2 reports from Salesforce, Vercel, DocuSign, GitHub; verify Turso SOC 2 status
- [ ] Run platform gap analysis — identify any remaining findings
- [ ] Address platform-identified gaps (typically: missing evidence screenshots, policy signature dates, training records)
- **Deliverables:** Compliance platform fully configured. All policies uploaded. Automated evidence collection running. Remaining gaps identified with remediation owners.

**Week 13 Target State:** All critical and high gaps remediated. Policies documented. Technical controls implemented. Monitoring configured. Ready to engage auditor for Type I assessment.

---

## Customer-Facing Security Documentation

### 12.1 Security Overview

---

**Min — Security Overview**
*Version 1.0 | February 2026*

**1. Architecture**

Min is a web application built on Next.js (TypeScript/React), deployed on Vercel's serverless platform. Min does not store client data independently — it connects to your firm's Salesforce CRM instance via OAuth 2.0 and reads data at query time. Client records, financial data, and compliance documentation remain in your Salesforce org, under your control.

Min's database (Turso) stores only: aggregate practice analytics (task counts, no client names), Salesforce schema configuration mappings, and product usage metrics. No client PII is stored in Min's database.

**2. Authentication**

Min authenticates users via Salesforce OAuth 2.0 Authorization Code flow. Min does not have its own user database or password store. Your firm's Salesforce MFA and SSO policies apply to Min access. Min enforces a 15-minute idle session timeout.

**3. Encryption**

- **In Transit:** All data transmitted over TLS 1.2+ (HTTPS). All CRM API calls, DocuSign API calls, and database connections are encrypted in transit.
- **At Rest:** OAuth access tokens and refresh tokens are encrypted using AES-256-GCM (authenticated encryption) with scrypt-derived keys. Security headers include X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Referrer-Policy.

**4. Access Controls**

- CSRF protection on all mutation endpoints (double-submit cookie pattern with constant-time token validation)
- Rate limiting: 100 requests per minute per IP address
- Origin checking: cross-origin requests rejected
- Session management: 15-minute idle timeout, httpOnly/secure/sameSite cookies
- Input validation: all user inputs validated for type, length, and format before processing
- SOQL injection prevention: comprehensive sanitization with escaping, pattern validation, and 200-character limits

**5. Audit Trail**

Every action taken in Min (except read-only queries) is logged to your firm's Salesforce org as a Task record with a `MIN:AUDIT` prefix. Audit entries include: action performed, actor, timestamp, duration, and result — but never client PII (SSNs, DOBs, and account numbers are scrubbed before logging). This audit trail is designed for SEC Rule 17a-4 compliance.

**6. AI and Client Data**

Min's compliance engine is 100% deterministic (rule-based keyword matching and document requirement lookups). Min does not use AI/LLM models for compliance recommendations. **Min does not send client data to Anthropic or any other AI service.** AI coding tools are used in Min's development process only.

**7. Compliance Posture**

Min is actively pursuing SOC 2 Type II certification covering all five Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy). We have engaged a compliance automation platform and expect to complete our Type I assessment by [TARGET DATE]. Our target for Type II completion is [TARGET DATE].

In the interim, we are happy to provide: a completed vendor security questionnaire, our penetration test report (when available), and a walkthrough of our security architecture.

**8. Contact**

For security inquiries: [security@min.com]
To report a vulnerability: [security@min.com] or see our SECURITY.md on GitHub

---

### 12.2 Data Flow Diagram

```
                                    ┌─────────────────────┐
                                    │   RIA Firm's         │
                                    │   Salesforce Org     │
                                    │   ────────────────   │
                                    │   • Client records   │
                                    │   • Financial accts  │
                                    │   • Tasks/activities │
                                    │   • Audit logs       │
                                    └──────────┬──────────┘
                                               │
                                    OAuth 2.0 + HTTPS
                                    (read CRM data,
                                     write audit logs)
                                               │
                                               ▼
┌──────────────┐     HTTPS      ┌─────────────────────────┐     HTTPS      ┌──────────────┐
│   Advisor's  │◄──────────────►│       Min Server        │◄──────────────►│   DocuSign   │
│   Browser    │   (TLS 1.2+)   │   (Vercel / Next.js)    │  JWT Bearer    │   API        │
│              │                │   ────────────────────   │   (RSA-SHA256) │              │
│ • Renders UI │                │   • OAuth token mgmt    │                └──────────────┘
│ • Session    │                │   • SOQL query builder   │
│   state only │                │   • Compliance engine    │
│ • No PII     │                │   • Audit log writer     │     HTTPS      ┌──────────────┐
│   persisted  │                │   • Input validation     │◄──────────────►│   Turso DB   │
│              │                │   • Rate limiting        │                │   (libSQL)   │
└──────────────┘                │   • CSRF protection      │                │ ───────────  │
                                │   • PII scrubbing        │                │ • Analytics  │
                                └─────────────────────────┘                │   (counts)   │
                                                                           │ • Org schema │
                                         ╳                                 │ • Events     │
                                   NO CONNECTION                           │ • NO PII     │
                                         ╳                                 └──────────────┘
                                ┌──────────────┐
                                │  Anthropic   │
                                │  (Claude)    │
                                │              │
                                │ NOT USED IN  │
                                │ PRODUCTION   │
                                └──────────────┘
```

**Data Flow Summary:**
1. Advisor authenticates via Salesforce OAuth → Min receives encrypted access token
2. Min queries Salesforce for client data → data rendered in browser (not stored by Min)
3. Advisor takes action → Min writes audit log to Salesforce (PII scrubbed)
4. Min stores aggregate analytics in Turso (counts only, no PII)
5. DocuSign integration for e-signatures (via JWT bearer auth)
6. **No data flows to Anthropic or any AI service**

---

### 12.3 Vendor Security Questionnaire (Pre-Filled)

**General Information**
| Question | Answer |
|----------|--------|
| Company name | Min |
| Product/service description | AI workflow orchestration platform for SEC-registered RIA firms |
| Number of employees | 1 (solo founder) |
| SOC 2 certification status | In progress — targeting Type I by [DATE], Type II by [DATE] |
| ISO 27001 certification | Not currently held |
| Insurance | [Cyber liability insurance status — to be completed] |

**Data Handling**
| Question | Answer |
|----------|--------|
| What data do you process? | Client PII (names, SSNs, DOBs, addresses, phone, email), financial account data (account numbers, balances), advisor activity data |
| Where is data stored? | Client data is NOT stored by Min. Client data resides in the firm's Salesforce org. Min stores only aggregate analytics (counts, no PII) in Turso (cloud database). |
| Is data encrypted at rest? | OAuth tokens: Yes (AES-256-GCM). Client data: stored in Salesforce (Salesforce's encryption applies). Analytics: stored in Turso (Turso's infrastructure encryption applies). |
| Is data encrypted in transit? | Yes — all connections use TLS 1.2+ (HTTPS) |
| Do you send data to AI/LLM services? | No. Min does not send client data to Anthropic or any AI service. The compliance engine is 100% deterministic. |
| How long is data retained? | OAuth tokens: 30 days (auto-expire). Analytics: to be documented in data retention policy (in development). Audit logs: written to firm's Salesforce org (firm-controlled retention). |
| Can you delete data on request? | Data deletion capability is in development. Upon offboarding, we will delete all Min-side data and provide a deletion certificate. |

**Access Control**
| Question | Answer |
|----------|--------|
| How do users authenticate? | Via Salesforce OAuth 2.0. Min has no independent user database. |
| Is MFA supported? | Min inherits MFA from the firm's Salesforce org. If Salesforce requires MFA, it applies to Min access. |
| Are admin and user roles separated? | Three roles defined (advisor, operations, principal). Server-side role enforcement is in development. |
| How are API credentials stored? | Encrypted in httpOnly cookies (AES-256-GCM) or environment variables (Vercel encrypted environment). |

**Security Controls**
| Question | Answer |
|----------|--------|
| Do you have a WAF? | Vercel provides platform-level DDoS protection. Dedicated WAF is planned. |
| Rate limiting? | Yes — 100 requests per minute per IP address. |
| CSRF protection? | Yes — double-submit cookie pattern with constant-time token validation. |
| Input validation? | Yes — all inputs validated for type, length, format. SOQL injection prevention with comprehensive sanitization. |
| Security headers? | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection, Referrer-Policy. HSTS and CSP in development. |
| Penetration testing? | Planned — targeting completion by [DATE]. |
| Incident response plan? | In development — expected completion by [DATE]. |

**Compliance**
| Question | Answer |
|----------|--------|
| Privacy policy? | In development — expected completion by [DATE]. |
| Data Processing Agreement available? | In development — expected completion by [DATE]. |
| Breach notification SLA? | 72 hours (to be formalized in IRP). |
| Do you have cyber insurance? | [To be completed] |

---

### 12.4 Data Processing Agreement Template

**Min Data Processing Agreement — Outline**

This is an outline for legal counsel to develop into a binding DPA.

**1. Definitions**
- Controller: The RIA firm
- Processor: Min
- Personal Data: Client PII processed by Min on behalf of the Controller
- Subprocessors: Third parties that process data on Min's behalf (Vercel, Turso, DocuSign)

**2. Scope of Processing**
- Min processes Personal Data solely to provide the Services described in the Master Service Agreement
- Processing activities: reading client records from CRM, displaying data to authorized users, generating compliance reports, creating audit logs, facilitating e-signature workflows
- Min does NOT sell, share, or use Personal Data for any purpose other than providing the Services

**3. Data Security**
- Min implements technical and organizational measures as described in the Security Overview
- Encryption: AES-256-GCM for credentials, TLS 1.2+ for transit
- Access controls: OAuth-based authentication, session management, CSRF protection
- Audit logging: all mutations logged with PII scrubbing

**4. Subprocessors**
- Current subprocessors: Vercel (hosting), Turso (analytics database), DocuSign (e-signatures)
- Min will notify Controller 30 days before engaging a new subprocessor
- Controller may object to new subprocessors

**5. Data Subject Rights**
- Min will assist Controller in responding to data subject requests (access, deletion, portability)
- Response SLA: 10 business days to provide requested data or deletion confirmation

**6. Data Breach Notification**
- Min will notify Controller within 72 hours of discovering a data breach
- Notification will include: description of breach, data types affected, approximate number of records, remediation steps taken

**7. Data Return and Deletion**
- Upon termination: Min will export all audit logs to Controller (PDF/CSV) and delete all Controller data from Min's systems within 30 days
- Min will provide a deletion certificate

**8. Audit Rights**
- Controller may audit Min's compliance with this DPA upon 30 days written notice
- Alternatively, Controller may accept Min's SOC 2 report as evidence of compliance

**9. Term and Termination**
- This DPA terminates when the Master Service Agreement terminates
- Data processing obligations survive termination for the duration of the data retention period

---

## The 5 Hardest SOC 2 Questions for Min

### Question 1: "How do you maintain separation of duties when one person has access to everything?"

**Why it's hard for Min:** SOC 2 CC5.1 requires "The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels." Separation of duties is a foundational control activity. Jon Cambras is simultaneously the developer, the system administrator, the security officer, and the only person who can modify production systems. He can write code, deploy it, access production data, modify audit logs, and approve his own changes — with no oversight.

**Recommended approach:**
1. **Automated controls that operate independently of any individual.** Min's audit trail writes to Salesforce (a system the founder cannot silently modify without Salesforce admin audit trail logging the change). Salesforce validation rules (once configured) prevent deletion/modification of audit records even by the admin.
2. **External review.** Engage a contract security reviewer quarterly to review code changes, access logs, and security configurations. Document the review.
3. **Customer audit rights.** Grant customers the right to audit Min's security practices. This provides external oversight.
4. **Compensating controls documentation.** Write a specific document titled "Compensating Controls for Solo Founder Operations" that describes: what risks are elevated by the solo-founder structure, what automated controls mitigate those risks, what external review mechanisms exist, and when additional personnel will be hired to establish proper separation.

### Question 2: "How do you ensure your audit trail is tamper-proof when the same person who writes the code also manages the audit system?"

**Why it's hard for Min:** The audit trail is Min's primary compliance control. It's cited as SEC Rule 17a-4 compliant. But the founder could: modify the audit code to stop logging certain actions, delete Salesforce Task records, or change the PII scrubbing logic to hide a breach. The audit trail is write-once by design — but the person who designed it can change the design.

**Recommended approach:**
1. **Salesforce validation rules** preventing edit/delete of `MIN:AUDIT` tasks. This is already recommended in the code (`audit.ts:13-14`) but must be verified as configured in each customer's org.
2. **Dual-write to independent system.** Write audit entries to both Salesforce (customer-controlled) and an independent log aggregation service (e.g., Datadog with immutable logs). Neither system is fully controlled by the founder.
3. **Git commit signing.** Sign all commits to prove code authorship and prevent retroactive modification.
4. **Quarterly audit log integrity check.** Compare Salesforce audit records against independent log store. Document results.

### Question 3: "Your application handles SSNs but doesn't encrypt them at field level. How do you justify this?"

**Why it's hard for Min:** SSNs are the highest-sensitivity PII identifier. Min reads SSNs from Salesforce, displays them in the browser (masked by default, revealable), and transmits them over HTTPS. Min does not add field-level encryption — it relies on Salesforce's platform encryption and HTTPS transport security. For a financial services SOC 2, auditors will specifically probe SSN handling.

**Recommended approach:**
1. **Document that Min does not store SSNs.** SSNs exist in the customer's Salesforce org (encrypted per Salesforce Shield, if the customer has enabled it). Min reads SSNs at query time, displays them transiently in the browser session, and does not persist them to any Min-controlled storage (confirmed: audit logs scrub SSNs, analytics exclude SSNs, Turso has no SSN fields).
2. **Recommend Salesforce Shield Platform Encryption** to customers as part of onboarding. Document this recommendation.
3. **Implement lazy-loading for SSNs.** Don't fetch SSNs on initial page load — only when the user explicitly requests to view them (click to reveal). This reduces the attack surface.
4. **Add SSN access logging.** When a user views an SSN (clicks the reveal toggle), log this event to the audit trail with the user's identity. This creates accountability.

### Question 4: "Your fire-and-forget audit logging means audit records can be permanently lost. How is this acceptable for SEC-regulated data?"

**Why it's hard for Min:** The audit system writes to Salesforce asynchronously. If the Salesforce API is down, the write fails silently (`audit.ts:117-147`). The audit record is permanently lost. For an application that claims SEC Rule 17a-4 compliance awareness, this is a direct contradiction — 17a-4 requires records to be preserved.

**Recommended approach:**
1. **Implement write-ahead logging.** Before the Salesforce API call, write the audit entry to Turso (synchronous, local). Then replicate to Salesforce (async). If Salesforce write fails, the entry remains in Turso and is retried.
2. **Monitor audit health.** Create a dashboard metric: "Audit entries written to Salesforce vs. Turso." Alert if they diverge (indicating failed replication).
3. **Document the design change** and the rationale. The auditor wants to see that you identified the gap and remediated it — that's exactly the kind of evidence that builds confidence.

### Question 5: "You use AI coding tools to write code that handles regulated financial data. How do you verify that AI-generated code is secure?"

**Why it's hard for Min:** Min is substantially built with AI coding tools (Claude Code). Commit messages include "Co-Authored-By: Claude" headers. This is a new category of supply chain risk that SOC 2 auditors are increasingly asking about. The concern: AI tools can introduce subtle security vulnerabilities that a solo developer might miss, especially without code review from a second human.

**Recommended approach:**
1. **Document the AI code review process** (see Section 1.5 — AI-Generated Code Review Checklist). Every change reviewed against a security-focused checklist before merge.
2. **Automated security scanning.** Add `npm audit` and Snyk/Dependabot to CI pipeline. These catch known vulnerability patterns regardless of whether a human or AI wrote the code.
3. **Comprehensive test suite.** Min has 767 tests covering security-critical paths (SOQL injection, input validation, PII scrubbing, compliance logic). This is the strongest mitigating control — the test suite verifies behavior regardless of how the code was written.
4. **Periodic external code review.** Engage a contract security engineer quarterly to review recent changes, focusing on: authentication, authorization, encryption, data handling, and API security.
5. **Frame it positively.** AI coding tools are a productivity multiplier that allows a solo founder to build and maintain a 20-screen application with comprehensive security controls. The alternative is hiring 3-4 developers and introducing insider threat risk. The risk model is different, not necessarily worse.

---

*End of SOC 2 Type II Readiness Assessment*

*This assessment should be reviewed and updated at least annually, or whenever significant changes are made to Min's architecture, data handling, or organizational structure. The next scheduled review date is February 2027.*

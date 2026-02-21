# Min — Information Security Policy

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** February 21, 2027
**Classification:** Internal

---

## 1. Purpose and Scope

This policy establishes the information security requirements for Min, an AI workflow orchestration platform for SEC-registered RIA firms. It applies to:

- All production systems (application, database, integrations)
- All client data (PII, financial data, custodial credentials)
- All development and staging environments
- All third-party integrations (Salesforce, DocuSign, Turso, Vercel)
- All personnel with access to Min systems (currently: 1 employee)

This policy is a SOC 2 control document. It will be reviewed annually and updated whenever significant changes occur to Min's architecture, data handling, or organizational structure.

---

## 2. Roles and Responsibilities

| Role | Assigned To | Responsibilities |
|------|------------|------------------|
| Security Officer | Jon Cambras | Policy maintenance, risk assessment, incident response, vendor management, access review |
| Development Lead | Jon Cambras | Secure coding practices, code review, dependency management, deployment |
| System Administrator | Jon Cambras | Infrastructure management, monitoring, backup, access provisioning |
| Data Protection Officer | Jon Cambras | Privacy policy, data subject requests, regulatory compliance (Reg S-P, CCPA) |

**Solo Founder Compensating Controls:**
All roles are currently held by one person. This is a known risk mitigated by:
- Automated technical controls that operate independently of any individual (encryption, RBAC, audit logging, CSRF protection)
- Quarterly self-assessment using the checklist in Appendix A
- Customer audit rights (allowing customers to request evidence of security practices)
- External security review (quarterly contract security reviewer for high-risk changes)
- Immutable audit trail stored in customer-controlled Salesforce org with validation rules preventing modification

---

## 3. Data Classification

Min classifies all data into three tiers. The full classification matrix is maintained in the SOC 2 Readiness Assessment (Section 5.1).

### 3.1 Confidential
Data whose unauthorized disclosure would cause significant harm. Requires encryption, access controls, and audit logging.

- Client SSNs, dates of birth
- Bank account numbers, financial balances
- OAuth access and refresh tokens
- Custodial credentials (API keys, private keys)
- DocuSign RSA private key
- Salesforce client credentials
- `SF_COOKIE_SECRET` encryption key

### 3.2 Internal
Data used for business operations. Not intended for public access but lower risk than Confidential.

- Client names, emails, phone numbers
- Audit log entries (PII scrubbed)
- Org schema mappings
- Task subjects and descriptions
- Compliance check results
- Aggregate analytics

### 3.3 Public
Data intended for or acceptable for public access.

- Product documentation
- Marketing materials
- Custodian rules (document requirement lookups)
- Open-source dependencies

---

## 4. Access Control Policy

### 4.1 Authentication
- All user authentication is delegated to Salesforce OAuth 2.0 Authorization Code flow
- Min does not maintain its own user database or password store
- MFA enforcement depends on the customer's Salesforce org configuration
- Min recommends all customers enable MFA in their Salesforce org

### 4.2 Session Management
- 15-minute idle timeout returns user to role selection (SEC/FINRA compliance)
- OAuth cookies: httpOnly, secure, sameSite=lax
- CSRF protection: double-submit cookie with constant-time comparison
- Session tokens encrypted with AES-256-GCM

### 4.3 Role-Based Access Control
Three roles are enforced server-side:

| Role | Access Level |
|------|-------------|
| **Advisor** | Read all data, record compliance reviews, record meeting notes |
| **Operations** | Read all data, onboarding, account opening, task management, compliance reviews, DocuSign |
| **Principal** | Full access to all actions including audit trail and dashboard |

Role is transmitted via `x-user-role` header and validated against a server-side permission matrix before every API action is executed.

### 4.4 Access Provisioning
- All access requests documented with: requester, approver, systems, access level, business justification
- Access granted on principle of least privilege
- Access reviewed quarterly (see Appendix A)
- Upon termination: all access revoked within 24 hours, all credentials rotated, all sessions terminated

### 4.5 Current Access Inventory
| System | Access Holder | Access Level |
|--------|--------------|-------------|
| GitHub repository | Jon Cambras | Owner |
| Vercel hosting | Jon Cambras | Admin |
| Salesforce Connected App | Jon Cambras | Admin |
| Turso database | Jon Cambras | Admin |
| DocuSign integration | Jon Cambras | Admin |
| Domain/DNS | Jon Cambras | Admin |
| Environment secrets | Jon Cambras | Direct access |

---

## 5. Acceptable Use

### 5.1 Permitted Use
- Company systems may only be used for authorized business purposes
- Development and testing of Min platform
- Customer support and incident response
- Security monitoring and compliance activities

### 5.2 Prohibited Activities
- Storing credentials in plaintext outside approved systems (environment variables, secrets managers)
- Sharing credentials via unencrypted channels (email, Slack, SMS)
- Accessing customer data without a business justification
- Disabling or circumventing security controls (audit logging, CSRF protection, encryption)
- Installing unapproved software on systems with access to production data

---

## 6. Encryption Policy

### 6.1 Encryption at Rest
- OAuth tokens: AES-256-GCM with scrypt-derived keys (16-byte random IV per operation)
- Org schema mappings: AES-256-GCM with scrypt-derived keys
- Environment variables: encrypted by Vercel at rest
- Client PII: stored in customer's Salesforce org (Salesforce Shield recommended)
- `SF_COOKIE_SECRET` is required in all environments; application will not start without it

### 6.2 Encryption in Transit
- All external API calls use TLS 1.2+ (HTTPS)
- HSTS header enforced (max-age=31536000, includeSubDomains)
- All cookies marked `secure: true` in production

### 6.3 Key Management
- Encryption keys stored as environment variables, never in source code
- Key rotation: semi-annual schedule (documented in operations runbook)
- Dev fallback keys prohibited — removed from codebase

---

## 7. Vulnerability Management

### 7.1 Dependency Scanning
- GitHub Dependabot enabled for automated vulnerability alerts and PRs
- `pnpm audit` runs in CI pipeline on every push and pull request
- Known vulnerabilities above HIGH severity block deployment

### 7.2 Penetration Testing
- Annual penetration test by a qualified third-party firm
- Focus areas: OAuth flow, SOQL injection, CSRF bypass, session management, cross-tenant access, RBAC enforcement

### 7.3 Vulnerability Disclosure
- Security contact: security@min.com
- SECURITY.md published in GitHub repository
- `/.well-known/security.txt` published on production domain

---

## 8. Change Management

### 8.1 Change Categories
- **Standard:** Routine changes (dependency updates, configuration). Pre-approved, documented post-deployment.
- **Normal:** Feature additions, bug fixes, refactoring. Require review, testing, and approval before deployment.
- **Emergency:** Security patches, critical bug fixes. May bypass normal review but require post-deployment review within 24 hours.

### 8.2 Change Process (Normal Changes)
1. Create branch from main
2. Implement change
3. All tests must pass (`pnpm test`)
4. Lint must pass (`pnpm lint`)
5. TypeScript compilation must pass (`pnpm build`)
6. For AI-generated code: complete the AI-Generated Code Review Checklist
7. Create pull request with description of change and test plan
8. CI pipeline must pass (GitHub Actions)
9. Merge to main
10. Automated deployment via Vercel
11. Post-deployment smoke test

### 8.3 AI-Generated Code Review Checklist
All code generated with AI tools (Claude Code, Copilot, etc.) must be reviewed against:
- [ ] All generated code reviewed line-by-line
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] No new dependencies introduced without evaluation
- [ ] Input validation on all new user-facing inputs
- [ ] No PII logging or exposure
- [ ] No new API endpoints without authentication/authorization
- [ ] No SQL/SOQL injection vectors
- [ ] AI tool and prompt documented in commit message

---

## 9. Incident Response

The full Incident Response Plan is maintained as a separate document. Key elements:

- **Severity levels:** SEV-1 (Critical) through SEV-4 (Low)
- **Response SLAs:** SEV-1 immediate, SEV-2 within 2 hours, SEV-3 within 24 hours, SEV-4 within 1 week
- **Customer notification:** Within 72 hours for confirmed data breaches
- **Forensic procedures:** Evidence preservation, chain of custody, external forensics engagement for SEV-1
- **Communication templates:** Customer notification, regulatory notification, internal incident report
- **Post-incident review:** Within 5 business days of resolution

See SOC 2 Readiness Assessment Section 2.6 for full scenario-specific response plans.

---

## 10. Vendor Management

### 10.1 Vendor Assessment
All vendors that process or store Min's data or customer data must be assessed for:
- Security certifications (SOC 2, ISO 27001)
- Data Processing Agreements
- Subprocessor management
- Incident notification SLAs
- Business continuity capabilities

### 10.2 Current Vendors
| Vendor | SOC 2 Status | Data Shared | Review Cadence |
|--------|-------------|-------------|----------------|
| Salesforce | Type II certified | Client PII via API | Annual |
| Vercel | Type II certified | Application code, env vars | Annual |
| DocuSign | Type II certified | Client names, document content | Annual |
| Turso | In progress | Aggregate analytics (no PII) | Semi-annual |
| GitHub | Type II certified | Source code | Annual |
| Wealthbox | Not available | None (planned) | Pre-integration |
| BridgeFT | Type II certified | Custodial data (planned) | Pre-integration |

### 10.3 Vendor Review
- SOC 2 reports requested and reviewed annually for critical vendors
- New vendors assessed before adoption using the Vendor Risk Assessment Template
- Vendor incidents tracked and documented

---

## 11. Exception Handling

When a policy requirement cannot be followed:
1. Document the exception with: policy section, business justification, compensating control, risk level
2. Approve the exception (Security Officer — currently Jon Cambras)
3. Set a review date (maximum 90 days)
4. Store the exception in the policy exceptions log
5. Review and renew or close at the review date

---

## 12. Policy Review

- This policy is reviewed annually at minimum
- Additional reviews triggered by: significant architecture changes, new integrations, security incidents, regulatory changes
- Review documented with: reviewer, date, changes made, next review date

---

## Appendix A: Quarterly Self-Assessment Checklist

- [ ] All systems in access inventory reviewed — access still required and appropriate
- [ ] Credentials rotated for any system with rotation due
- [ ] Dependency vulnerabilities reviewed and patched
- [ ] Audit log integrity verified (Salesforce records match expected count)
- [ ] Vendor SOC 2 reports current (annual review cycle)
- [ ] Risk register reviewed — any new risks identified?
- [ ] Security awareness training current (annual completion)
- [ ] Incident response plan reviewed — any needed updates?
- [ ] Backup restore tested (Turso database)
- [ ] Exception log reviewed — any expired exceptions?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial policy |

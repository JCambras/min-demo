# Min — Privacy Policy

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Public

---

## 1. Introduction

Min is an AI workflow orchestration platform for SEC-registered Registered Investment Advisors (RIAs). This privacy policy describes what personal information Min collects, how it is used, how it is protected, and the rights of individuals whose data is processed.

Min processes data on behalf of RIA firms (our customers). In most cases, Min acts as a **data processor** on behalf of the RIA firm, which is the **data controller** with respect to their clients' personal information.

---

## 2. Information We Collect

### 2.1 Client Information (Processed on Behalf of RIA Firms)

Min processes the following categories of personal information as directed by its RIA customers:

| Category | Data Elements | Purpose |
|----------|--------------|---------|
| Identity | First name, last name, date of birth, SSN, citizenship, government ID | Account opening, regulatory compliance (SEC/FINRA KYC) |
| Contact | Email address, phone number, mailing address | Communications, account correspondence |
| Financial | Annual income, net worth, liquid net worth, investment experience, risk tolerance | Suitability determination (FINRA Rule 2111) |
| Account | Account types, funding details, beneficiary designations | Account setup and management |
| Employment | Employment status, employer name | Regulatory compliance, suitability |
| Trusted Contact | Name, phone, relationship | FINRA Rule 4512 compliance |
| Banking | Bank name, routing number (last 4), account number (last 4) | ACH/MoneyLink setup |

### 2.2 Operational Data (Collected by Min)

| Category | Data Elements | Purpose |
|----------|--------------|---------|
| Authentication | Salesforce OAuth tokens, session identifiers | Secure access to CRM data |
| Audit Trail | Action performed, timestamp, actor, result, duration | SEC books and records, compliance monitoring |
| Analytics | Anonymized usage events (PII stripped) | Product improvement |
| System Logs | IP addresses, user agent, request timestamps | Security monitoring, troubleshooting |

### 2.3 Information We Do NOT Collect

- Min does not use LLMs or AI models in production — the compliance engine is 100% deterministic
- Min does not send client PII to any AI/ML service
- Min does not collect biometric data
- Min does not track users across websites

---

## 3. How We Use Information

| Purpose | Legal Basis | Data Categories Used |
|---------|-------------|---------------------|
| Account opening workflows | Contractual obligation (processor on behalf of RIA) | Identity, Contact, Financial, Account |
| Regulatory compliance (KYC, suitability) | Legal obligation (SEC, FINRA rules) | Identity, Financial, Employment |
| Audit trail maintenance | Legal obligation (SEC Rule 17a-4) | All categories (PII-scrubbed in logs) |
| DocuSign document preparation | Contractual obligation | Identity, Contact, Account |
| System security and monitoring | Legitimate interest | Operational Data, System Logs |
| Product improvement | Legitimate interest (anonymized only) | Analytics (PII-stripped) |

---

## 4. How We Protect Information

### 4.1 Technical Controls

| Control | Implementation |
|---------|---------------|
| Encryption in transit | TLS 1.2+ enforced via HSTS (31536000s) |
| Encryption at rest | AES-256-GCM for OAuth tokens; Salesforce platform encryption for CRM data |
| Session management | 8-hour session duration, httpOnly/secure cookies, token revocation on logout |
| Access control | Server-side RBAC with 3 roles and 18-action permission matrix |
| Input validation | SOQL injection prevention, 200-char limits, Salesforce ID format validation |
| CSRF protection | Double-submit cookie pattern with constant-time comparison |
| PII scrubbing | SSN, DOB, ID numbers, bank details redacted before audit log persistence |
| Rate limiting | 100 requests/minute per IP on API routes |

### 4.2 Organizational Controls

| Control | Implementation |
|---------|---------------|
| Security policies | Information Security Policy, Change Management, Personnel Security, Vendor Management |
| Incident response | Incident Response Plan with 5 scenario playbooks |
| Risk assessment | 12-risk register with quarterly P1 review |
| Vendor management | SOC 2 report review for Critical/High vendors |
| Security training | Annual security awareness training |

---

## 5. Data Sharing

### 5.1 Third-Party Processors

Min shares data with the following third-party processors solely to provide its services:

| Processor | Data Shared | Purpose | Safeguards |
|-----------|------------|---------|------------|
| Salesforce | Client PII, household data, audit records | CRM storage, data controller's system of record | SOC 2 Type II, DPA in MSA |
| DocuSign | Client names, emails, account details | Electronic signature for account opening | SOC 2 Type II, DPA in MSA |
| Vercel | Application code, environment variables | Application hosting | SOC 2 Type II |
| Turso | Analytics, audit buffer (PII-scrubbed) | Local database for write-ahead logging | DPA pending |

### 5.2 We Do NOT

- Sell personal information
- Share personal information for advertising purposes
- Provide personal information to data brokers
- Transfer personal information outside the United States (all processors are US-based or have US data residency)

---

## 6. Data Retention

| Data Category | Retention Period | Basis | Disposal Method |
|---------------|-----------------|-------|----------------|
| Client PII in Salesforce | Duration of advisory relationship + 5 years | SEC Rule 204-2 (books and records) | Customer-controlled deletion in Salesforce |
| Audit trail (Salesforce) | 6 years minimum | SEC Rule 17a-4 | Immutable — validation rules prevent deletion |
| Audit buffer (Turso) | 12 months rolling | Operational | Automated purge after Salesforce sync confirmed |
| Analytics events (Turso) | 12 months rolling | Operational | Automated purge |
| Session data (cookies) | 8 hours | Operational | Automatic expiration |
| System logs (Vercel) | Per Vercel retention policy | Operational | Vercel platform retention |

### 6.1 Customer Data Deletion

When an RIA customer offboards from Min:

1. All Turso records for the customer's org are purged via `DELETE /api/admin/offboard`
2. Salesforce records remain in the customer's own Salesforce org (customer-controlled)
3. Deletion confirmation with record counts is provided to the customer
4. Turso deletion is permanent and irreversible

---

## 7. Data Subject Rights

Individuals whose data is processed by Min (i.e., clients of RIA firms using Min) may have the following rights, exercised through their RIA firm:

| Right | Description | How to Exercise |
|-------|-------------|----------------|
| Access | Request a copy of personal information held | Contact your financial advisor |
| Correction | Request correction of inaccurate information | Contact your financial advisor |
| Deletion | Request deletion of personal information | Contact your financial advisor (subject to regulatory retention requirements) |
| Portability | Request personal information in a portable format | Contact your financial advisor |
| Restriction | Request restriction of processing | Contact your financial advisor |

### 7.1 RIA Customer Requests

RIA firms (Min's direct customers) may exercise their rights by contacting Min at:

- **Email:** privacy@minplatform.com
- **Response time:** Within 30 days of verified request
- **Data export:** Available in JSON or CSV format
- **Data deletion:** Via offboarding API with confirmation

### 7.2 Regulatory Requests

Min will cooperate with lawful regulatory requests for data from the SEC, FINRA, state securities regulators, and law enforcement. Such requests will be documented and the affected RIA customer will be notified unless prohibited by law.

---

## 8. California Privacy Rights (CCPA/CPRA)

If applicable, California residents have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):

- **Right to Know:** Categories and specific pieces of personal information collected
- **Right to Delete:** Deletion of personal information (subject to regulatory retention exceptions)
- **Right to Opt-Out of Sale:** Min does not sell personal information
- **Right to Non-Discrimination:** Exercising privacy rights will not affect service quality
- **Right to Correct:** Correction of inaccurate personal information
- **Right to Limit Use of Sensitive Personal Information:** Min uses sensitive PI (SSN, financial data) only for account opening and regulatory compliance

---

## 9. Children's Privacy

Min does not knowingly collect personal information from individuals under 18 years of age. Account opening requires the applicant to be at least 18 (enforced by DOB validation in the application).

---

## 10. Changes to This Policy

We may update this privacy policy to reflect changes in our practices or regulatory requirements. Material changes will be communicated to RIA customers via email at least 30 days before they take effect. The "Effective Date" at the top of this policy indicates when it was last updated.

---

## 11. Contact Information

For privacy-related inquiries:

- **Email:** privacy@minplatform.com
- **Mail:** [Business address]
- **Response time:** Within 30 days

For security vulnerabilities, see [SECURITY.md](../SECURITY.md).

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial privacy policy |

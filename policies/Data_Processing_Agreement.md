# Min — Data Processing Agreement (Template)

**Version:** 1.0 (Template — Requires Legal Review Before Execution)
**Effective Date:** [To be completed upon execution]
**Classification:** Confidential

> **NOTICE:** This is a template Data Processing Agreement (DPA) for use between Min and its RIA customers. It must be reviewed by qualified legal counsel before execution. This template does not constitute legal advice.

---

## 1. Parties

- **Data Controller ("Customer"):** [RIA Firm Name], a registered investment adviser with the SEC (CRD# [number])
- **Data Processor ("Min"):** Min Platform, operated by [Legal Entity Name]

---

## 2. Definitions

| Term | Definition |
|------|-----------|
| Personal Data | Any information relating to an identified or identifiable natural person processed by Min on behalf of Customer |
| Processing | Any operation performed on Personal Data, including collection, storage, retrieval, use, disclosure, or deletion |
| Sub-processor | A third party engaged by Min to process Personal Data on behalf of Customer |
| Data Subject | The individual to whom Personal Data relates (Customer's clients) |
| Security Incident | Any unauthorized access, disclosure, alteration, or destruction of Personal Data |

---

## 3. Scope of Processing

### 3.1 Categories of Data Subjects

- Customer's investment advisory clients
- Customer's client household members
- Customer's client trusted contacts and beneficiaries

### 3.2 Categories of Personal Data

| Category | Data Elements |
|----------|--------------|
| Identity | Name, date of birth, SSN, citizenship, government ID |
| Contact | Email, phone, mailing address |
| Financial | Income, net worth, investment profile, risk tolerance |
| Account | Account types, funding details, beneficiary designations |
| Employment | Employment status, employer |
| Banking | Bank name, routing (last 4), account (last 4) |

### 3.3 Purpose of Processing

Min processes Personal Data solely to:

1. Execute account opening workflows as directed by Customer
2. Generate and send documents for electronic signature via DocuSign
3. Maintain audit trail records for regulatory compliance
4. Perform compliance checks as configured by Customer
5. Provide reporting and analytics (PII-scrubbed)

### 3.4 Duration of Processing

Processing continues for the duration of the service agreement between the Parties. Upon termination, Min will delete Customer's data per Section 9.

---

## 4. Obligations of Min (Data Processor)

Min shall:

1. **Process only on instructions:** Process Personal Data only on documented instructions from Customer, unless required by law
2. **Confidentiality:** Ensure that personnel authorized to process Personal Data are bound by confidentiality obligations
3. **Security measures:** Implement technical and organizational measures per Section 6
4. **Sub-processors:** Not engage Sub-processors without Customer's prior written consent (see Section 5)
5. **Data Subject requests:** Assist Customer in responding to Data Subject rights requests
6. **Security Incidents:** Notify Customer of Security Incidents per Section 7
7. **Deletion:** Delete or return Personal Data upon termination per Section 9
8. **Audit:** Make available information necessary to demonstrate compliance with this DPA

---

## 5. Sub-processors

### 5.1 Approved Sub-processors

Customer consents to Min's use of the following Sub-processors:

| Sub-processor | Processing Activity | Location |
|--------------|---------------------|----------|
| Salesforce | CRM data storage, system of record | United States |
| DocuSign | Electronic signature services | United States |
| Vercel | Application hosting | United States |
| Turso | Analytics database, audit buffer | United States |

### 5.2 Changes to Sub-processors

Min shall:

1. Notify Customer at least 30 days before engaging a new Sub-processor
2. Provide Customer the opportunity to object to the new Sub-processor
3. If Customer objects and Min cannot accommodate, either Party may terminate the service agreement
4. Impose equivalent data protection obligations on each Sub-processor via written agreement

---

## 6. Security Measures

Min implements the following technical and organizational measures:

### 6.1 Technical Measures

| Measure | Implementation |
|---------|---------------|
| Encryption in transit | TLS 1.2+ with HSTS enforcement |
| Encryption at rest | AES-256-GCM for authentication tokens |
| Access control | Server-side RBAC with role-based permission matrix |
| Authentication | OAuth 2.0 with 8-hour session duration |
| Input validation | SOQL injection prevention, parameterized queries |
| CSRF protection | Double-submit cookie pattern |
| Rate limiting | 100 requests/minute per IP |
| Audit logging | Write-ahead buffer with PII scrubbing |
| Dependency scanning | Automated vulnerability scanning via Dependabot |
| CI/CD security | Required CI checks, branch protection |

### 6.2 Organizational Measures

| Measure | Implementation |
|---------|---------------|
| Information Security Policy | Documented and reviewed semi-annually |
| Risk Assessment | 12-risk register, quarterly P1 review |
| Incident Response Plan | 5 scenario playbooks, quarterly tabletop exercises |
| Personnel Security | Background checks, security awareness training |
| Vendor Management | SOC 2 review for Critical/High vendors |
| Change Management | Categorized change process with CI gate |

---

## 7. Security Incident Notification

### 7.1 Notification Timeline

Min shall notify Customer of a confirmed Security Incident without undue delay and no later than **72 hours** after becoming aware of the incident.

### 7.2 Notification Content

The notification shall include, to the extent known:

1. Nature of the Security Incident, including categories and approximate number of Data Subjects affected
2. Name and contact details of Min's point of contact
3. Description of likely consequences
4. Description of measures taken or proposed to address the incident

### 7.3 Ongoing Communication

Min shall provide updates as additional information becomes available and cooperate with Customer's investigation and response efforts.

---

## 8. Audit Rights

### 8.1 Information Requests

Min shall make available to Customer all information necessary to demonstrate compliance with this DPA, including:

- SOC 2 Type II report (when available)
- Security assessment results
- Sub-processor compliance documentation
- Incident reports (if any)

### 8.2 On-Site Audit

Customer may conduct or commission an audit of Min's processing activities:

- **Frequency:** Once per 12-month period (additional audits for cause)
- **Notice:** 30 days written notice
- **Scope:** Limited to processing activities under this DPA
- **Confidentiality:** Audit results are confidential to the Parties
- **Cost:** Customer bears audit costs; Min bears cost of its own personnel time

---

## 9. Data Return and Deletion

### 9.1 Upon Termination

Upon termination of the service agreement:

1. Min shall cease processing Personal Data within 5 business days
2. Customer may request return of Personal Data in JSON or CSV format within 30 days of termination
3. After the 30-day retrieval period, Min shall delete all Personal Data from its systems within 15 business days
4. Min shall provide written confirmation of deletion

### 9.2 Deletion Method

| System | Deletion Method |
|--------|----------------|
| Turso (analytics, audit buffer) | `DELETE FROM [table] WHERE org_id = ?` via offboarding API |
| Salesforce | Records remain in Customer's Salesforce org (Customer-controlled) |
| Vercel logs | Expire per Vercel retention policy |
| Backups | Purged within 30 days of deletion request |

### 9.3 Regulatory Retention Exception

Notwithstanding Section 9.1, Min may retain Personal Data to the extent required by applicable law (including SEC Rule 17a-4 retention requirements). Such retained data shall continue to be protected under this DPA.

---

## 10. International Data Transfers

Min processes all Personal Data within the United States. If international transfer becomes necessary, Min shall:

1. Notify Customer in advance
2. Implement appropriate transfer mechanisms (Standard Contractual Clauses or equivalent)
3. Ensure equivalent data protection in the receiving jurisdiction

---

## 11. Liability

[To be negotiated between the Parties — consult legal counsel]

Suggested framework:
- Min's aggregate liability under this DPA shall not exceed [amount or formula]
- Exclusions for willful misconduct or gross negligence
- Indemnification for third-party claims arising from Min's breach of this DPA

---

## 12. Term and Termination

- This DPA is effective upon execution and continues for the duration of the service agreement
- Either Party may terminate for material breach with 30 days written notice and opportunity to cure
- Sections 7 (Security Incidents), 8 (Audit), 9 (Deletion), and 11 (Liability) survive termination

---

## 13. Governing Law

This DPA shall be governed by the laws of [State], without regard to conflict of laws principles.

---

## Signatures

| | Data Controller (Customer) | Data Processor (Min) |
|-|---------------------------|---------------------|
| **Name:** | _________________________ | _________________________ |
| **Title:** | _________________________ | _________________________ |
| **Date:** | _________________________ | _________________________ |
| **Signature:** | _________________________ | _________________________ |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial DPA template (requires legal review) |

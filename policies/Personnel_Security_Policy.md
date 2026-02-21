# Min — Personnel Security Policy

**Version:** 1.0
**Effective Date:** February 21, 2026
**Owner:** Jon Cambras, Founder / Acting CISO
**Next Review Date:** August 21, 2026
**Classification:** Internal

---

## 1. Purpose

This policy establishes security requirements for personnel with access to Min's systems and client data. It covers hiring, onboarding, ongoing security awareness, and offboarding procedures. As a solo-founder company, this policy is structured to scale with future hires while documenting current compensating controls.

---

## 2. Scope

This policy applies to:

- The founder (currently the sole personnel with system access)
- Future employees, contractors, and consultants
- Any individual granted access to Min's production systems, source code, or client data

---

## 3. Pre-Hire Screening

### 3.1 Current State (Solo Founder)

The founder holds a Series 65 license (Investment Adviser Representative) and is registered with the SEC, which requires:

- Criminal background check (state and federal)
- U4 disclosure of regulatory actions, complaints, and financial disclosures
- Fingerprinting on file with FINRA/CRD

### 3.2 Future Hires

Before granting access to Min systems, all new personnel must complete:

| Check | Requirement | Provider |
|-------|------------|----------|
| Identity verification | Government-issued photo ID | HR / hiring manager |
| Criminal background | Federal and state criminal records (7 years) | Checkr or equivalent |
| Employment verification | Prior employer confirmation (last 3 positions) | Checkr or equivalent |
| Reference check | Two professional references | Hiring manager |
| NDA | Signed non-disclosure agreement | Legal |
| Regulatory check | FINRA BrokerCheck / SEC IAPD (if applicable) | Compliance |

### 3.3 Contractor and Consultant Access

Contractors and consultants must:

1. Sign an NDA and Data Processing Agreement
2. Complete background check (criminal + identity verification)
3. Receive access scoped to the minimum required for their engagement
4. Have access revoked within 24 hours of engagement end

---

## 4. Access Provisioning

### 4.1 Principle of Least Privilege

All access is granted on a need-to-know basis. The RBAC permission matrix defines three roles:

| Role | Description | Access Level |
|------|-------------|-------------|
| Advisor | Financial advisor — read-only + compliance reviews | Read all, write compliance reviews and meeting notes |
| Operations | Operations team — full workflow access | Read all, write all except meeting notes |
| Principal | Firm owner/principal — full access | Read all, write all |

### 4.2 System Access Matrix

| System | Founder | Future: Operations | Future: Developer | Future: Contractor |
|--------|---------|-------------------|-------------------|-------------------|
| GitHub (source code) | Admin | No access | Write | Read (scoped repo) |
| Vercel (deployment) | Admin | Viewer | Developer | No access |
| Turso (database) | Admin | No access | Read-only | No access |
| Salesforce (production) | System Admin | Standard User | No access | No access |
| Min application | Principal | Operations | No access | No access |

### 4.3 Access Request Process

1. Manager submits access request via internal form (future: ticketing system)
2. Founder/CISO reviews and approves based on role requirements
3. Access provisioned within 1 business day
4. Access logged in personnel access register

---

## 5. Security Awareness Training

### 5.1 Required Training

All personnel with system access must complete:

| Training | Frequency | Provider | Duration |
|----------|-----------|----------|----------|
| Security awareness fundamentals | Annual | KnowBe4 or SANS Securing the Human | 1 hour |
| Phishing simulation | Quarterly | KnowBe4 | Ongoing |
| Secure development practices | Annual (developers only) | OWASP or SANS | 2 hours |
| Incident response procedures | Annual | Internal (tabletop exercise) | 1 hour |

### 5.2 Founder Self-Training (Current State)

Until additional personnel are hired, the founder will:

1. Complete an annual security awareness course (KnowBe4 or SANS) — **Target: April 2026**
2. Document completion with certificate of completion
3. Review OWASP Top 10 annually and verify Min's codebase addresses each category
4. Conduct a quarterly self-assessment of security practices

### 5.3 Training Records

Training completion records are maintained in the compliance platform with:

- Personnel name
- Training course name and provider
- Completion date
- Certificate or proof of completion
- Next due date

---

## 6. Acceptable Use

### 6.1 General Requirements

All personnel must:

- Use strong, unique passwords (minimum 12 characters) for all Min-related accounts
- Enable multi-factor authentication (MFA) on all systems that support it
- Lock workstations when unattended
- Not share credentials or access tokens
- Not store client PII on personal devices or unapproved cloud services
- Report suspected security incidents immediately per the Incident Response Plan

### 6.2 Device Requirements

| Requirement | Standard |
|-------------|----------|
| Disk encryption | FileVault (macOS) or BitLocker (Windows) enabled |
| OS updates | Applied within 7 days of release |
| Antivirus/EDR | macOS: XProtect (built-in); Windows: Defender or enterprise EDR |
| Screen lock | Auto-lock after 5 minutes of inactivity |
| Firewall | Enabled (macOS: built-in; Windows: Windows Firewall) |

### 6.3 Prohibited Activities

- Disabling security controls (audit logging, RBAC, CSRF protection)
- Accessing client data without a business need
- Sharing production credentials via email, chat, or unencrypted channels
- Installing unapproved software on devices used to access Min systems
- Bypassing CI/CD pipeline controls (e.g., `--no-verify` on commits)

---

## 7. Access Review

| Review Type | Frequency | Reviewer |
|-------------|-----------|----------|
| User access audit | Quarterly | Founder/CISO |
| Privileged access review | Quarterly | Founder/CISO |
| Service account review | Semi-annually | Founder/CISO |
| Third-party access review | Semi-annually | Founder/CISO |

Each review must confirm:

1. All active accounts have a corresponding active employee/contractor
2. Access levels match current role requirements
3. No dormant accounts (unused > 90 days)
4. MFA is enabled on all accounts

---

## 8. Offboarding / Access Deprovisioning

### 8.1 Offboarding Checklist

When an individual's access needs to be revoked (termination, end of engagement, role change):

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Disable Min application access (deactivate Salesforce user) | Within 4 hours |
| 2 | Revoke GitHub repository access | Within 4 hours |
| 3 | Remove Vercel team access | Within 4 hours |
| 4 | Rotate any shared credentials the individual had access to | Within 24 hours |
| 5 | Revoke OAuth tokens and API keys | Within 4 hours |
| 6 | Collect company devices (if applicable) | Within 5 business days |
| 7 | Confirm data deletion from personal devices | Within 5 business days |
| 8 | Log offboarding completion in personnel register | Same day |

### 8.2 Involuntary Termination

For involuntary terminations or suspected security incidents:

- Access revoked immediately (within 1 hour)
- All sessions terminated
- Credentials rotated within 4 hours
- Incident response team notified if security concern

---

## 9. Policy Violations

Violations of this policy may result in:

1. Verbal warning and mandatory re-training (first offense, minor violation)
2. Written warning (repeated minor violations or single significant violation)
3. Termination of access and/or employment (serious violations or data breach)
4. Legal action if required by regulatory obligations

---

## 10. Solo Founder Compensating Controls

| Traditional Control | Compensating Control |
|---------------------|---------------------|
| HR-managed onboarding | Documented self-onboarding checklist |
| Manager-approved access | Self-assessment with quarterly audit |
| Team-based separation of duties | Write-ahead audit buffer (tamper-evident) |
| Peer reporting of violations | Salesforce validation rules prevent audit record modification |
| IT-managed device compliance | Self-assessment with documented device configuration |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial policy |

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x.x (Development) | ✅ Latest only |
| 1.0+ (Stable) | ✅ Current + previous minor |

During the 0.x development phase, we only support the latest release. Once we reach 1.0 GA, we will support the current and previous minor versions with security patches.

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities in public GitHub issues.**

Instead, report them via one of these methods:

### Preferred: Security Advisory

1. Go to the [Security Advisories](https://github.com/CariHQ/opencad/security/advisories) page
2. Click "New draft security advisory"
3. Fill in the details of the vulnerability
4. Submit — this creates a private discussion between you and maintainers

### Alternative: Email

Send details to **security@opencad.org** with:

- **Subject:** `[SECURITY] Brief description of the vulnerability`
- **Body:** Detailed description including:
  - Type of vulnerability
  - Affected component(s) and version(s)
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if you have one)

### Response Timeline

| Stage | Target Time |
|-------|-------------|
| **Acknowledgment** | Within 48 hours |
| **Initial Assessment** | Within 5 business days |
| **Status Update** | Within 10 business days |
| **Fix Released** | Within 30 days (critical: 7 days) |

We will keep you informed of the progress throughout the process.

---

## Security Best Practices for Contributors

### General

- **Never commit secrets** — API keys, tokens, passwords, certificates
- **Use environment variables** for sensitive configuration
- **Review dependencies** for known vulnerabilities (`pnpm audit`, `cargo audit`)
- **Sign your commits** — GPG or SSH-signed commits preferred

### TypeScript / Frontend

- **No `eval()` or `new Function()`** — Use safe alternatives
- **Sanitize user input** — All user-provided strings must be sanitized before rendering
- **CSP headers** — Browser app enforces strict Content Security Policy
- **No inline scripts** — All scripts must be in separate files
- **Plugin sandboxing** — Plugins run in isolated Web Workers with capability-based permissions

### Rust / WASM

- **No `unsafe` without justification** — Every `unsafe` block must have a `// SAFETY:` comment
- **Memory safety** — Use Rust's ownership system; avoid raw pointers
- **Integer overflow** — Use checked arithmetic in geometry calculations
- **WASM sandbox** — WASM modules cannot access host file system or network directly

### Desktop (Tauri)

- **Capability-based security** — Only request minimum required Tauri capabilities
- **No Node.js in renderer** — All privileged operations go through Tauri commands
- **Validate IPC input** — All data from the frontend must be validated in Rust commands
- **File system access** — Scope file access to user-selected directories only

### AI / LLM Integration

- **No PII to cloud** — Project data is never sent to external LLM APIs without explicit user consent
- **Prompt injection protection** — All user prompts are sanitized before sending to LLM
- **Output validation** — All LLM output is validated before applying to the document model
- **Local AI option** — Users can run AI entirely locally via Ollama with zero data leaving their machine

---

## Known Security Considerations

### Intentional Design Decisions

| Decision | Rationale | Risk |
|----------|-----------|------|
| **Reverse-engineered format parsers** (PLN, RVT) | Enables interoperability with proprietary formats | Parsers may have edge cases; fuzz testing ongoing |
| **Plugin system** | Extensibility | Plugins are sandboxed but complex plugins may find escape vectors |
| **Local AI models** | Privacy, offline capability | Model files are large; integrity verified via checksums |

### Under Active Development

- **Fuzz testing** for geometry kernel and file parsers (in progress)
- **Formal verification** of CRDT conflict resolution (planned)
- **Third-party security audit** (planned before 1.0 GA)

---

## Bug Bounty

We do not currently offer a monetary bug bounty program. However, we do provide:

- **Full credit** in our security advisories and release notes
- **Hall of Fame** recognition on our website
- **Contributor status** for significant security contributions
- **Swag** — stickers, t-shirts for critical vulnerability reports

---

## Security Contact

- **Email:** security@opencad.org
- **PGP Key:** Available at https://opencad.org/.well-known/security.txt
- **OpenPGP Fingerprint:** `XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX`

---

## Policy History

| Date | Change |
|------|--------|
| 2026-04-12 | Initial security policy |

# Support

This document describes how to get help with OpenCAD.

---

## Getting Help

### For Users

| Resource | Best For | Link |
|----------|----------|------|
| **Documentation** | How-to guides, feature reference | [docs.opencad.org](https://docs.opencad.org) |
| **GitHub Discussions** | Questions, discussions, showcase | [Discussions](https://github.com/CariHQ/opencad/discussions) |
| **Discord** | Real-time chat, quick questions | [discord.gg/opencad](https://discord.gg/opencad) |
| **Community Calls** | Monthly video meetup, demos | [calendar.opencad.org](https://calendar.opencad.org) |

### For Contributors

| Resource | Best For | Link |
|----------|----------|------|
| **Contributing Guide** | How to contribute | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Architecture Docs** | Technical design decisions | [docs/architecture/](docs/architecture/) |
| **API Documentation** | Code-level reference | [api.opencad.org](https://api.opencad.org) |
| **Good First Issues** | Beginner-friendly tasks | [GitHub Issues](https://github.com/CariHQ/opencad/labels/good%20first%20issue) |

---

## Reporting Issues

### Bugs

Use the [Bug Report Template](https://github.com/CariHQ/opencad/issues/new?template=bug_report.md) and include:

- Steps to reproduce
- Expected vs. actual behavior
- Environment (OS, browser, version)
- Screenshots/screen recordings

### Feature Requests

Use the [Feature Request Template](https://github.com/CariHQ/opencad/issues/new?template=feature_request.md) and include:

- Problem statement (what pain point?)
- Proposed solution
- Alternatives considered

### Security Vulnerabilities

**Do NOT report security issues publicly.** See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## Response Times

| Channel | Expected Response |
|---------|-------------------|
| **GitHub Issues** | Within 48 hours |
| **GitHub Discussions** | Within 72 hours |
| **Discord** | Within 24 hours (community-driven) |
| **Security Reports** | Within 48 hours (see SECURITY.md) |
| **Community Calls** | Monthly (first Thursday) |

---

## Frequently Asked Questions

### General

**Q: Is OpenCAD free?**
A: The core is open-source (Apache 2.0). Hosted cloud features require a subscription starting at $29/mo after a 14-day free trial. You can self-host for free.

**Q: Can I use OpenCAD commercially?**
A: Yes. The Apache 2.0 license allows commercial use. Our hosted service is a separate subscription.

**Q: Does OpenCAD replace Archicad/Revit?**
A: Our goal is to match 80% of their features at 10% of the cost, with AI and collaboration as differentiators. See [PRD.md](PRD.md) for the full roadmap.

### Technical

**Q: What browsers are supported?**
A: Chrome 120+, Firefox 125+, Safari 17.4+, Edge 120+. WebGPU is required for full features; WebGL 2.0 is a fallback.

**Q: Can I use OpenCAD offline?**
A: Yes. Both browser (PWA) and desktop apps work fully offline with automatic cloud sync when reconnected.

**Q: What file formats can OpenCAD import/export?**
A: IFC, DWG, DXF, SKP, PLN (import), RVT (import), PDF, SVG, glTF, OBJ, STL, STEP, and more. See [PRD.md §11](PRD.md#11-file-format-interoperability) for the complete matrix.

**Q: Can I self-host OpenCAD?**
A: Yes. The core is fully open-source. Our hosted service provides cloud sync, AI features, and collaboration. Self-hosting guides are in `docs/guides/self-hosting/`.

### Contributing

**Q: How do I start contributing?**
A: Read [CONTRIBUTING.md](CONTRIBUTING.md), pick a `good first issue`, and comment on it. A maintainer will assign it to you.

**Q: Do I need architecture experience to contribute?**
A: No! We welcome contributors from all backgrounds. If you're an architect or engineer, your domain expertise is invaluable. If you're a developer, we have tasks at all skill levels.

**Q: How does OpenCAD make money if it's open-source?**
A: Revenue comes from hosted cloud subscriptions, enterprise features, and the plugin marketplace. The core remains open-source forever.

---

## Community-Led Support

OpenCAD is community-driven. You can help others by:

- **Answering questions** in GitHub Discussions and Discord
- **Writing tutorials** and adding them to `docs/guides/`
- **Creating video tutorials** and sharing on Discord
- **Translating documentation** (see `docs/translations/`)
- **Triaging issues** — helping reproduce and categorize bug reports

---

## Commercial Support

For organizations needing dedicated support:

- **Priority support** — SLA-backed response times
- **Custom integrations** — Firm-specific plugins
- **Training** — On-site or remote training sessions
- **Consulting** — Architecture review, migration assistance

Contact: **support@opencad.org**

---

## Acknowledgments

Thank you to all community members who help each other. Special recognition goes to our most active supporters — see [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full list.

# OpenCAD

**Browser-native, AI-powered, open-source BIM platform**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/CariHQ/opencad/actions/workflows/ci.yml/badge.svg)](https://github.com/CariHQ/opencad/actions/workflows/ci.yml)
[![Discord](https://img.shields.io/discord/opencad?label=discord&logo=discord)](https://discord.gg/opencad)
[![Contributors](https://img.shields.io/github/contributors/CariHQ/opencad)](https://github.com/CariHQ/opencad/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

OpenCAD combines the accessibility of Figma (browser-native, WASM, real-time collaboration) with the feature depth of Archicad (BIM modeling, documentation, code compliance) to create professional-grade architectural tools that are affordable, extensible, and available to everyone.

## ✨ Features

### Core
- 🏗️ **2D Drafting** — Lines, arcs, dimensions, annotations, layers, snapping
- 🧊 **3D Modeling** — Extrude, boolean, push/pull, parametric BIM elements (walls, slabs, doors, windows, roofs)
- 🔄 **Real-Time Collaboration** — Multiple users editing simultaneously with CRDT-based conflict resolution
- 📴 **Full Offline Support** — Works identically online and offline; automatic sync when reconnected
- 📁 **File Interoperability** — Import/export IFC, DWG, DXF, SKP, PLN, RVT, PDF, glTF, OBJ, STL, STEP

### AI-Powered
- 🤖 **Prompt-to-Project** — Describe a building in natural language → AI generates the floor plan
- 📋 **Code Compliance** — Automatic checking against IBC, ADA, Eurocode, and local building codes
- ✏️ **AI Design Modification** — Natural language edits to existing models ("move the kitchen north")
- 📝 **Auto-Documentation** — AI-generated annotations, specifications, and construction notes

### Platform
- 🌐 **Browser App** — Runs in any modern browser, no installation required
- 🖥️ **Desktop App** — Native app (Tauri v2) with local AI, unlimited storage, native file associations
- 🔌 **Plugin System** — Extensible SDK for custom tools, workflows, and integrations
- 📖 **Open Source** — Apache 2.0 license, community-driven development

## 🚀 Quick Start

### Browser (No Install)

Visit [opencad.archi](https://opencad.archi) — works immediately in Chrome, Firefox, Safari, or Edge.

### Desktop

Download from [releases](https://github.com/CariHQ/opencad/releases):

| Platform | Format |
|----------|--------|
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Windows | `.exe` / `.msi` |
| Ubuntu/Debian | `.deb` / `.AppImage` |
| Fedora/RHEL | `.rpm` / `.AppImage` |

### Self-Host

```bash
git clone https://github.com/CariHQ/opencad.git
cd opencad
pnpm install
pnpm build
pnpm start
```

See [Self-Hosting Guide](docs/guides/self-hosting.md) for detailed setup.

## 📋 System Requirements

### Browser
- Chrome 120+, Firefox 125+, Safari 17.4+, Edge 120+
- WebGPU support (WebGL 2.0 fallback for limited features)
- 4GB+ RAM recommended

### Desktop
- **macOS:** 13.0+ (Ventura), Apple Silicon or Intel
- **Windows:** 10 22H2+ or 11, x86_64 or ARM64
- **Linux:** Ubuntu 22.04+, Debian 12+, Fedora 38+
- **RAM:** 8GB+ recommended (16GB for large models)
- **GPU:** Any GPU with WebGPU support; local AI requires NVIDIA (CUDA), Apple Silicon (Metal), or AMD (Vulkan)

## 📖 Documentation

| Resource | Link |
|----------|------|
| **User Guide** | [docs.opencad.archi](https://docs.opencad.archi) |
| **API Reference** | [api.opencad.archi](https://api.opencad.archi) |
| **Contributing Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Product Requirements** | [PRD.md](PRD.md) |
| **Architecture Docs** | [docs/architecture/](docs/architecture/) |
| **Self-Hosting** | [docs/guides/self-hosting.md](docs/guides/self-hosting.md) |

## 🛠️ Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22+ |
| pnpm | 10+ |
| Rust | 1.80+ |
| wasm-pack | 0.13+ |
| Tauri CLI | 2.0+ |

### Setup

```bash
# Clone and install
git clone https://github.com/CariHQ/opencad.git
cd opencad
pnpm install

# Build WASM geometry kernel
pnpm build:wasm

# Start browser development
pnpm dev:browser

# Start desktop development
pnpm dev:desktop

# Run tests
pnpm test
```

### Project Structure

```
opencad/
├── packages/           # Shared packages
│   ├── ui/             # React components
│   ├── geometry/       # WASM geometry kernel
│   ├── document/       # CRDT document model
│   ├── rendering/      # 2D/3D rendering engine
│   ├── ai/             # AI orchestration
│   ├── sync/           # Cloud sync engine
│   ├── import-export/  # File format parsers
│   └── plugin-sdk/     # Plugin development kit
├── apps/
│   ├── browser/        # Browser app (Vite + PWA)
│   └── desktop/        # Desktop app (Tauri v2)
├── e2e/                # End-to-end tests
├── docs/               # Documentation
└── PRD.md              # Product Requirements Document
```

## 🤝 Contributing

We welcome contributions of all kinds — code, documentation, design, testing, community building, and more.

**Start here:**

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Pick a [`good first issue`](https://github.com/CariHQ/opencad/labels/good%20first%20issue)
3. Comment on the issue to claim it
4. Follow our TDD workflow (tests first!)

**No architecture experience required** — we have tasks at all skill levels. If you're an architect or engineer, your domain expertise is especially valuable.

## 📜 License

OpenCAD is licensed under the [Apache License 2.0](LICENSE).

The core platform is fully open-source. Hosted cloud features (sync, AI, collaboration) are available as a paid subscription with a 14-day free trial.

## 🏛️ Governance

OpenCAD follows a [meritocratic governance model](GOVERNANCE.md). Decisions are made through community consensus with maintainer oversight.

## 💬 Community

| Channel | Purpose |
|---------|---------|
| [GitHub Discussions](https://github.com/CariHQ/opencad/discussions) | Questions, ideas, showcase |
| [Discord](https://discord.gg/opencad) | Real-time chat |
| [Community Calls](https://calendar.opencad.archi) | Monthly video meetup |

## 🙏 Acknowledgments

OpenCAD builds on incredible open-source work from the community:

- [OpenCASCADE](https://dev.opencascade.org/) — Geometry kernel
- [web-ifc](https://github.com/tomvandig/web-ifc) — IFC parser
- [Yjs](https://github.com/yjs/yjs) — CRDT library
- [Three.js](https://github.com/mrdoob/three.js) — 3D rendering
- [Tauri](https://v2.tauri.app/) — Desktop framework
- [LibreDWG](https://www.gnu.org/software/libredwg/) — DWG parser
- [dxflib](https://www.qcad.org/en/dxf-library) — DXF parser
- And many more — see [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 📊 Project Stats

- **Started:** April 2026
- **Target GA:** January 2027
- **Current Phase:** Development (Phase 1: Foundation)
- **Team:** 13 core members + community contributors

---

**Built with ❤️ for architects, by architects and developers.**

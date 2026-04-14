# Product Requirements Document (PRD)

# OpenCAD — Browser-Native, AI-Powered BIM Platform

**Version:** 1.0  
**Status:** Draft  
**Date:** April 12, 2026  
**Author:** Product & Engineering Team

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Principles](#4-product-principles)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Product Architecture](#6-product-architecture)
   6.1 [High-Level Architecture](#61-high-level-architecture)
   6.2 [Server-Side Architecture](#62-server-side-architecture)
   6.3 [Key Architectural Decisions](#63-key-architectural-decisions)
   6.4 [Shared Codebase Strategy](#64-shared-codebase-strategy)
   6.5 [Desktop Application](#65-desktop-application)
   6.6 [Hosted Cloud Storage & Subscription Model](#66-hosted-cloud-storage--subscription-model)
7. [Core Feature Specifications](#7-core-feature-specifications)
8. [AI Feature Specifications](#8-ai-feature-specifications)
9. [Offline-First Architecture](#9-offline-first-architecture)
10. [Real-Time Collaboration](#10-real-time-collaboration)
11. [File Format Interoperability](#11-file-format-interoperability)
12. [Extensibility & Plugin System](#12-extensibility--plugin-system)
13. [Test-Driven Development Strategy](#13-test-driven-development-strategy)
14. [Phased Roadmap](#14-phased-roadmap)
15. [Technical Stack Decisions](#15-technical-stack-decisions)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Success Metrics](#18-success-metrics)
19. [Glossary](#19-glossary)

---

## 1. Vision & Positioning

### 1.1 Vision

Build the world's first **browser-native, AI-powered, open-source BIM platform** that combines the accessibility and collaboration model of Figma with the feature depth of Archicad — making professional-grade architectural design tools affordable, extensible, and available to every architect on the planet.

### 1.2 Positioning

| Dimension     | Archicad / Revit       | Figma                 | **OpenCAD (Us)**                                             |
| ------------- | ---------------------- | --------------------- | ------------------------------------------------------------ |
| Platform      | Desktop install        | Browser (WASM)        | **Browser + Desktop (Tauri)**                                |
| Rendering     | Native GPU             | WASM + Canvas         | **WASM + WebGPU + WebGL fallback**                           |
| Collaboration | File-based, slow       | Real-time multiplayer | **Real-time CRDT-based multiplayer**                         |
| AI Features   | Minimal (add-ons)      | Emerging (FigJam AI)  | **Core AI-first design**                                     |
| Offline       | Full                   | Limited               | **Full offline-first (browser: IndexedDB, desktop: SQLite)** |
| Pricing       | $2,500–$5,000+/seat/yr | Free–$45/editor/mo    | **$29–$99/user/mo (open-source core)**                       |
| Extensibility | Proprietary APIs       | Plugin ecosystem      | **Open plugin system + SDK**                                 |
| Source        | Closed                 | Closed                | **Open-source core (Apache 2.0)**                            |

### 1.3 Key Differentiators

1. **Browser-native with WASM geometry kernel** — No installation, runs on any modern device including Chromebooks and tablets
2. **AI-first design workflow** — Prompt-to-project, AI code compliance, AI-assisted detailing
3. **True offline-first** — Full editing capability without internet; automatic sync when reconnected
4. **Real-time multiplayer** — Multiple architects editing the same model simultaneously (Figma-style)
5. **Open-source & extensible** — Community-driven plugin ecosystem, transparent development
6. **Affordable** — 90%+ cost reduction vs. Archicad/Revit while matching core feature set

---

## 2. Problem Statement

### 2.1 Current State of Architectural Software

Architects today face several critical pain points:

| Pain Point                          | Description                                                                            | Impact                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Prohibitive Cost**                | Archicad ($3,200/yr), Revit ($3,300/yr) lock out small firms and individual architects | 70% of global architects cannot afford professional BIM tools   |
| **Installation & Hardware Lock-in** | Requires powerful workstations, complex setup, no mobile/tablet support                | Limits where and how architects work                            |
| **Poor Collaboration**              | File-based workflows, version conflicts, email-based review cycles                     | 30% of project time spent on coordination                       |
| **No AI Assistance**                | Manual code checking, repetitive drafting, no generative design                        | Slow concept development, missed optimization opportunities     |
| **Closed Ecosystem**                | Proprietary formats, limited APIs, vendor lock-in                                      | Inability to customize or extend tools                          |
| **Offline Limitations**             | Cloud tools require constant connectivity                                              | Cannot work on-site, in transit, or in areas with poor internet |

### 2.2 Opportunity

The convergence of **WebAssembly maturity**, **WebGPU rendering**, **CRDT-based collaboration**, **local-first software movement**, and **LLM capabilities** creates a unique window to build a next-generation BIM platform that:

- Runs in any modern browser at near-native performance
- Provides AI-assisted design from prompt to construction documents
- Works fully offline with seamless cloud sync
- Enables real-time multi-user collaboration
- Costs a fraction of incumbent tools
- Is open-source and community-extensible

---

## 3. Target Users

### 3.1 Primary Personas

#### Persona 1: Independent Architect / Small Firm (1–20 people)

- **Needs:** Affordable BIM tool, full feature set, easy collaboration with clients/contractors
- **Pain Points:** Cannot justify $3K+/seat/year, needs to work on-site and in office
- **Willingness to Pay:** $29–$79/user/month

#### Persona 2: Mid-Size Architecture Firm (20–200 people)

- **Needs:** Team collaboration, BIM standards compliance, code checking, project management
- **Pain Points:** Coordination overhead, code compliance costs, training new staff
- **Willingness to Pay:** $49–$99/user/month + enterprise features

#### Persona 3: Architecture Student / Educator

- **Needs:** Free/low-cost access to professional tools, learning resources
- **Pain Points:** Student licenses are limited, software doesn't run on personal devices
- **Willingness to Pay:** Free (open-source) or $5–$15/month for cloud features

#### Persona 4: Plugin Developer / Power User

- **Needs:** Extensible platform, SDK, API documentation, marketplace
- **Pain Points:** Current tools have limited APIs, closed ecosystems
- **Willingness to Pay:** Free (contributes to ecosystem), revenue share on paid plugins

### 3.2 Market Size

- **Global architecture firms:** ~300,000+
- **Licensed architects worldwide:** ~3.5M+
- **Architecture students:** ~500K+
- **TAM (Total Addressable Market):** $12B+ (BIM software market growing at 15% CAGR)

---

## 4. Product Principles

1. **Browser-First, Not Browser-Limited** — The browser is the primary platform, not a compromise. WASM + WebGPU delivers near-native performance.
2. **Offline is the Default** — The app works identically online and offline. Sync is an optimization, not a requirement.
3. **AI as a Core Primitive** — AI is not a feature bolted on; it's woven into every workflow from project creation to documentation.
4. **Open Core, Open Community** — The core platform is open-source (Apache 2.0). Revenue comes from hosted services, enterprise features, and marketplace.
5. **Test-Driven, Not Trial-and-Error** — Every feature is specified with tests first. No code ships without test coverage.
6. **Performance is a Feature** — 60fps interaction, <2s load for typical projects, <100ms input latency.
7. **Interoperability by Design** — Full IFC, DWG, DXF, SKP, RVT (import) support. OPEN BIM compliant.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors

| Product         | Strengths                                              | Weaknesses                                                | Our Advantage                                           |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| **Archicad 27** | Mature BIM, deep feature set, Graphisoft ecosystem     | $3,200/yr, desktop-only, slow collaboration, no AI        | 90% cheaper, browser-native, real-time collab, AI-first |
| **Revit 2025**  | Industry standard, massive ecosystem, Autodesk backing | $3,300/yr, heavy hardware, complex, no native AI          | Browser-native, AI-first, 90% cheaper, simpler UX       |
| **SketchUp**    | Easy to learn, large 3D warehouse                      | Not true BIM, limited documentation, web version is basic | Full BIM, AI features, professional documentation       |
| **Vectorworks** | Strong in entertainment/landscape design               | Expensive, desktop-only, smaller ecosystem                | Browser-native, open-source, AI features                |

### 5.2 Adjacent / Emerging Competitors

| Product                         | Threat Level       | Notes                                                                 |
| ------------------------------- | ------------------ | --------------------------------------------------------------------- |
| **Autodesk Forma (Spacemaker)** | Medium             | AI-powered site analysis, but not a full BIM tool                     |
| **Snaptrude**                   | Medium-High        | Browser-based BIM, real-time collab, but limited AI and feature depth |
| **That Open Company (IFC.js)**  | Low-Medium         | Open-source IFC web tools, but not a full design platform             |
| **Ark Design AI**               | Medium             | AI schematic design, but not a modeling/documentation platform        |
| **Figma (if they enter AEC)**   | High (future risk) | Has the tech stack, but no AEC domain expertise yet                   |

### 5.3 Our Moat

1. **AI + BIM Integration** — No competitor has deep BIM modeling with AI-native design generation
2. **Open-Source Community** — Community-driven development creates network effects and plugin ecosystem
3. **Offline-First Architecture** — True offline capability is a significant differentiator for on-site work
4. **Price-to-Value Ratio** — Professional features at 10% of incumbent cost

---

## 6. Product Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OpenCAD Application Layer                     │
├─────────────────────────────────────────────────────────────────────┤
│  UI Layer (React + TypeScript)                                       │
│  ├── Design Workspace (Canvas/Viewport)                              │
│  ├── Property Panels & Inspector                                     │
│  ├── Tool Palette & Command Bar                                      │
│  ├── Layer & Object Browser                                          │
│  ├── AI Chat / Prompt Interface                                      │
│  └── Collaboration UI (cursors, comments, presence)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Application Logic Layer (TypeScript + Web Workers)                  │
│  ├── Document Model (CRDT-based)                                     │
│  ├── Tool System (draw, modify, annotate, measure)                   │
│  ├── Constraint Solver & Parametric Engine                           │
│  ├── AI Orchestration Layer                                          │
│  ├── Code Compliance Engine                                          │
│  ├── Import/Export Pipeline (IFC, DWG, DXF, SKP, PDF)               │
│  └── Plugin Runtime & SDK                                            │
├─────────────────────────────────────────────────────────────────────┤
│  Geometry & Rendering Layer (WASM + WebGPU)                          │
│  ├── Geometry Kernel (OpenCASCADE WASM / Custom Rust kernel)         │
│  ├── 2D Drafting Engine                                              │
│  ├── 3D Modeling Engine                                              │
│  ├── Rendering Engine (WebGPU primary, WebGL fallback)               │
│  ├── Scene Graph & LOD Management                                    │
│  └── Spatial Index (BVH / Octree)                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Storage & Sync Layer                                                │
│  ├── Local Storage (IndexedDB + Origin Private File System)          │
│  ├── CRDT Sync Engine (Yjs-based custom implementation)              │
│  ├── Service Worker (offline caching, background sync)               │
│  ├── Conflict Resolution Engine                                      │
│  └── Cloud Storage Adapter (S3-compatible, self-hostable)            │
├─────────────────────────────────────────────────────────────────────┤
│  PWA Shell                                                           │
│  ├── Service Worker                                                  │
│  ├── App Shell Caching                                               │
│  ├── Background Sync                                                 │
│  └── Installable PWA Manifest                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Server-Side Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloud Infrastructure                          │
├─────────────────────────────────────────────────────────────────────┤
│  API Gateway (Kong / NGINX)                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Microservices (Go / Rust)                                           │
│  ├── Auth Service (OAuth2, SSO, API keys)                            │
│  ├── Project Service (metadata, sharing, permissions)                │
│  ├── Sync Service (WebSocket CRDT sync, presence)                    │
│  ├── AI Service (LLM orchestration, code compliance, generation)     │
│  ├── File Service (asset storage, versioning, thumbnails)            │
│  ├── Plugin Marketplace Service                                      │
│  ├── Billing & Subscription Service                                  │
│  └── Analytics & Telemetry Service                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Data Layer                                                          │
│  ├── PostgreSQL (user data, project metadata, billing)               │
│  ├── Redis (sessions, presence, caching)                             │
│  ├── S3-compatible Object Storage (project files, assets)            │
│  └── Vector DB (building code embeddings, design patterns)           │
├─────────────────────────────────────────────────────────────────────┤
│  AI Infrastructure                                                   │
│  ├── LLM Router (OpenAI, Claude, local models via Ollama)            │
│  ├── Fine-tuned Models (code compliance, floor plan generation)      │
│  ├── RAG Pipeline (building codes, standards, precedents)            │
│  └── Local Model Runner (Ollama for offline AI)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Key Architectural Decisions

| Decision               | Choice                                         | Rationale                                                                      |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| **Geometry Kernel**    | OpenCASCADE (WASM) + custom Rust extensions    | Proven CAD kernel, open-source, WASM-compiled, supports BREP/NURBS             |
| **Rendering**          | WebGPU (primary) + WebGL 2.0 (fallback)        | WebGPU provides compute shaders, better performance; WebGL for Safari fallback |
| **CRDT Library**       | Yjs (custom extensions for BIM)                | Mature, performant, excellent ecosystem; needs BIM-specific data types         |
| **Local Storage**      | IndexedDB + Origin Private File System (OPFS)  | IndexedDB for structured data; OPFS for large binary assets (textures, models) |
| **Frontend Framework** | React + TypeScript + Vite                      | Ecosystem, type safety, developer experience, plugin compatibility             |
| **3D Scene**           | Three.js (WebGPU renderer)                     | Mature ecosystem, WebGPU support, large community                              |
| **AI Models**          | Multi-model router (GPT-4o, Claude, local)     | Flexibility, cost optimization, offline capability via local models            |
| **Build System**       | Turborepo + pnpm monorepo                      | Fast builds, shared packages, test isolation                                   |
| **Testing**            | Vitest + Playwright + Custom WASM test harness | Unit, integration, E2E, and geometry-specific testing                          |

---

## 6.5 Desktop Application

### 6.5.1 Desktop App Vision

> **"The same OpenCAD, but with superpowers only a native app can provide."**

The desktop app is not a separate product — it's the same OpenCAD codebase running in a native shell that unlocks capabilities the browser sandbox prevents. Users get identical UX, shared document models, and seamless cloud sync, but with enhanced offline capabilities, native file system access, and local AI processing.

### 6.5.2 Technology Decision: Tauri v2

| Criterion            | Tauri v2                   | Electron                   | Decision Rationale                                     |
| -------------------- | -------------------------- | -------------------------- | ------------------------------------------------------ |
| **Bundle Size**      | 10–30 MB                   | 150–300 MB                 | Tauri is 10–20x smaller — critical for adoption        |
| **Memory Usage**     | 30–80 MB idle              | 150–300 MB idle            | Lower baseline leaves more RAM for large BIM models    |
| **Startup Time**     | 0.5–1.5s                   | 2–4s                       | Faster startup improves perceived performance          |
| **Backend Language** | Rust                       | JavaScript/Node.js         | We already use Rust for geometry kernel — code reuse   |
| **Security**         | Capability-based (audited) | Manual configuration       | Tauri v2's capability system is superior by default    |
| **Rendering**        | System WebView             | Bundled Chromium           | Trade-off: smaller size vs. rendering consistency      |
| **Ecosystem**        | Growing                    | Mature                     | Electron has VS Code, Figma; Tauri is catching up fast |
| **Mobile Support**   | ✅ (v2: iOS/Android)       | ❌ (requires React Native) | Future-proof for mobile strategy                       |
| **License**          | MIT/Apache-2.0             | MIT                        | Both permissive                                        |

**Decision: Tauri v2** — The Rust backend aligns with our geometry kernel strategy, the size/performance advantages are significant, and Tauri v2's mobile support future-proofs our roadmap. The WebView inconsistency risk is mitigated by our existing browser compatibility testing (we already support multiple rendering engines).

### 6.5.3 Desktop Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenCAD Desktop (Tauri v2)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (Shared with Browser)                                      │
│  ├── React UI Components (identical to browser)                      │
│  ├── Three.js WebGPU/WebGL Rendering (identical to browser)          │
│  ├── WASM Geometry Kernel (identical to browser)                     │
│  ├── CRDT Document Model (identical to browser)                      │
│  └── AI Chat / Prompt Interface (identical to browser)               │
├─────────────────────────────────────────────────────────────────────┤
│  Tauri IPC Bridge                                                    │
│  ├── invoke() → Rust Commands                                        │
│  ├── emit() → Rust Events                                            │
│  └── Capability System (fine-grained permissions)                    │
├─────────────────────────────────────────────────────────────────────┤
│  Rust Backend (Desktop-Only Enhancements)                            │
│  ├── Native File System Access                                       │
│  │   ├── Direct file read/write (no browser sandbox limits)          │
│  │   ├── File watching (auto-reload on external changes)             │
│  │   ├── Drag-and-drop from file explorer                            │
│  │   └── Bulk file operations (batch import/export)                  │
│  ├── Native File Associations                                        │
│  │   ├── .opencad → Open with OpenCAD Desktop                        │
│  │   ├── .ifc → Open with OpenCAD Desktop                            │
│  │   ├── .dwg → Open with OpenCAD Desktop                            │
│  │   ├── .pln → Open with OpenCAD Desktop                            │
│  │   ├── .rvt → Open with OpenCAD Desktop (triggers server convert)  │
│  │   └── .skp → Open with OpenCAD Desktop                            │
│  ├── Local AI Runtime                                                │
│  │   ├── Ollama integration (bundled or system)                      │
│  │   ├── GPU acceleration (CUDA, Metal, Vulkan)                      │
│  │   ├── Model management (download, update, switch models)          │
│  │   └── Offline AI inference (no cloud required)                    │
│  ├── Enhanced Storage                                                │
│  │   ├── Direct SQLite database (no IndexedDB limits)                │
│  │   ├── Native file system for project storage                      │
│  │   ├── No browser quota restrictions                               │
│  │   └── Backup/sync to external drives                              │
│  ├── System Integration                                              │
│  │   ├── System tray icon + menu                                     │
│  │   ├── Native menu bar (macOS) / title bar (Windows/Linux)         │
│  │   ├── Recent files list                                           │
│  │   ├── Auto-update (Tauri updater)                                 │
│  │   └── Crash reporting (native crash dumps)                        │
│  └── Performance Enhancements                                        │
│      ├── Direct GPU access for compute shaders                       │
│      ├── Multi-threaded file I/O                                     │
│      ├── Background processing (export, sync, AI)                    │
│      └── Memory-mapped file access for large models                  │
├─────────────────────────────────────────────────────────────────────┤
│  System WebView                                                      │
│  ├── macOS: WebKit (Safari engine)                                   │
│  ├── Windows: WebView2 (Edge/Chromium engine)                        │
│  └── Linux: WebKitGTK                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.5.4 Desktop vs Browser Feature Comparison

| Feature                      | Browser App                | Desktop App             | Notes                                                  |
| ---------------------------- | -------------------------- | ----------------------- | ------------------------------------------------------ |
| **Core Modeling**            | ✅                         | ✅                      | Identical — shared codebase                            |
| **2D Drafting**              | ✅                         | ✅                      | Identical — shared codebase                            |
| **3D Rendering**             | ✅                         | ✅                      | Identical — shared codebase                            |
| **Real-Time Collaboration**  | ✅                         | ✅                      | Identical — shared CRDT sync                           |
| **Offline Editing**          | ✅ (IndexedDB)             | ✅ (Native SQLite)      | Desktop has no quota limits                            |
| **Cloud Sync**               | ✅                         | ✅                      | Identical — shared sync engine                         |
| **AI: Cloud LLMs**           | ✅                         | ✅                      | Identical — shared AI orchestration                    |
| **AI: Local Models**         | ⚠️ (Ollama sidecar)        | ✅ (Bundled Ollama)     | Desktop has integrated local AI                        |
| **File Open (double-click)** | ❌                         | ✅                      | Native file associations                               |
| **Drag-and-Drop Files**      | ⚠️ (limited)               | ✅ (full)               | Desktop has native DnD                                 |
| **File System Access**       | ⚠️ (File API)              | ✅ (Native)             | Desktop has unrestricted access                        |
| **Large File Import**        | ⚠️ (browser memory limits) | ✅ (streaming)          | Desktop handles 1GB+ files                             |
| **Batch Export**             | ⚠️ (one at a time)         | ✅ (parallel)           | Desktop can export multiple formats simultaneously     |
| **Auto-Update**              | ✅ (silent, browser)       | ✅ (Tauri updater)      | Desktop has explicit update control                    |
| **System Tray**              | ❌                         | ✅                      | Desktop shows sync status, notifications               |
| **Recent Files**             | ⚠️ (in-app only)           | ✅ (OS-level)           | Desktop integrates with OS recent files                |
| **External Drive Sync**      | ❌                         | ✅                      | Desktop can backup to USB/network drives               |
| **GPU Compute**              | ⚠️ (WebGPU limits)         | ✅ (native GPU access)  | Desktop has full GPU compute for geometry              |
| **Crash Recovery**           | ⚠️ (browser handles)       | ✅ (native crash dumps) | Desktop provides better crash diagnostics              |
| **Multi-Window**             | ⚠️ (browser tabs)          | ✅ (native windows)     | Desktop can open multiple projects in separate windows |
| **Clipboard**                | ⚠️ (browser sandbox)       | ✅ (native clipboard)   | Desktop can paste images, rich text directly           |
| **Print**                    | ⚠️ (browser print dialog)  | ✅ (native print)       | Desktop has custom print pipeline                      |
| **Storage Limit**            | Browser quota (~50% disk)  | Unlimited (disk space)  | Desktop has no artificial limits                       |

### 6.5.5 Desktop-Specific Features

#### Native File System Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Desktop File System Integration                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  File Associations (OS-level):                                       │
│    .opencad   → OpenCAD Desktop (primary)                            │
│    .opencada  → OpenCAD Desktop                                      │
│    .ifc       → OpenCAD Desktop                                      │
│    .dwg       → OpenCAD Desktop                                      │
│    .dxf       → OpenCAD Desktop                                      │
│    .skp       → OpenCAD Desktop                                      │
│    .pln       → OpenCAD Desktop                                      │
│    .pla       → OpenCAD Desktop                                      │
│                                                                      │
│  Double-Click Open:                                                  │
│    1. OS launches OpenCAD Desktop                                    │
│    2. Rust backend reads file directly (no browser upload)           │
│    3. Parses with same WASM parsers as browser                       │
│    4. Renders in shared UI                                           │
│    5. Auto-saves to native project directory                         │
│                                                                      │
│  Drag-and-Drop:                                                      │
│    - Drag file from Finder/Explorer → OpenCAD window                  │
│    - Auto-import with format detection                                │
│    - Progress shown in native notification                           │
│                                                                      │
│  Save Dialog:                                                        │
│    - Native save dialog (not browser download)                       │
│    - Choose any location on disk                                     │
│    - Auto-suggest filename based on project                          │
│                                                                      │
│  Watch Mode:                                                         │
│    - Watch external files (IFC from consultant, DWG from surveyor)   │
│    - Auto-reload when file changes on disk                           │
│    - Notification: "survey.dwg was updated externally. Reload?"      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Local AI Runtime

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Desktop Local AI Runtime                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ollama Integration:                                                 │
│    - Bundled Ollama binary (optional download on first use)          │
│    - Or connect to existing system Ollama installation               │
│    - Model management UI (download, update, delete models)           │
│                                                                      │
│  Supported Models (local):                                           │
│    - Llama 3.1 8B (4-bit quantized, ~4.7 GB)                        │
│    - Mistral 7B (4-bit quantized, ~4.1 GB)                          │
│    - CodeLlama 7B (for code compliance explanations)                 │
│    - Custom fine-tuned models (firm-specific training)               │
│                                                                      │
│  GPU Acceleration:                                                   │
│    - NVIDIA: CUDA (via Ollama)                                       │
│    - Apple Silicon: Metal (optimized for M1/M2/M3)                   │
│    - AMD: ROCm (Linux), Vulkan (cross-platform)                      │
│    - CPU fallback (slower, but functional)                           │
│                                                                      │
│  Offline AI Capabilities:                                            │
│    - Prompt-to-Project (reduced quality vs. cloud, but functional)   │
│    - Design Modification (natural language edits)                    │
│    - Code Compliance (rule engine + LLM explanations)                │
│    - Auto-Annotation                                                 │
│    - Solar Analysis (local calculation, no AI needed)                │
│                                                                      │
│  Cloud Fallback:                                                     │
│    - When online, user can choose cloud models (GPT-4o, Claude)      │
│    - Cloud models provide higher quality for complex tasks           │
│    - User controls what data is sent to cloud (explicit consent)     │
│                                                                      │
│  Privacy:                                                            │
│    - Local AI = zero data leaves the machine                         │
│    - Cloud AI = user opts in per-request or sets default             │
│    - Firm admins can enforce local-only policy                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Enhanced Storage & Performance

| Capability                      | Browser                       | Desktop                      | Impact                           |
| ------------------------------- | ----------------------------- | ---------------------------- | -------------------------------- |
| **Max Project Size**            | ~500MB (browser memory limit) | Limited only by RAM          | Desktop handles campus-scale BIM |
| **Import Speed (500MB IFC)**    | 30s (WASM + browser I/O)      | 15s (native I/O + streaming) | 2x faster                        |
| **Export Speed (full PDF set)** | 10s (single-threaded)         | 5s (multi-threaded)          | 2x faster                        |
| **Auto-Save Frequency**         | Every 2s (IndexedDB)          | Every 1s (SQLite, async)     | More responsive                  |
| **Version History Storage**     | ~200MB (browser quota)        | Unlimited (disk space)       | Full history, no pruning         |
| **Local AI Model Storage**      | OPFS (user must enable)       | Native directory (default)   | Easier model management          |
| **External Drive Backup**       | ❌                            | ✅                           | Backup to NAS, USB, cloud mount  |

### 6.5.6 Desktop-Specific Test Requirements

| ID        | Test                                                           | Priority |
| --------- | -------------------------------------------------------------- | -------- |
| T-DSK-001 | Install desktop app → verify launches without browser          | P0       |
| T-DSK-002 | Double-click .opencad file → verify opens in desktop app       | P0       |
| T-DSK-003 | Double-click .ifc file → verify opens in desktop app           | P0       |
| T-DSK-004 | Double-click .dwg file → verify opens in desktop app           | P0       |
| T-DSK-005 | Drag-and-drop file from OS → verify imports correctly          | P0       |
| T-DSK-006 | Save file → verify writes to native file system (not download) | P0       |
| T-DSK-007 | Watch external file → modify externally → verify reload prompt | P0       |
| T-DSK-008 | Local AI → disconnect internet → verify AI still functions     | P0       |
| T-DSK-009 | Local AI → verify GPU acceleration detected and used           | P0       |
| T-DSK-010 | Multi-window → open 2 projects → verify independent operation  | P1       |
| T-DSK-011 | System tray → verify shows sync status, notifications          | P1       |
| T-DSK-012 | Auto-update → verify downloads and applies update on restart   | P0       |
| T-DSK-013 | Crash recovery → force crash → verify recovery on relaunch     | P0       |
| T-DSK-014 | Large file (1GB IFC) → verify imports without OOM              | P0       |
| T-DSK-015 | Batch export → export IFC + DWG + PDF simultaneously           | P1       |
| T-DSK-016 | External drive backup → verify saves to USB/network drive      | P1       |
| T-DSK-017 | Native print → verify custom print pipeline works              | P1       |
| T-DSK-018 | Clipboard → paste image from clipboard → verify inserts        | P1       |
| T-DSK-019 | Recent files → verify OS-level recent files list works         | P1       |
| T-DSK-020 | Same project in browser + desktop → verify sync works          | P0       |

### 6.5.7 Desktop Build & Distribution

| Platform                  | Format              | Distribution                                | Notes                                  |
| ------------------------- | ------------------- | ------------------------------------------- | -------------------------------------- |
| **macOS (Apple Silicon)** | `.dmg`, `.app`      | Direct download, Homebrew                   | Universal binary (arm64)               |
| **macOS (Intel)**         | `.dmg`, `.app`      | Direct download                             | x86_64, deprecated after 2 years       |
| **Windows**               | `.exe`, `.msi`      | Direct download, Winget, MSI for enterprise | WebView2 prerequisite (auto-installed) |
| **Linux (Debian/Ubuntu)** | `.deb`, `.AppImage` | Direct download, APT repo                   | WebKitGTK prerequisite                 |
| **Linux (Fedora/RHEL)**   | `.rpm`, `.AppImage` | Direct download, DNF repo                   | WebKitGTK prerequisite                 |
| **Linux (Arch)**          | AUR package         | AUR                                         | Community-maintained                   |

**Auto-Update Strategy:**

- Tauri's built-in updater with signature verification
- Update server hosts JSON manifest + binaries on S3/CloudFront
- Silent background download, apply on restart
- Enterprise: MSI/GPO deployment for IT-managed fleets

### 6.5.8 Desktop Development Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Desktop Development Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Shared Codebase:                                                    │
│    packages/                                                         │
│    ├── ui/              ← React components (browser + desktop)       │
│    ├── geometry/        ← WASM kernel (browser + desktop)            │
│    ├── document/        ← CRDT model (browser + desktop)             │
│    ├── ai/              ← AI orchestration (browser + desktop)       │
│    └── sync/            ← Cloud sync (browser + desktop)             │
│                                                                      │
│  Browser-Specific:                                                   │
│    packages/browser/                                                 │
│    ├── service-worker/  ← Offline caching, background sync           │
│    ├── pwa/             ← PWA manifest, install prompt              │
│    └── vite.config.ts   ← Browser build config                       │
│                                                                      │
│  Desktop-Specific:                                                   │
│    packages/desktop/                                                 │
│    ├── src-tauri/       ← Rust backend (Tauri)                       │
│    │   ├── src/         ← Rust commands, file I/O, AI runtime        │
│    │   ├── Cargo.toml   ← Rust dependencies                         │
│    │   └── tauri.conf.json ← Tauri configuration                    │
│    ├── capabilities/    ← Tauri v2 capability definitions           │
│    └── build scripts    ← Platform-specific build scripts            │
│                                                                      │
│  Development:                                                        │
│    1. pnpm dev:browser  → Vite dev server (browser testing)          │
│    2. pnpm dev:desktop  → Tauri dev mode (desktop testing)           │
│    3. Both use same UI/geometry/document packages                    │
│    4. Hot reload for UI changes in both targets                      │
│                                                                      │
│  Testing:                                                            │
│    - Unit tests run identically for browser and desktop              │
│    - Desktop-specific tests use Tauri's test harness                 │
│    - E2E tests run against both browser (Playwright) and desktop     │
│                                                                      │
│  Build:                                                              │
│    - pnpm build:browser → Vite production build → deploy to CDN      │
│    - pnpm build:desktop → Tauri build → .dmg/.exe/.deb/.rpm          │
│    - Shared packages built once, consumed by both targets            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.5.9 When to Use Browser vs Desktop

| Scenario                           | Recommended | Why                                       |
| ---------------------------------- | ----------- | ----------------------------------------- |
| Quick review on any device         | Browser     | No install, works anywhere                |
| On-site work (poor internet)       | Desktop     | Full offline, local AI, no browser limits |
| Large project (100K+ elements)     | Desktop     | No memory limits, faster I/O              |
| Collaboration with team            | Either      | Same sync engine, identical UX            |
| Client presentation                | Browser     | Share link, no install needed             |
| Heavy AI usage (offline)           | Desktop     | Bundled local AI, no cloud dependency     |
| Working on Chromebook/tablet       | Browser     | Desktop not supported                     |
| Batch processing (export 20 files) | Desktop     | Multi-threaded, no browser limits         |
| Firm with IT security policies     | Desktop     | Local data, no cloud required             |

---

## 6.6 Hosted Cloud Storage & Subscription Model

### 6.6.1 Core Principle: Cloud is the Single Source of Truth

> **"Every edit, from every client, flows to our hosted service. Nothing is ever lost."**

OpenCAD is fundamentally a **cloud-first product**. Both the browser app and the desktop app save to our hosted cloud service. The cloud is not a sync target — it is the authoritative document store. Local storage (IndexedDB in browser, SQLite on desktop) is a **cache and offline buffer**, never the primary store.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified Cloud-First Architecture                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Browser App                          Desktop App                    │
│  ┌──────────────────────┐            ┌──────────────────────┐       │
│  │  React UI (shared)   │            │  React UI (shared)   │       │
│  │  WASM Kernel (shared)│            │  WASM Kernel (shared)│       │
│  │  IndexedDB (cache)   │            │  SQLite (cache)      │       │
│  │  Service Worker      │            │  Tauri Rust Backend  │       │
│  └──────────┬───────────┘            └──────────┬───────────┘       │
│             │                                    │                   │
│             │  WebSocket (real-time)             │  WebSocket        │
│             │  HTTP POST (batch offline)         │  HTTP POST        │
│             └────────────────┬───────────────────┘                   │
│                              │                                       │
│                     ┌────────▼────────┐                              │
│                     │  API Gateway     │                              │
│                     └────────┬────────┘                              │
│                              │                                       │
│                     ┌────────▼────────┐                              │
│                     │  Sync Service    │                              │
│                     │  (per-doc proc)  │                              │
│                     └────────┬────────┘                              │
│                              │                                       │
│              ┌───────────────┼───────────────┐                       │
│              │               │               │                       │
│     ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐                │
│     │  CRDT Store   │ │  Version   │ │  File Store │                │
│     │  (Redis)      │ │  History   │ │  (S3)       │                │
│     │               │ │  (Postgres)│ │             │                │
│     └───────────────┘ └────────────┘ └─────────────┘                │
│                                                                      │
│  KEY GUARANTEE: Every edit from every client is persisted to        │
│  the cloud. Local storage is a cache, never the source of truth.    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.6.2 Zero Data Loss Guarantee

#### The Problem

Figma's auto-save blog post reveals the essential complexity: **multiplayer editing creates branching history**, and merging offline branches back is fundamentally a distributed systems problem. Stale local changes can overwrite newer cloud changes. Missing local changes mean data loss.

#### Our Solution: Three-Layer Safety Net

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Zero Data Loss: Three-Layer Safety Net            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Real-Time Sync (Online)                                   │
│  ─────────────────────────────────────                              │
│  - Every property change sent to server within 100ms                │
│  - Server acknowledges before client considers it "saved"           │
│  - Delta-based: only changed properties transmitted                 │
│  - Client prevented from closing tab while pending ack exists       │
│                                                                      │
│  Layer 2: Offline Buffer + Replay (Disconnected)                    │
│  ──────────────────────────────────────────────                     │
│  - Changes stored in local pending buffer (memory)                  │
│  - Buffer committed to disk every 2s (browser: IndexedDB,           │
│    desktop: SQLite)                                                 │
│  - Critical invariant: disk = memory (exactly)                      │
│  - On reconnect: download fresh cloud state → replay local edits    │
│    on top → upload → wait for ack → clear disk                      │
│  - Conservative re-serialization: after reconnect, erase disk       │
│    and re-write from memory in single transaction (prevents         │
│    stale-change bugs from observer short-circuits)                  │
│                                                                      │
│  Layer 3: Version History Checkpoints (Disaster Recovery)           │
│  ─────────────────────────────────────────────────────────          │
│  - Automatic checkpoint BEFORE applying offline replay              │
│  - Automatic checkpoint AFTER applying offline replay               │
│  - Checkpoints stored immutably in S3 (never deleted)              │
│  - User can restore any checkpoint via UI                           │
│  - Checkpoints also created on every explicit "Save Version"        │
│  - Retention: unlimited for paid, 30-day for trial                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Data Loss Prevention Invariants

| Invariant | Enforcement |
|-----------|-------------|
| **Disk = Memory** | Local pending changes on disk must exactly match in-memory buffer. Verified on every commit. |
| **No Close During Sync** | Tab/app cannot close while changes await server acknowledgment. |
| **Stale Change Erasure** | After reconnect, disk is erased and re-serialized from memory before any changes are sent. |
| **Server is Authority** | The cloud defines event order. No timestamps needed — server receive order is the truth. |
| **Checkpoint Before Merge** | A version checkpoint is always created before replaying offline edits. |
| **Ack Before Clear** | Local disk changes are only cleared after explicit server acknowledgment. |

### 6.6.3 Subscription Model

#### Pricing Tiers

| Tier | Price | Storage | Version History | AI Credits | Collaboration | Desktop Access |
|------|-------|---------|-----------------|------------|---------------|----------------|
| **Trial** | 14 days free | Unlimited projects, 500MB each | 30 days | 50 prompts | 3 editors | ✅ |
| **Starter** | $29/mo | 25 projects, 500MB each | 30 days | 200 prompts/mo | 3 editors | ✅ |
| **Professional** | $59/mo | Unlimited projects, 5GB each | 1 year | 1,000 prompts/mo | 10 editors | ✅ |
| **Team** | $99/user/mo | Unlimited, 20GB each | Unlimited | 5,000 prompts/user/mo | Unlimited editors | ✅ |
| **Enterprise** | Custom | Unlimited, custom limits | Unlimited + audit log | Unlimited + fine-tuned | Unlimited + SSO | ✅ + MDM |

#### Trial Period

The 14-day trial gives full access to the platform — no credit card required to start.

| Aspect | Behavior |
|--------|----------|
| **Sign-up** | Email + password, no payment method required |
| **Duration** | 14 days from account creation |
| **Access** | Full Professional-tier features (unlimited projects, desktop app, AI, collaboration) |
| **Project Size Limit** | 500MB per project during trial |
| **Expiry Warning** | Day 10: in-app banner. Day 13: in-app + email. Day 14: in-app + email + desktop notification |
| **After Trial Expires** | Same as subscription expiry: 14-day grace period → read-only + export access |
| **Conversion** | User selects a paid tier at any point during trial; billing starts immediately, trial ends |
| **Re-trial** | Not permitted per email domain or payment method |

#### Desktop Subscription Enforcement

The desktop app **requires an active subscription** to function. However, we never block the user from their work:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Desktop Subscription Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Normal Operation (Subscription Active):                            │
│    1. Desktop app launches                                           │
│    2. Checks subscription status with cloud (async, non-blocking)   │
│    3. If active → full access                                        │
│    4. Syncs all projects to/from cloud                               │
│                                                                      │
│  Subscription Expired:                                               │
│    1. Desktop app launches                                           │
│    2. Subscription check fails                                       │
│    3. Grace period begins (14 days)                                  │
│    4. Full access during grace period + prominent renewal prompt    │
│    5. After grace period:                                            │
│       a. User CAN still open all projects (read-only)               │
│       b. User CAN export all data (IFC, DWG, PDF, etc.)             │
│       c. User CANNOT edit until subscription renewed                │
│       d. User CANNOT create new projects                            │
│       e. All data remains safely in cloud (never held hostage)      │
│                                                                      │
│  Offline During Grace Period:                                        │
│    1. Desktop cannot verify subscription                             │
│    2. Full access continues (offline grace: 30 days)                │
│    3. On reconnect: subscription re-verified                         │
│                                                                      │
│  Subscription Cancelled (User Choice):                               │
│    1. User cancels subscription                                      │
│    2. Current billing period continues                               │
│    3. After period ends: 14-day grace period                         │
│    4. After grace: read-only + export access                         │
│    5. All data preserved in cloud for 90 days                        │
│    6. After 90 days: data available for export for additional 90    │
│       days, then permanently deleted (with email warnings)           │
│                                                                      │
│  NEVER:                                                              │
│    ❌ Delete user data without warning                               │
│    ❌ Block access to existing projects                              │
│    ❌ Block data export                                              │
│    ❌ Hold data hostage for payment                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Subscription Verification

| Check | Frequency | Method | Offline Behavior |
|-------|-----------|--------|------------------|
| **Heartbeat** | Every 5 minutes (online) | REST API call to billing service | Skipped when offline |
| **Launch Check** | Every app launch | REST API call | Falls back to cached token |
| **Cached Token** | Stored locally | Signed JWT with expiry | Valid for 30 days offline |
| **Grace Period** | 14 days after expiry | Server-tracked | Locally tracked with server reconciliation |
| **Offline Grace** | 30 days | Locally tracked | Full access, reconciles on reconnect |

### 6.6.4 Browser vs Desktop: Same Cloud, Same Data

| Aspect | Browser App | Desktop App |
|--------|-------------|-------------|
| **Cloud Sync** | ✅ Same sync service | ✅ Same sync service |
| **Document Model** | ✅ Identical CRDT | ✅ Identical CRDT |
| **Version History** | ✅ Same checkpoints | ✅ Same checkpoints |
| **Collaboration** | ✅ Real-time with all clients | ✅ Real-time with all clients |
| **Offline Edits** | Buffered in IndexedDB → cloud on reconnect | Buffered in SQLite → cloud on reconnect |
| **Subscription Required** | Trial then paid | Requires active subscription |
| **Local Storage** | Cache only (browser quota limits) | Cache only (no quota limits) |
| **Data Portability** | Export from cloud | Export from cloud + local |

**Key guarantee:** A project edited in the browser and the same project edited on desktop are the **exact same document** in the cloud. There is no "browser version" vs "desktop version" — there is one document, accessible from any client.

### 6.6.5 Sync Flow: Detailed

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Detailed Sync Flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ONLINE — Real-Time Sync:                                           │
│  ─────────────────────────────                                      │
│  1. User makes edit (draws wall, moves door, changes property)      │
│  2. Edit applied to local document model immediately (optimistic)   │
│  3. Edit added to in-memory pending changes buffer                  │
│  4. Pending change sent to server via WebSocket (< 100ms)           │
│  5. Server receives change, applies to authoritative document state │
│  6. Server broadcasts change to all other connected clients         │
│  7. Server sends acknowledgment to originating client               │
│  8. Client removes change from pending buffer                       │
│  9. Client writes acknowledgment to disk (for crash safety)         │
│                                                                      │
│  OFFLINE — Local Editing:                                           │
│  ─────────────────────────────                                      │
│  1. User makes edit                                                  │
│  2. Edit applied to local document model immediately                │
│  3. Edit added to in-memory pending changes buffer                  │
│  4. Buffer committed to disk every 2s (atomic transaction)          │
│  5. Invariant verified: disk changes == memory changes              │
│  6. Repeat steps 1-5 for each edit                                  │
│                                                                      │
│  RECONNECT — Offline Replay:                                        │
│  ─────────────────────────────                                      │
│  1. Connectivity detected                                            │
│  2. Client downloads fresh document state from cloud                │
│  3. Server creates version checkpoint (PRE-REPLAY)                  │
│  4. Client replays local pending changes on top of fresh state      │
│  5. Client sends replayed changes to server                         │
│  6. Server applies changes (CRDT merge — automatic for most cases)  │
│  7. Server creates version checkpoint (POST-REPLAY)                 │
│  8. Server sends acknowledgment                                     │
│  9. Client erases disk changes (conservative clear)                 │
│  10. Client re-serializes any remaining pending changes             │
│      (single IndexedDB/SQLite transaction)                          │
│  11. Real-time WebSocket sync resumes                               │
│                                                                      │
│  CONFLICT — Large Offline Branch:                                   │
│  ──────────────────────────────────                                 │
│  1. CRDT auto-merges all non-conflicting changes                    │
│  2. If semantic conflict detected (e.g., same wall moved            │
│     differently in browser and desktop):                            │
│     a. Server keeps its version (authority)                         │
│     b. Client's version stored as alternative in version history    │
│     c. User notified: "Some offline edits created conflicts"        │
│     d. User can review and restore from POST-REPLAY checkpoint      │
│  3. No data is ever silently discarded                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.6.6 Cloud Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloud Storage Layers                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Hot Storage (Active Documents):                                    │
│  ──────────────────────────────────                                 │
│  - Redis: CRDT document state (in-memory, per-document process)     │
│  - Purpose: real-time sync, sub-100ms latency                       │
│  - Persistence: AOF (Append Only File) for crash recovery           │
│  - Eviction: never (active documents stay in memory)                │
│                                                                      │
│  Warm Storage (Document Snapshots):                                 │
│  ─────────────────────────────────────                              │
│  - PostgreSQL: Document metadata, version history index,            │
│    user data, permissions, billing                                  │
│  - Purpose: project listing, search, access control                 │
│  - Retention: lifetime of account                                   │
│                                                                      │
│  Cold Storage (Immutable Archives):                                 │
│  ─────────────────────────────────────                              │
│  - S3: Full document snapshots, version checkpoints,                │
│    exported files, imported originals                               │
│  - Purpose: disaster recovery, version restore, audit               │
│  - Retention: unlimited (paid), 30-day (free)                       │
│  - Durability: 99.999999999% (11 nines, S3 standard)               │
│  - Versioning: S3 versioning enabled (protects against deletion)    │
│                                                                      │
│  Backup:                                                             │
│  ─────────                                                            │
│  - Cross-region replication (primary + DR region)                   │
│  - Daily encrypted backups to separate storage account              │
│  - Point-in-time recovery for PostgreSQL (WAL archiving)            │
│  - RPO: 1 hour (maximum data loss in disaster)                      │
│  - RTO: 4 hours (time to restore service)                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.6.7 Subscription + Sync Test Requirements

| ID | Test | Priority |
|----|------|----------|
| T-SUB-001 | Browser edit → verify persisted to cloud within 2s | P0 |
| T-SUB-002 | Desktop edit → verify persisted to cloud within 2s | P0 |
| T-SUB-003 | Browser edit → open in desktop → verify same state | P0 |
| T-SUB-004 | Desktop edit → open in browser → verify same state | P0 |
| T-SUB-005 | Offline browser edit → reconnect → verify sync to cloud | P0 |
| T-SUB-006 | Offline desktop edit → reconnect → verify sync to cloud | P0 |
| T-SUB-007 | Simultaneous browser + desktop edit → verify CRDT merge | P0 |
| T-SUB-008 | Force crash during sync → restart → verify no data loss | P0 |
| T-SUB-009 | Subscription expires → verify 14-day grace period | P0 |
| T-SUB-010 | Grace period ends → verify read-only + export access | P0 |
| T-SUB-011 | Offline during grace → verify 30-day offline grace | P0 |
| T-SUB-012 | Subscription renewed → verify full access restored | P0 |
| T-SUB-013 | Cancel subscription → verify data preserved 90 days | P0 |
| T-SUB-014 | Large offline branch (1000 edits) → verify replay succeeds | P0 |
| T-SUB-015 | Replay creates conflict → verify checkpoint before + after | P0 |
| T-SUB-016 | Stale local changes → verify conservative erase prevents overwrite | P0 |
| T-SUB-017 | Tab close during pending sync → verify prevented | P0 |
| T-SUB-018 | Desktop close during pending sync → verify prevented | P0 |
| T-SUB-019 | 10 clients editing same doc → verify all changes persisted | P0 |
| T-SUB-020 | Server crash during sync → verify no partial state corruption | P0 |
| T-SUB-021 | Trial expiry → verify project limit enforced at cloud level | P1 |
| T-SUB-022 | Expired subscription → verify user can still export all data | P0 |

---

## 7. Core Feature Specifications

### 7.1 Phase 1: Foundation (MVP)

#### 7.1.1 Document & Project Management

| Feature               | Description                                      | Priority |
| --------------------- | ------------------------------------------------ | -------- |
| **Project Creation**  | Create new projects from blank or templates      | P0       |
| **Project Browser**   | List, search, filter, sort projects              | P0       |
| **Auto-Save**         | Continuous auto-save to local storage (every 2s) | P0       |
| **Cloud Sync**        | Background sync to cloud when online             | P0       |
| **Version History**   | View and restore previous versions               | P1       |
| **Project Templates** | Residential, commercial, interior templates      | P1       |
| **Import/Export**     | IFC 2x3/4, DWG (import), DXF, PDF, PNG, SVG      | P0       |

**Test Requirements:**

- [ ] T-DOC-001: Create project → verify document model initialized with correct schema
- [ ] T-DOC-002: Auto-save → verify data persisted to IndexedDB within 2s of edit
- [ ] T-DOC-003: Offline edit → go offline, edit, go online → verify sync completes
- [ ] T-DOC-004: Import IFC → verify model renders with correct hierarchy
- [ ] T-DOC-005: Export IFC → verify exported file validates against IFC schema
- [ ] T-DOC-006: Version history → create 5 versions → restore version 2 → verify state

#### 7.1.2 2D Drafting Tools

| Feature                 | Description                                               | Priority |
| ----------------------- | --------------------------------------------------------- | -------- |
| **Line Tool**           | Draw lines with precision (snap, constraints, dimensions) | P0       |
| **Rectangle / Polygon** | Draw closed shapes with constraints                       | P0       |
| **Arc / Circle**        | Draw arcs and circles with radius/diameter input          | P0       |
| **Polyline**            | Connected line segments                                   | P0       |
| **Spline / Bezier**     | Smooth curves through control points                      | P1       |
| **Dimension Tool**      | Linear, aligned, angular, radial dimensions               | P0       |
| **Text & Annotations**  | Text boxes, labels, callouts                              | P0       |
| **Hatch / Fill**        | Pattern fills for materials, sections                     | P1       |
| **Layers**              | Create, rename, reorder, show/hide, lock layers           | P0       |
| **Snapping**            | Endpoint, midpoint, intersection, perpendicular, tangent  | P0       |
| **Grid & Guides**       | Configurable grid, custom guides                          | P0       |
| **Undo / Redo**         | Unlimited undo/redo with history stack                    | P0       |

**Test Requirements:**

- [ ] T-2D-001: Draw line → verify geometry stored in document model with correct coordinates
- [ ] T-2D-002: Snap to endpoint → verify cursor snaps within 5px tolerance
- [ ] T-2D-003: Dimension line → verify dimension updates dynamically when geometry changes
- [ ] T-2D-004: Layer visibility → toggle layer off → verify elements hidden in viewport
- [ ] T-2D-005: Undo/redo → perform 20 actions → undo 10 → redo 5 → verify state consistency

#### 7.1.3 3D Modeling Tools

| Feature                 | Description                                            | Priority |
| ----------------------- | ------------------------------------------------------ | -------- |
| **Extrude**             | Extrude 2D profile to 3D solid                         | P0       |
| **Push/Pull**           | Interactive face extrusion (SketchUp-style)            | P0       |
| **Boolean Operations**  | Union, difference, intersection                        | P0       |
| **Fillet / Chamfer**    | Edge rounding and beveling                             | P1       |
| **Loft / Sweep**        | Surface through profiles, along path                   | P1       |
| **Wall Tool**           | Parametric wall creation (height, thickness, material) | P0       |
| **Slab / Floor Tool**   | Parametric floor slab creation                         | P0       |
| **Column Tool**         | Parametric column creation (rectangular, circular)     | P1       |
| **Beam Tool**           | Parametric beam creation                               | P1       |
| **Roof Tool**           | Parametric roof (flat, pitched, gable, hip)            | P0       |
| **Door / Window Tools** | Parametric door/window insertion with openings         | P0       |
| **Stair Tool**          | Parametric stair creation (straight, L, U, spiral)     | P1       |
| **Viewport Navigation** | Orbit, pan, zoom, preset views (top, front, side, 3D)  | P0       |
| **Shading Modes**       | Wireframe, hidden line, shaded, rendered               | P0       |

**Test Requirements:**

- [ ] T-3D-001: Extrude rectangle → verify solid volume = area × height (±0.1% tolerance)
- [ ] T-3D-002: Boolean difference → verify resulting topology is manifold
- [ ] T-3D-003: Wall tool → create wall → verify IFC export contains IfcWall with correct properties
- [ ] T-3D-004: Door insertion → verify wall opening created, door placed with correct frame
- [ ] T-3D-005: Orbit/pan/zoom → verify camera transforms correctly, no gimbal lock

#### 7.1.4 Viewport & Navigation

| Feature             | Description                                             | Priority |
| ------------------- | ------------------------------------------------------- | -------- |
| **Multi-Viewport**  | Split view (1–4 viewports, independent camera)          | P0       |
| **Camera Controls** | Orbit (middle mouse), pan (shift+middle), zoom (scroll) | P0       |
| **View Cubes**      | Navigate to standard views via view cube                | P1       |
| **Section Box**     | Interactive 3D sectioning                               | P0       |
| **2D/3D Toggle**    | Switch between 2D plan view and 3D model                | P0       |
| **Zoom to Fit**     | Fit model to viewport                                   | P0       |

### 7.2 Phase 2: BIM Depth

#### 7.2.1 Building Information Modeling

| Feature                      | Description                                       | Priority |
| ---------------------------- | ------------------------------------------------- | -------- |
| **IFC Property Sets**        | Full IFC property set editing (Psets)             | P0       |
| **Material Library**         | Predefined materials with physical properties     | P0       |
| **Object Classification**    | Uniclass, OmniClass, MasterFormat                 | P1       |
| **Space / Room Objects**     | Define spaces with area, volume, occupancy data   | P0       |
| **Schedule / Quantities**    | Automated quantity takeoff, door/window schedules | P0       |
| **Level / Story Management** | Create, edit, reorder building stories            | P0       |
| **Grid System**              | Structural grid creation and editing              | P1       |
| **Phasing**                  | Design phases (existing, demolition, new)         | P1       |
| **Design Options**           | Alternative design branches                       | P2       |

#### 7.2.2 MEP Modeling (Mechanical, Electrical, Plumbing)

| Feature             | Description                               | Priority |
| ------------------- | ----------------------------------------- | -------- |
| **Ductwork**        | Parametric duct creation and routing      | P1       |
| **Piping**          | Parametric pipe creation with fittings    | P1       |
| **Electrical**      | Outlet, switch, panel placement           | P2       |
| **Equipment**       | HVAC equipment, fixtures                  | P1       |
| **Clash Detection** | Automatic clash detection between systems | P0       |

#### 7.2.3 Structural Modeling

| Feature                         | Description                                         | Priority |
| ------------------------------- | --------------------------------------------------- | -------- |
| **Structural Analytical Model** | Auto-generated analytical model from physical model | P1       |
| **Foundation Tools**            | Footing, pile, mat foundation                       | P1       |
| **Reinforcement**               | Rebar placement and scheduling                      | P2       |
| **Structural Connections**      | Steel connections, joint details                    | P2       |

### 7.3 Phase 3: Documentation

#### 7.3.1 Construction Documents

| Feature                 | Description                                         | Priority |
| ----------------------- | --------------------------------------------------- | -------- |
| **Sheet Layout**        | Title blocks, sheet organization                    | P0       |
| **View Creation**       | Plan, elevation, section, detail views              | P0       |
| **Detail Tools**        | Callout details, keynotes, detail library           | P1       |
| **Tagging**             | Auto-tags for doors, windows, rooms, elements       | P0       |
| **Annotation**          | Dimensions, text, symbols, north arrows, scale bars | P0       |
| **Plot / Print**        | PDF export, print to scale, plot settings           | P0       |
| **Revision Management** | Revision clouds, revision tables                    | P1       |

#### 7.3.2 Rendering & Visualization

| Feature                 | Description                                     | Priority |
| ----------------------- | ----------------------------------------------- | -------- |
| **Real-Time Rendering** | PBR materials, shadows, ambient occlusion       | P0       |
| **Material Editor**     | Create/edit materials with PBR properties       | P0       |
| **Lighting**            | Sun study, artificial lights, HDRI environments | P1       |
| **Render Export**       | High-res image export                           | P0       |
| **Walkthrough**         | Camera path animation                           | P1       |

---

## 8. AI Feature Specifications

### 8.1 AI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Orchestration Layer                        │
├─────────────────────────────────────────────────────────────────────┤
│  Prompt Interface (Chat + Context-Aware)                             │
│  ├── Natural Language → Design Intent Parser                         │
│  ├── Context Injection (current model, selected elements, view)      │
│  └── Multi-turn Conversation State                                   │
├─────────────────────────────────────────────────────────────────────┤
│  AI Services                                                         │
│  ├── Design Generation Service                                       │
│  │   ├── Prompt → Floor Plan Generator                               │
│  │   ├── Prompt → Massing Generator                                  │
│  │   ├── Prompt → Facade Generator                                   │
│  │   └── Style Transfer / Precedent Matching                         │
│  ├── Design Modification Service                                     │
│  │   ├── "Move the kitchen closer to the living room"                │
│  │   ├── "Make all windows on the south facade larger"               │
│  │   └── "Add a second story matching the existing style"            │
│  ├── Code Compliance Service                                         │
│  │   ├── Building Code RAG Pipeline                                  │
│  │   ├── Rule-Based Checker (IBC, ADA, local codes)                  │
│  │   ├── Violation Reporter with Suggestions                         │
│  │   └── Permit Readiness Assessment                                 │
│  ├── Documentation Service                                           │
│  │   ├── Auto-Annotation                                             │
│  │   ├── Specification Generation                                    │
│  │   └── Construction Note Generation                                │
│  └── Analysis Service                                                │
│      ├── Solar / Daylight Analysis                                   │
│      ├── Energy Estimation                                           │
│      ├── Cost Estimation                                             │
│      └── Space Program Validation                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Model Layer                                                         │
│  ├── Cloud LLMs (GPT-4o, Claude Sonnet, Gemini)                      │
│  ├── Fine-Tuned Models (floor plan generation, code compliance)      │
│  ├── Local Models (Ollama: Llama 3.1 8B, Mistral) for offline        │
│  ├── Embedding Models (code embeddings, design patterns)             │
│  └── Vision Models (render critique, design review)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Knowledge Base                                                      │
│  ├── Building Code Database (IBC, ADA, Eurocode, local codes)        │
│  ├── Design Pattern Library                                          │
│  ├── Material Database                                               │
│  ├── Precedent Project Library                                       │
│  └── Firm-Specific Standards & Templates                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 AI Feature Details

#### 8.2.1 Prompt-to-Project (Design Generation)

**User Flow:**

1. User opens AI panel and types: _"Design a 3-bedroom, 2-bathroom single-story house, 1800 sq ft, with an open-plan kitchen/living area, master suite with walk-in closet, attached 2-car garage, and a covered back patio. Modern style, flat roof."_
2. AI parses the prompt, extracts requirements:
   - Program: 3 bedrooms, 2 bathrooms, kitchen, living, garage (2-car), patio
   - Area: ~1800 sq ft interior
   - Style: Modern, flat roof
   - Relationships: Open-plan kitchen/living, master suite with WIC
3. AI generates a **JSON design brief** for user review
4. User confirms or modifies the brief
5. AI generates the floor plan geometry in the document
6. User can iterate: _"Make the living room bigger, reduce bedroom 3"_

**Technical Implementation:**

- LLM parses natural language → structured JSON schema
- JSON schema validated against architectural rules (minimum room sizes, circulation paths)
- Geometry generated via parametric rules engine (not direct LLM geometry output)
- Output: Native OpenCAD BIM objects (walls, doors, windows, spaces)

**Test Requirements:**

- [ ] T-AI-001: Prompt → JSON → verify all rooms specified in prompt exist in output
- [ ] T-AI-002: Generated floor plan → verify total area within ±5% of requested area
- [ ] T-AI-003: Generated plan → verify minimum room dimensions meet IBC standards
- [ ] T-AI-004: Generated plan → verify circulation paths (no room requires passing through another)
- [ ] T-AI-005: Iteration → modify prompt → verify only requested changes applied

#### 8.2.2 AI Design Modification

**User Flow:**

1. User selects elements or area and types: _"Move the kitchen to the north side and make it open to the dining area"_
2. AI identifies affected elements, proposes changes with visual preview
3. User accepts/rejects/modifies
4. Changes applied as native BIM operations (not raster/image manipulation)

**Technical Implementation:**

- Context injection: current model state, selected elements, active view
- LLM generates a **sequence of BIM operations** (move wall, delete door, create opening)
- Operations validated against constraints before execution
- Preview rendered before commit

**Test Requirements:**

- [ ] T-AI-010: Modification → verify only specified elements changed
- [ ] T-AI-011: Modification → verify model remains valid (no overlapping elements, proper connections)
- [ ] T-AI-012: Modification → verify undo restores previous state completely

#### 8.2.3 AI Building Code Compliance

**User Flow:**

1. User clicks "Check Code Compliance"
2. AI analyzes the model against applicable building codes (based on project location)
3. Results displayed as a report with:
   - ✅ Passed checks
   - ⚠️ Warnings (recommendations)
   - ❌ Violations (with specific code references and suggested fixes)
4. User can click a violation to see the affected elements and suggested remediation

**Technical Implementation:**

- **Hybrid approach:** RAG + rule-based engine
  - **RAG Pipeline:** Building codes embedded as vector database, retrieved by context
  - **Rule Engine:** Deterministic rules (minimum corridor width, stair dimensions, egress requirements, ADA clearances)
  - **LLM Layer:** Interprets ambiguous code language, generates human-readable explanations
- **Code Database:** IBC 2024, ADA Standards, Eurocode, and jurisdiction-specific codes
- **Offline Mode:** Core rule engine runs locally; RAG requires cloud (or local model + embedded codes)

**Supported Code Checks (Phase 1):**

- Egress requirements (exit access, travel distance, dead-end corridors)
- Room minimum sizes (habitable rooms, bathrooms, corridors)
- Stair dimensions (rise, run, headroom, landings)
- Door clearances (ADA, egress)
- Window egress (bedrooms)
- Fire separation (between units, exits)
- Accessibility (ADA routes, clearances, turning radii)

**Test Requirements:**

- [ ] T-AI-020: Code check → verify all violations correctly identified (no false negatives)
- [ ] T-AI-021: Code check → verify no false positives on compliant model
- [ ] T-AI-022: Violation → verify correct code section cited
- [ ] T-AI-023: Suggested fix → verify fix resolves violation when applied
- [ ] T-AI-024: Offline → verify core rule engine runs without internet

#### 8.2.4 AI-Assisted Documentation

| Feature                      | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Auto-Annotation**          | AI suggests dimensions, tags, and labels for selected view                    |
| **Specification Generation** | AI generates material specifications from model                               |
| **Construction Notes**       | AI generates standard construction notes based on project type                |
| **Detail Suggestions**       | AI suggests standard details (wall section, foundation detail) based on model |

#### 8.2.5 AI Analysis & Optimization

| Feature                      | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Solar Analysis**           | AI suggests optimal building orientation for solar gain                   |
| **Energy Estimation**        | Rough energy use estimate from model geometry and materials               |
| **Cost Estimation**          | AI estimates construction cost from quantity takeoff + regional cost data |
| **Space Program Validation** | AI verifies design meets the original space program requirements          |

### 8.3 AI Safety & Quality Guarantees

| Concern                             | Mitigation                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------- |
| **AI generates invalid geometry**   | All AI output validated through geometry kernel before applying            |
| **AI violates building codes**      | Code compliance checker runs independently of AI generation                |
| **AI hallucinates code references** | Rule-based engine provides deterministic checks; LLM only explains         |
| **User over-relies on AI**          | Clear disclaimers, "AI-assisted" labels, professional review required      |
| **Data privacy**                    | Local model option (Ollama), no project data sent to cloud without consent |

---

## 9. Offline-First Architecture

### 9.1 Design Principles

1. **Local-First** — The local device is the source of truth. Cloud is for sync and collaboration.
2. **Identical UX Online/Offline** — No degraded mode. The app works the same regardless of connectivity.
3. **Automatic Sync** — When connectivity returns, sync happens automatically in the background.
4. **Conflict Resolution** — CRDTs handle concurrent edits automatically; user notified of semantic conflicts.

### 9.2 Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Local Storage Stack                               │
├─────────────────────────────────────────────────────────────────────┤
│  IndexedDB (Structured Data)                                         │
│  ├── Document Store (CRDT document state)                            │
│  ├── Sync Queue (pending operations for server)                      │
│  ├── User Preferences                                                │
│  ├── Material Library (cached)                                       │
│  ├── Plugin Cache                                                    │
│  └── Building Code Rules (core rule engine)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Origin Private File System (OPFS) (Binary Assets)                   │
│  ├── Geometry Cache (WASM kernel intermediate files)                 │
│  ├── Textures & Materials                                            │
│  ├── Thumbnails & Previews                                           │
│  ├── Imported Files (IFC, DWG originals)                             │
│  └── Local AI Model Files (Ollama models, if installed)              │
├─────────────────────────────────────────────────────────────────────┤
│  Cache API (HTTP Assets)                                             │
│  ├── App Shell (HTML, JS, CSS, WASM binaries)                        │
│  ├── Font Files                                                      │
│  ├── Icon Assets                                                     │
│  └── Plugin Scripts                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 Storage Capacity Planning

| Storage Type     | Typical Size     | Browser Limit          | Strategy                          |
| ---------------- | ---------------- | ---------------------- | --------------------------------- |
| App Shell        | 15–25 MB         | Persistent (PWA)       | Cache all on install              |
| Active Document  | 5–50 MB          | Generous quota         | IndexedDB, full persistence       |
| Document History | 50–200 MB        | Generous quota         | LRU eviction, user-configurable   |
| Imported Files   | 10–500 MB        | OPFS quota             | OPFS, user-managed                |
| Local AI Models  | 4–8 GB per model | OPFS + user permission | Optional, user-initiated download |
| Material Library | 100–500 MB       | OPFS                   | Cache on first use                |

### 9.4 Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Sync Flow                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Local Edit → CRDT Operation → IndexedDB (immediate)                │
│                              → Sync Queue (IndexedDB)               │
│                              → UI Update (instant, optimistic)       │
│                                                                      │
│  Service Worker (background):                                         │
│    1. Poll sync queue every 5s when online                           │
│    2. Batch operations (up to 50 ops per request)                    │
│    3. Send to server via WebSocket or HTTP POST                      │
│    4. Server applies, broadcasts to other clients                    │
│    5. Server acknowledges → mark synced in IndexedDB                 │
│    6. On conflict → CRDT auto-resolves, notify user if semantic      │
│                                                                      │
│  Remote Edit (from other client):                                     │
│    1. Server broadcasts via WebSocket                                │
│    2. Client receives CRDT operation                                 │
│    3. Apply to local document (CRDT merge)                           │
│    4. Update UI                                                      │
│    5. Persist to IndexedDB                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.5 Offline AI Capabilities

| AI Feature                         | Online | Offline (no local model) | Offline (local Ollama)    |
| ---------------------------------- | ------ | ------------------------ | ------------------------- |
| Code Compliance (rule engine)      | ✅     | ✅                       | ✅                        |
| Code Compliance (RAG explanations) | ✅     | ❌                       | ✅                        |
| Prompt-to-Project                  | ✅     | ❌                       | ✅ (reduced quality)      |
| Design Modification                | ✅     | ❌                       | ✅ (reduced quality)      |
| Auto-Annotation                    | ✅     | ❌                       | ✅                        |
| Cost Estimation                    | ✅     | ❌                       | ❌ (needs live cost data) |
| Solar Analysis                     | ✅     | ✅ (local calculation)   | ✅                        |

### 9.6 Offline Test Requirements

- [ ] T-OFF-001: Install PWA → go offline → open app → verify full functionality
- [ ] T-OFF-002: Offline edit → create wall, door, window → verify saved to IndexedDB
- [ ] T-OFF-003: Go online after offline edits → verify sync completes within 10s
- [ ] T-OFF-004: Simultaneous offline edits on 2 devices → go online → verify CRDT merge
- [ ] T-OFF-005: Storage quota warning → verify user notified at 80% usage
- [ ] T-OFF-006: Offline code compliance → verify rule engine runs without internet
- [ ] T-OFF-007: App update while offline → verify update queued, applied on next online

---

## 10. Real-Time Collaboration

### 10.1 Collaboration Model

OpenCAD uses a **CRDT-based real-time collaboration** system inspired by Figma's architecture, adapted for BIM data structures.

### 10.2 CRDT Data Model

```typescript
// Document model as CRDT structure
interface CRDTDocument {
  id: string;
  version: VectorClock;
  elements: Y.Map<CRDTElement>;    // Walls, doors, windows, etc.
  layers: Y.Map<CRDTLayer>;        // Layer definitions
  views: Y.Map<CRDTView>;          // Saved views
  materials: Y.Map<CRDTMaterial>;  // Material definitions
  spaces: Y.Map<CRDTSpace>;        // Room/space definitions
  annotations: Y.Map<CRDTAnnotation>;
}

interface CRDTElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'slab' | 'roof' | ...;
  properties: Y.Map<PropertyValue>;
  geometry: CRDTGeometry;  // WASM kernel reference + serialized params
  layerId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
```

### 10.3 Collaboration Features

| Feature               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| **Live Cursors**      | See other users' cursor positions and selections          |
| **Presence**          | See who is viewing/editing the project                    |
| **Live Editing**      | Multiple users edit simultaneously, CRDT auto-merges      |
| **Comments**          | Threaded comments anchored to model elements or locations |
| **Mentions**          | @mention team members in comments                         |
| **Sharing**           | Share links with view/edit permissions                    |
| **Version Branching** | Create design branches for exploration                    |
| **Activity Feed**     | See recent changes by all collaborators                   |

### 10.4 Collaboration Test Requirements

- [ ] T-COL-001: Two users edit same element → verify CRDT resolves without data loss
- [ ] T-COL-002: Two users edit different elements → verify both changes appear instantly
- [ ] T-COL-003: User A goes offline, edits → User B edits same element → User A reconnects → verify merge
- [ ] T-COL-004: 10 concurrent users → verify latency < 200ms for remote edits
- [ ] T-COL-005: Comment on element → verify comment persists after element modified

---

## 11. File Format Interoperability

### 11.1 Interoperability Principle

> **"OpenCAD must open any file an architect hands them."**

Architects work in heterogeneous environments. A firm may use Archicad internally but receive consultant files in Revit, structural models in IFC, site surveys in DWG, and interior designs in SKP. OpenCAD must import, work with, and export all of these — without requiring the source application.

### 11.2 Supported File Formats — Complete Matrix

#### 11.2.1 Native & Project Formats

| Format               | Extension   | Import | Export | Notes                                       | Priority |
| -------------------- | ----------- | ------ | ------ | ------------------------------------------- | -------- |
| **OpenCAD Native**   | `.opencad`  | ✅     | ✅     | JSON-based, CRDT-structured, human-readable | P0       |
| **OpenCAD Archive**  | `.opencada` | ✅     | ✅     | Bundled project with assets (like PLA)      | P1       |
| **OpenCAD Template** | `.opencadt` | ✅     | ✅     | Reusable project templates                  | P1       |

#### 11.2.2 Open BIM Formats

| Format       | Extension | Import | Export | Notes                                        | Priority |
| ------------ | --------- | ------ | ------ | -------------------------------------------- | -------- |
| **IFC 2x3**  | `.ifc`    | ✅     | ✅     | STEP-based, most widely used IFC version     | P0       |
| **IFC 4**    | `.ifc`    | ✅     | ✅     | Improved geometry, JSON support              | P0       |
| **IFC 4x3**  | `.ifc`    | ✅     | ✅     | Infrastructure/bridge support                | P2       |
| **BCF**      | `.bcfzip` | ✅     | ✅     | BIM Collaboration Format for issues/comments | P0       |
| **BCF API**  | —         | ✅     | ✅     | Live BCF server integration                  | P1       |
| **CityGML**  | `.gml`    | ✅     | ✅     | Urban/city-scale models                      | P2       |
| **CityJSON** | `.json`   | ✅     | ✅     | JSON-based city models                       | P2       |

#### 11.2.3 Proprietary BIM Formats

| Format               | Extension | Import | Export | Notes                                                            | Priority |
| -------------------- | --------- | ------ | ------ | ---------------------------------------------------------------- | -------- |
| **Archicad Project** | `.pln`    | ✅     | ❌     | Graphisoft proprietary; read via libpln reverse-engineering      | P0       |
| **Archicad Archive** | `.pla`    | ✅     | ❌     | Bundled PLN + dependencies; read via libpln                      | P0       |
| **Archicad Backup**  | `.bpn`    | ✅     | ❌     | Backup package; extract and read PLN                             | P1       |
| **Revit Project**    | `.rvt`    | ✅     | ❌     | Autodesk proprietary; read via Revit API server or DB extraction | P0       |
| **Revit Family**     | `.rfa`    | ✅     | ❌     | Revit component files                                            | P1       |
| **Revit Template**   | `.rte`    | ✅     | ❌     | Revit project templates                                          | P2       |

#### 11.2.4 CAD Formats

| Format       | Extension | Import | Export | Notes                                          | Priority |
| ------------ | --------- | ------ | ------ | ---------------------------------------------- | -------- |
| **DWG**      | `.dwg`    | ✅     | ✅     | AutoCAD native; via ODA Teigha or LibreDWG     | P0       |
| **DXF**      | `.dxf`    | ✅     | ✅     | AutoCAD interchange; via dxflib                | P0       |
| **DGN**      | `.dgn`    | ✅     | ✅     | MicroStation/Bentley format; via ODA or libdgn | P1       |
| **DWF**      | `.dwf`    | ✅     | ❌     | Autodesk Design Review; read-only              | P2       |
| **HPGL/PLT** | `.plt`    | ✅     | ✅     | Plotter format for legacy drawings             | P2       |

#### 11.2.5 3D Model Formats

| Format            | Extension       | Import | Export | Notes                                        | Priority |
| ----------------- | --------------- | ------ | ------ | -------------------------------------------- | -------- |
| **SketchUp**      | `.skp`          | ✅     | ✅     | Via libskp or OpenSketchUp                   | P0       |
| **STEP**          | `.step`, `.stp` | ✅     | ✅     | ISO 10303, mechanical/manufacturing exchange | P1       |
| **STL**           | `.stl`          | ✅     | ✅     | Mesh format, 3D printing                     | P0       |
| **OBJ**           | `.obj`          | ✅     | ✅     | Wavefront, geometry + materials              | P0       |
| **FBX**           | `.fbx`          | ✅     | ✅     | Autodesk interchange, animation              | P1       |
| **glTF/GLB**      | `.gltf`, `.glb` | ✅     | ✅     | Khronos standard, web-optimized              | P0       |
| **3DS**           | `.3ds`          | ✅     | ❌     | Legacy 3D Studio                             | P2       |
| **DAE (Collada)** | `.dae`          | ✅     | ✅     | XML-based interchange                        | P1       |
| **PLY**           | `.ply`          | ✅     | ✅     | Point cloud + mesh                           | P1       |

#### 11.2.6 Point Cloud & Survey Formats

| Format      | Extension      | Import | Export | Notes                        | Priority |
| ----------- | -------------- | ------ | ------ | ---------------------------- | -------- |
| **LAS/LAZ** | `.las`, `.laz` | ✅     | ❌     | LiDAR point cloud            | P1       |
| **E57**     | `.e57`         | ✅     | ❌     | ASTM point cloud standard    | P1       |
| **PTS/PTX** | `.pts`, `.ptx` | ✅     | ❌     | Raw scanner output           | P2       |
| **RCP/RCS** | `.rcp`, `.rcs` | ✅     | ❌     | ReCap point cloud (Autodesk) | P2       |

#### 11.2.7 Image & Document Formats

| Format      | Extension       | Import | Export | Notes                                | Priority |
| ----------- | --------------- | ------ | ------ | ------------------------------------ | -------- |
| **PDF**     | `.pdf`          | ✅     | ✅     | Vector + raster, underlay and export | P0       |
| **PNG**     | `.png`          | ✅     | ✅     | Raster image, viewport export        | P0       |
| **SVG**     | `.svg`          | ✅     | ✅     | Vector 2D export                     | P0       |
| **TIFF**    | `.tif`, `.tiff` | ✅     | ✅     | Geo-referenced images, site plans    | P1       |
| **JPEG**    | `.jpg`, `.jpeg` | ✅     | ✅     | Raster images                        | P0       |
| **GeoTIFF** | `.tif`          | ✅     | ❌     | Site survey with coordinates         | P1       |

#### 11.2.8 Data Exchange Formats

| Format    | Extension       | Import | Export | Notes                                | Priority |
| --------- | --------------- | ------ | ------ | ------------------------------------ | -------- |
| **CSV**   | `.csv`          | ✅     | ✅     | Schedules, quantities, property sets | P0       |
| **Excel** | `.xlsx`         | ✅     | ✅     | Schedules, BOM                       | P1       |
| **JSON**  | `.json`         | ✅     | ✅     | AI design briefs, custom data        | P0       |
| **XML**   | `.xml`          | ✅     | ✅     | IFC XML, custom schemas              | P1       |
| **COBie** | `.xlsx`, `.ifc` | ✅     | ✅     | Facility handover data               | P1       |

### 11.3 Import Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Import Pipeline                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  File Upload → Format Detection → Parser Selection                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Parser Layer (WASM + Web Workers)                            │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  IFC Parser (web-ifc WASM)                                    │    │
│  │  DWG/DXF Parser (LibreDWG / dxflib WASM)                     │    │
│  │  PLN/PLA Parser (libpln reverse-engineered)                  │    │
│  │  RVT Parser (Revit DB API via server-side conversion)        │    │
│  │  SKP Parser (libskp WASM)                                    │    │
│  │  STEP Parser (OpenCASCADE native)                            │    │
│  │  glTF/OBJ/STL Parser (Three.js loaders)                      │    │
│  │  Point Cloud Parser (Potree/Octree WASM)                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  → Normalization → OpenCAD Document Model                           │
│    (all formats converted to internal CRDT structure)                │
│                                                                      │
│  → Geometry Conversion → WASM Kernel                                │
│    (BREP/NURBS conversion where applicable)                          │
│                                                                      │
│  → Property Mapping → BIM Properties                                │
│    (IFC Psets, Revit parameters, Archicad properties → OpenCAD)     │
│                                                                      │
│  → Validation → User Review                                         │
│    (report import issues, missing data, approximations)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.4 Export Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Export Pipeline                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Selects Format → OpenCAD Document Model                       │
│                                                                      │
│  → Format-Specific Serializer                                       │
│    (CRDT document → target format structure)                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Serializer Layer (WASM + Web Workers)                        │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  IFC Serializer (web-ifc WASM)                               │    │
│  │  DWG/DXF Serializer (LibreDWG / dxflib WASM)                 │    │
│  │  PDF Generator (PDF.js / custom WASM)                        │    │
│  │  glTF/OBJ/STL Serializer (Three.js exporters)                │    │
│  │  STEP Serializer (OpenCASCADE native)                        │    │
│  │  SKP Serializer (libskp WASM)                                │    │
│  │  CSV/Excel Serializer (native JS)                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  → Geometry Conversion → Target Format                              │
│    (BREP/NURBS → target geometry representation)                     │
│                                                                      │
│  → Property Mapping → Target Properties                             │
│    (OpenCAD properties → IFC Psets, Revit params, etc.)             │
│                                                                      │
│  → Validation → Download                                            │
│    (validate against format schema, report issues)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.5 Proprietary Format Import Strategy

#### 11.5.1 Archicad (.pln / .pla / .bpn)

| Approach            | Details                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Primary**         | `libpln` — reverse-engineered C++ library for PLN file parsing, compiled to WASM                       |
| **Fallback**        | Server-side conversion using Archicad Engine (licensed, headless) for complex files                    |
| **Data Extracted**  | 3D geometry, 2D drawings, layers, materials, IFC data, properties, views, layouts                      |
| **Limitations**     | Some Archicad-specific features (GDL objects, complex parametric profiles) may not translate perfectly |
| **User Experience** | Import report shows what was converted, what was approximated, and what was lost                       |

#### 11.5.2 Revit (.rvt / .rfa)

| Approach            | Details                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Primary**         | Server-side conversion service using Revit API (headless Revit on licensed server)                 |
| **Alternative**     | Direct RVT database parsing (reverse-engineered, limited to older RVT versions)                    |
| **Data Extracted**  | 3D geometry, families, parameters, phases, worksets, views (2D), schedules                         |
| **Limitations**     | Revit-specific features (parametric families, complex formulas, Dynamo scripts) cannot be imported |
| **User Experience** | User uploads RVT → server converts to OpenCAD format → downloads with import report                |

#### 11.5.3 DWG/DXF

| Approach              | Details                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Primary**           | LibreDWG (LGPL) compiled to WASM for DWG; dxflib (GPL) for DXF                                        |
| **Commercial Option** | ODA Teigha SDK (licensed) for full DWG compatibility                                                  |
| **Data Extracted**    | 2D geometry, 3D solids, layers, blocks, dimensions, text, hatches, XRefs                              |
| **Limitations**       | DWG proxy objects, custom entities, and some ACIS 3D solids may not parse                             |
| **User Experience**   | Direct browser import for DXF; WASM-based DWG parsing for most files; server fallback for complex DWG |

### 11.6 Data Fidelity & Mapping

#### 11.6.1 Import Fidelity Levels

| Level       | Description                                                  | Visual Indicator |
| ----------- | ------------------------------------------------------------ | ---------------- |
| **Perfect** | All geometry, properties, and relationships preserved        | ✅ Green         |
| **High**    | Geometry preserved, some metadata approximated               | 🟢 Green-yellow  |
| **Good**    | Geometry preserved with minor approximations, some data lost | 🟡 Yellow        |
| **Partial** | Significant geometry or data loss, manual review needed      | 🟠 Orange        |
| **Failed**  | Cannot import file or critical data lost                     | 🔴 Red           |

#### 11.6.2 Property Mapping Examples

**Archicad → OpenCAD:**

```
Archicad Property          → OpenCAD Property
─────────────────────────────────────────────
Element ID                 → element.id
Layer (Story)              → element.level + element.layer
Building Material          → element.material
IFC Type (IfcWall, etc.)   → element.ifcType
Parameters (custom)        → element.properties.custom
Profile (wall/slab)        → element.geometry.profile
GDL Object parameters      → element.properties (approximated)
```

**Revit → OpenCAD:**

```
Revit Property             → OpenCAD Property
─────────────────────────────────────────────
Element Id                 → element.id
Category                   → element.category
Family / Type              → element.family + element.type
Parameters (instance/type) → element.properties
Level                      → element.level
Phase                      → element.phase
Workset                    → element.workset
Material                   → element.material
```

**IFC → OpenCAD:**

```
IFC Entity                 → OpenCAD Property
─────────────────────────────────────────────
IfcWall, IfcSlab, etc.     → element.type + element.ifcType
GlobalId                   → element.globalId
ObjectPlacement            → element.transform
Representation             → element.geometry
Property Sets (Pset_*)     → element.properties
Material Assignments       → element.material
```

### 11.7 Import/Export Test Requirements

#### 11.7.1 IFC Tests

| ID        | Test                                                                     | Priority |
| --------- | ------------------------------------------------------------------------ | -------- |
| T-IFC-001 | Import IFC 2x3 → verify all Ifc entities mapped to OpenCAD elements      | P0       |
| T-IFC-002 | Import IFC 4 → verify improved geometry (NURBS, CSG) preserved           | P0       |
| T-IFC-003 | Export IFC 2x3 → validate against buildingSMART IFC certification        | P0       |
| T-IFC-004 | Export IFC 4 → validate against buildingSMART IFC certification          | P0       |
| T-IFC-005 | Round-trip IFC → export → re-import → verify geometry identical (±0.1mm) | P0       |
| T-IFC-006 | Import IFC with property sets → verify all Psets accessible in UI        | P0       |
| T-IFC-007 | Import large IFC (500MB) → verify loads within 30s                       | P1       |

#### 11.7.2 Archicad Tests

| ID       | Test                                                                     | Priority |
| -------- | ------------------------------------------------------------------------ | -------- |
| T-AC-001 | Import .pln (Archicad 27) → verify 3D geometry renders                   | P0       |
| T-AC-002 | Import .pln → verify layers/stories mapped correctly                     | P0       |
| T-AC-003 | Import .pln → verify IFC data preserved                                  | P0       |
| T-AC-004 | Import .pla → verify all linked assets included                          | P0       |
| T-AC-005 | Import .pln → verify 2D drawings on layouts preserved                    | P1       |
| T-AC-006 | Import .pln → generate import report with fidelity rating                | P0       |
| T-AC-007 | Import GDL objects → verify approximated as static geometry with warning | P1       |

#### 11.7.3 Revit Tests

| ID        | Test                                                      | Priority |
| --------- | --------------------------------------------------------- | -------- |
| T-RVT-001 | Import .rvt (Revit 2024) → verify 3D geometry renders     | P0       |
| T-RVT-002 | Import .rvt → verify categories mapped to OpenCAD types   | P0       |
| T-RVT-003 | Import .rvt → verify parameters preserved as properties   | P0       |
| T-RVT-004 | Import .rvt → verify levels mapped to OpenCAD stories     | P0       |
| T-RVT-005 | Import .rfa (family) → verify as reusable component       | P1       |
| T-RVT-006 | Import .rvt → generate import report with fidelity rating | P0       |
| T-RVT-007 | Import .rvt with phases → verify phase data preserved     | P1       |

#### 11.7.4 DWG/DXF Tests

| ID        | Test                                                            | Priority |
| --------- | --------------------------------------------------------------- | -------- |
| T-DWG-001 | Import .dwg (AutoCAD 2018+) → verify 2D geometry renders        | P0       |
| T-DWG-002 | Import .dwg → verify 3D solids converted to OpenCAD geometry    | P0       |
| T-DWG-003 | Import .dwg → verify layers mapped to OpenCAD layers            | P0       |
| T-DWG-004 | Import .dwg → verify blocks converted to OpenCAD components     | P0       |
| T-DWG-005 | Export .dwg → verify opens correctly in AutoCAD                 | P0       |
| T-DWG-006 | Import .dxf → verify all entities parsed                        | P0       |
| T-DWG-007 | Export .dxf → verify opens correctly in AutoCAD/LibreCAD        | P0       |
| T-DWG-008 | Round-trip DWG → export → re-import → verify geometry identical | P1       |

#### 11.7.5 SketchUp Tests

| ID        | Test                                                          | Priority |
| --------- | ------------------------------------------------------------- | -------- |
| T-SKP-001 | Import .skp (SketchUp 2020+) → verify geometry renders        | P0       |
| T-SKP-002 | Import .skp → verify materials/colors preserved               | P0       |
| T-SKP-003 | Import .skp → verify components converted to OpenCAD elements | P1       |
| T-SKP-004 | Export .skp → verify opens correctly in SketchUp              | P1       |

#### 11.7.6 PDF Tests

| ID        | Test                                                           | Priority |
| --------- | -------------------------------------------------------------- | -------- |
| T-PDF-001 | Import PDF as underlay → verify displays in viewport           | P0       |
| T-PDF-002 | Export 2D drawing to PDF → verify vector quality, scale        | P0       |
| T-PDF-003 | Export sheet set to multi-page PDF → verify all views included | P0       |
| T-PDF-004 | Export PDF → verify layers preserved as PDF layers             | P1       |

#### 11.7.7 General Import/Export Tests

| ID       | Test                                                             | Priority |
| -------- | ---------------------------------------------------------------- | -------- |
| T-IO-001 | Import 50MB file → verify completes within 15s                   | P0       |
| T-IO-002 | Import corrupted file → verify graceful error message            | P0       |
| T-IO-003 | Import unsupported format → verify clear error with alternatives | P0       |
| T-IO-004 | Batch import 10 files → verify all processed                     | P1       |
| T-IO-005 | Export while offline → verify exports to local storage           | P0       |
| T-IO-006 | Import → verify no data leaks to server (privacy)                | P0       |

### 11.8 buildingSMART Certification

| Requirement               | Details                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **IFC 2x3 Certification** | Must pass buildingSMART IFC 2x3 Coordination View 2.0 certification                 |
| **IFC 4 Certification**   | Must pass buildingSMART IFC 4 Reference View and Design Transfer View certification |
| **BCF Certification**     | Must pass BCF 2.1 / 3.0 certification for issue exchange                            |
| **Timeline**              | Target certification by Month 9 (Phase 3)                                           |
| **Testing**               | Use buildingSMART IFC validation suite with 200+ test files                         |

### 11.9 Interoperability Performance Targets

| Metric                           | Target                              |
| -------------------------------- | ----------------------------------- |
| **IFC Import (100MB)**           | < 10s                               |
| **IFC Import (500MB)**           | < 30s                               |
| **DWG Import (50MB)**            | < 5s                                |
| **RVT Import (via server)**      | < 60s (including upload + download) |
| **PLN Import (WASM)**            | < 15s                               |
| **IFC Export (typical project)** | < 10s                               |
| **DWG Export**                   | < 5s                                |
| **PDF Export (sheet set)**       | < 10s                               |
| **Import Fidelity (IFC)**        | > 99% geometry, > 95% properties    |
| **Import Fidelity (DWG)**        | > 98% geometry                      |
| **Import Fidelity (PLN)**        | > 95% geometry, > 90% properties    |
| **Import Fidelity (RVT)**        | > 95% geometry, > 90% properties    |

---

## 12. Extensibility & Plugin System

### 12.1 Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Plugin System                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Plugin SDK (TypeScript)                                             │
│  ├── API Client (document model, geometry, UI)                       │
│  ├── Type Definitions                                                │
│  ├── Testing Utilities                                               │
│  └── Build Tools (Vite plugin, bundler)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Plugin Runtime (Sandboxed)                                          │
│  ├── Web Worker Execution                                            │
│  ├── Sandboxed DOM (iframe for UI)                                   │
│  ├── Permission System (read-only, geometry, network, storage)       │
│  ├── Lifecycle Hooks (onLoad, onUnload, onSelectionChange, etc.)     │
│  └── Communication Bridge (postMessage-based)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Plugin Marketplace                                                  │
│  ├── Browse & Search                                                 │
│  ├── Install / Uninstall                                             │
│  ├── Reviews & Ratings                                               │
│  ├── Revenue Share (70/30 developer/platform)                        │
│  └── Enterprise Plugin Vetting                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Plugin API Surface

| API Category      | Capabilities                                       |
| ----------------- | -------------------------------------------------- |
| **Document API**  | Read/write elements, layers, materials, views      |
| **Geometry API**  | Create/modify geometry via WASM kernel             |
| **UI API**        | Add panels, tool buttons, menu items, dialogs      |
| **Selection API** | Get/set selection, listen to selection changes     |
| **Viewport API**  | Control camera, add overlays, custom rendering     |
| **Event API**     | Listen to document changes, undo/redo, save events |
| **Network API**   | HTTP requests (with user permission)               |
| **Storage API**   | Plugin-specific persistent storage                 |
| **AI API**        | Access AI services (code compliance, generation)   |

### 12.3 Plugin Test Requirements

- [ ] T-PLG-001: Install plugin → verify runs in sandboxed environment
- [ ] T-PLG-002: Plugin creates wall → verify wall appears in document model
- [ ] T-PLG-003: Plugin requests network → verify permission prompt shown
- [ ] T-PLG-004: Malicious plugin tries to access forbidden API → verify blocked
- [ ] T-PLG-005: Plugin UI renders → verify no interference with main app

---

## 12. Test-Driven Development Strategy

### 12.1 TDD Philosophy for OpenCAD

> **"We do not write production code without a failing test first."**

Every feature in this PRD is defined by its test requirements before implementation. The workflow is:

1. **Write the test specification** (defined in this PRD)
2. **Write the failing test** (Red)
3. **Write minimal code to pass the test** (Green)
4. **Refactor** while keeping tests passing (Refactor)
5. **Repeat**

### 12.2 Testing Pyramid

```
                        ┌─────────────┐
                        │   E2E Tests │  Playwright: Full user workflows
                        │   (~500)    │  Browser + WASM + Server
                   ┌────┴─────────────┴────┐
                   │  Integration Tests    │  Component + API + WASM integration
                   │     (~2,000)          │  Multi-module testing
              ┌────┴───────────────────────┴────┐
              │        Unit Tests               │  Pure functions, data structures
              │         (~8,000)                │  Fast, deterministic, isolated
         ┌────┴─────────────────────────────────┴────┐
         │      Geometry Kernel Tests                │  WASM-specific, numerical precision
         │         (~3,000)                          │  Tolerance-based assertions
    ┌────┴───────────────────────────────────────────┴────┐
    │          Property-Based Tests                       │  Fast-check: generate thousands of inputs
    │            (~1,500)                                 │  Verify invariants hold universally
    └─────────────────────────────────────────────────────┘
```

### 12.3 Test Categories & Frameworks

| Category                | Framework                    | Location                                    | Execution                    |
| ----------------------- | ---------------------------- | ------------------------------------------- | ---------------------------- |
| **Unit Tests**          | Vitest                       | `packages/*/src/**/*.test.ts`               | Every commit, CI             |
| **Integration Tests**   | Vitest + Testing Library     | `packages/*/src/**/*.integration.test.ts`   | Every PR                     |
| **E2E Tests**           | Playwright                   | `e2e/**/*.spec.ts`                          | Every PR, nightly full suite |
| **Geometry Tests**      | Vitest + Custom WASM harness | `packages/geometry-kernel/src/**/*.test.ts` | Every commit                 |
| **Property Tests**      | fast-check                   | Alongside unit tests                        | Every PR                     |
| **Performance Tests**   | Custom benchmarks            | `benchmarks/**/*.bench.ts`                  | Nightly                      |
| **Visual Regression**   | Playwright + Percy           | `e2e/visual/**/*.spec.ts`                   | Every PR                     |
| **Accessibility Tests** | axe-core + Playwright        | `e2e/a11y/**/*.spec.ts`                     | Every PR                     |

### 12.4 Geometry Kernel Testing Strategy

The geometry kernel requires specialized testing due to numerical precision and topological correctness:

```typescript
// Example: Geometry test with tolerance-based assertions
describe('Boolean Operations', () => {
  test('union of two overlapping boxes produces manifold solid', () => {
    const box1 = Box.create({ width: 10, height: 10, depth: 10 });
    const box2 = Box.create({ width: 10, height: 10, depth: 10 });
    box2.translate({ x: 5, y: 0, z: 0 });

    const result = Boolean.union(box1, box2);

    // Topological correctness
    expect(result.isManifold()).toBe(true);

    // Volume check (with tolerance for numerical precision)
    const expectedVolume = 1000 + 1000 - 500; // overlap region
    expect(result.volume()).toBeCloseTo(expectedVolume, 1); // ±0.1 tolerance

    // Euler-Poincaré formula: V - E + F = 2 (for manifold solid)
    const { vertices, edges, faces } = result.topology();
    expect(vertices - edges + faces).toBe(2);
  });
});

// Property-based testing for geometry
describe('Extrude', () => {
  fc.assert(
    fc.property(convexPolygon(), fc.float({ min: 0.1, max: 1000 }), (polygon, height) => {
      const solid = Extrude.create(polygon, height);

      // Invariant: volume = base area × height
      const baseArea = polygon.area();
      expect(solid.volume()).toBeCloseTo(baseArea * height, 2);

      // Invariant: result is always a valid solid
      expect(solid.isValid()).toBe(true);
      expect(solid.isManifold()).toBe(true);
    })
  );
});
```

### 12.5 TDD Workflow by Phase

#### Phase 1 TDD Workflow (Foundation)

```
Week 1-2: Document Model & Storage
  1. Write tests for document model schema (T-DOC-001 through T-DOC-006)
  2. Write tests for IndexedDB persistence layer
  3. Write tests for auto-save mechanism
  4. Implement document model → watch tests pass
  5. Write tests for IFC import/export

Week 3-4: 2D Drafting Tools
  1. Write tests for each drawing tool (T-2D-001 through T-2D-005)
  2. Write tests for snapping engine
  3. Write tests for dimension tool
  4. Write tests for layer system
  5. Implement tools → watch tests pass

Week 5-6: 3D Modeling Tools
  1. Write tests for geometry kernel operations (T-3D-001 through T-3D-005)
  2. Write tests for WASM kernel integration
  3. Write tests for BIM element creation (walls, doors, windows)
  4. Write tests for viewport navigation
  5. Implement → watch tests pass

Week 7-8: Offline-First & Sync
  1. Write tests for offline editing (T-OFF-001 through T-OFF-007)
  2. Write tests for CRDT sync engine
  3. Write tests for conflict resolution
  4. Write tests for service worker caching
  5. Implement → watch tests pass

Week 9-10: Collaboration
  1. Write tests for real-time sync (T-COL-001 through T-COL-005)
  2. Write tests for presence system
  3. Write tests for comment system
  4. Implement → watch tests pass

Week 11-12: Polish & Beta
  1. Performance tests
  2. Visual regression tests
  3. Accessibility tests
  4. Bug fixes (each fix starts with a failing test)
```

### 12.6 Test Coverage Requirements

| Module           | Minimum Coverage | Critical Coverage             |
| ---------------- | ---------------- | ----------------------------- |
| Document Model   | 95%              | 100%                          |
| Geometry Kernel  | 90%              | 100% (topological operations) |
| CRDT Sync Engine | 95%              | 100% (conflict resolution)    |
| Storage Layer    | 90%              | 100% (data persistence)       |
| AI Services      | 80%              | 95% (code compliance rules)   |
| UI Components    | 85%              | 90%                           |
| Plugin Runtime   | 95%              | 100% (sandbox enforcement)    |
| Import/Export    | 90%              | 95% (IFC schema compliance)   |

### 12.7 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                                    │
├─────────────────────────────────────────────────────────────────────┤
│  On Every Commit:                                                    │
│    1. Type check (tsc --noEmit)                                      │
│    2. Lint (ESLint + Prettier)                                       │
│    3. Unit tests (Vitest, all packages)                              │
│    4. Geometry kernel tests                                          │
│    5. Rust tests (cargo test, desktop backend)                       │
│    6. Build (Vite production build)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  On Every PR:                                                        │
│    1. All commit checks                                              │
│    2. Integration tests                                              │
│    3. E2E tests (critical paths, browser + desktop)                  │
│    4. Visual regression tests                                        │
│    5. Accessibility tests                                            │
│    6. Performance benchmarks (compare to main)                       │
│    7. Desktop build smoke test (Tauri build, launch, verify)         │
├─────────────────────────────────────────────────────────────────────┤
│  Nightly:                                                            │
│    1. Full E2E suite (all scenarios, browser + desktop)              │
│    2. Property-based tests (extended iterations)                     │
│    3. Performance benchmarks (detailed report)                       │
│    4. Dependency audit (security vulnerabilities, JS + Rust)         │
│    5. WASM kernel stress tests                                       │
│    6. Desktop cross-platform build (macOS, Windows, Linux)           │
├─────────────────────────────────────────────────────────────────────┤
│  On Release:                                                         │
│    1. All nightly checks                                             │
│    2. Cross-browser testing (Chrome, Firefox, Safari, Edge)          │
│    3. Cross-platform desktop testing (macOS, Windows, Linux)         │
│    4. IFC validation suite (buildingSMART certification)             │
│    5. Load testing (100 concurrent users per project)                │
│    6. Desktop code signing + notarization verification               │
│    7. Auto-update end-to-end test                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 14. Phased Roadmap

### Phase 1: Foundation (Months 1–3)

**Goal:** A usable 2D/3D drafting tool with offline support and basic BIM (browser + desktop)

| Milestone                     | Deliverables                                                 | Duration    |
| ----------------------------- | ------------------------------------------------------------ | ----------- |
| **M1: Document Model**        | CRDT document, IndexedDB storage, auto-save, project browser | Weeks 1–2   |
| **M2: 2D Drafting**           | Line, rectangle, circle, dimension, text, layers, snapping   | Weeks 3–4   |
| **M3: 3D Kernel**             | WASM geometry kernel integration, extrude, boolean, viewport | Weeks 5–6   |
| **M4: BIM Elements**          | Wall, slab, door, window, roof tools, IFC import/export      | Weeks 7–8   |
| **M5: Offline & Sync**        | Service worker, CRDT sync, conflict resolution, PWA install  | Weeks 9–10  |
| **M6: Desktop Shell (Alpha)** | Tauri v2 shell, shared codebase, native file open/save       | Weeks 9–10  |
| **M7: Beta Release**          | Polish, performance, bug fixes, documentation, desktop beta  | Weeks 11–12 |

**Phase 1 Success Criteria:**

- [ ] An architect can draft a simple house plan (2D + 3D) and export IFC
- [ ] Works fully offline with automatic sync (browser + desktop)
- [ ] Two users can collaborate in real-time
- [ ] 60fps interaction on typical hardware
- [ ] Desktop app launches and opens .opencad files via double-click
- [ ] All tests passing, >90% coverage on critical modules

### Phase 2: BIM Depth + AI (Months 4–6)

**Goal:** Professional BIM features with AI assistance (browser + desktop parity)

| Milestone                 | Deliverables                                                     | Duration    |
| ------------------------- | ---------------------------------------------------------------- | ----------- |
| **M8: Advanced BIM**      | MEP, structural, property sets, schedules, levels                | Weeks 13–14 |
| **M9: AI Design Gen**     | Prompt-to-project, AI modification, JSON design briefs           | Weeks 15–16 |
| **M10: AI Code Check**    | Building code compliance engine, RAG pipeline, violation reports | Weeks 17–18 |
| **M11: Documentation**    | Sheets, views, tags, annotations, PDF export                     | Weeks 19–20 |
| **M12: Rendering**        | PBR materials, shadows, sun study, render export                 | Weeks 21–22 |
| **M13: Plugin SDK**       | Plugin runtime, API, marketplace, first-party plugins            | Weeks 23–24 |
| **M14: Desktop Local AI** | Bundled Ollama, GPU acceleration, offline AI inference           | Weeks 23–24 |

**Phase 2 Success Criteria:**

- [ ] AI can generate a compliant floor plan from a natural language prompt
- [ ] Code compliance checker identifies all violations in test models
- [ ] Construction document set exportable as PDF
- [ ] Plugin marketplace with 10+ community plugins
- [ ] Desktop local AI works offline with GPU acceleration
- [ ] Mid-size firm pilot (50 users) successful

### Phase 3: Enterprise & Scale (Months 7–9)

**Goal:** Enterprise-ready with advanced features (browser + desktop + distribution)

| Milestone                 | Deliverables                                                    | Duration    |
| ------------------------- | --------------------------------------------------------------- | ----------- |
| **M15: Enterprise Auth**  | SSO (SAML/OIDC), RBAC, audit logs                               | Weeks 25–26 |
| **M16: Advanced AI**      | Cost estimation, energy analysis, auto-documentation            | Weeks 27–28 |
| **M17: Collaboration+**   | Design branches, review workflows, BCF integration              | Weeks 29–30 |
| **M18: Performance**      | Large model optimization, LOD, streaming, WebGPU compute        | Weeks 31–32 |
| **M19: Interoperability** | DWG export, SKP import, RVT import, GIS integration             | Weeks 33–34 |
| **M20: GA Release**       | Security audit, buildingSMART certification, desktop GA, launch | Weeks 35–36 |

**Phase 3 Success Criteria:**

- [ ] 1,000+ active users across 50+ firms
- [ ] buildingSMART IFC certification
- [ ] Handles models with 1M+ elements at 60fps
- [ ] Desktop app GA on macOS, Windows, Linux with auto-update
- [ ] Revenue: $50K MRR
- [ ] NPS score > 50

### Phase 4: Ecosystem (Months 10–12)

| Milestone                   | Deliverables                                          | Duration    |
| --------------------------- | ----------------------------------------------------- | ----------- |
| **M19: AI Local Models**    | Fine-tuned models, offline AI, firm-specific training | Weeks 37–38 |
| **M20: Advanced MEP**       | Full MEP modeling, clash detection, coordination      | Weeks 39–40 |
| **M21: API & Integrations** | REST API, webhooks, Zapier, firm system integrations  | Weeks 41–42 |
| **M22: Mobile**             | Tablet-optimized UI, Apple Pencil/stylus support      | Weeks 43–44 |
| **M23: Marketplace**        | Paid plugins, templates, material marketplace         | Weeks 45–46 |
| **M24: Year 1 Review**      | Retrospective, Year 2 planning, community summit      | Weeks 47–48 |

---

## 15. Technical Stack Decisions

### 15.1 Frontend

| Layer                | Technology                 | Rationale                                        |
| -------------------- | -------------------------- | ------------------------------------------------ |
| **Framework**        | React 19 + TypeScript      | Ecosystem, type safety, plugin compatibility     |
| **Build Tool**       | Vite 6                     | Fast HMR, WASM support, optimized builds         |
| **State Management** | Zustand + Yjs              | Lightweight, CRDT-native for collaborative state |
| **UI Components**    | Radix UI + Tailwind CSS    | Accessible, customizable, small bundle           |
| **3D Rendering**     | Three.js (WebGPU renderer) | Mature, WebGPU support, large ecosystem          |
| **2D Rendering**     | Canvas 2D + WebGL fallback | Performant 2D drafting                           |
| **Monorepo**         | Turborepo + pnpm           | Fast builds, shared packages                     |

### 15.2 Geometry & WASM

| Layer                 | Technology                        | Rationale                                       |
| --------------------- | --------------------------------- | ----------------------------------------------- |
| **Geometry Kernel**   | OpenCASCADE (WASM via Emscripten) | Proven, open-source, BREP/NURBS support         |
| **WASM Bridge**       | wasm-bindgen + Emscripten         | Mature toolchain, TypeScript bindings           |
| **Custom Extensions** | Rust (compiled to WASM)           | Performance-critical operations, modern tooling |
| **Spatial Index**     | Custom BVH (Rust/WASM)            | Efficient collision/clash detection             |

### 15.3 Storage & Sync

| Layer                      | Technology                        | Rationale                               |
| -------------------------- | --------------------------------- | --------------------------------------- |
| **Local DB (Browser)**     | IndexedDB (via `idb` library)     | Browser-native, large quota, ACID       |
| **Local DB (Desktop)**     | SQLite (via `rusqlite`)           | No quota limits, native performance     |
| **File Storage (Browser)** | Origin Private File System (OPFS) | Large files, WASM-compatible            |
| **File Storage (Desktop)** | Native file system                | Unlimited, direct access                |
| **CRDT**                   | Yjs (custom BIM extensions)       | Mature, performant, excellent ecosystem |
| **Sync Protocol**          | WebSocket + HTTP fallback         | Real-time when online, HTTP when not    |
| **Service Worker**         | Workbox                           | Caching, background sync, offline       |

### 15.4 Backend

| Layer              | Technology                            | Rationale                                     |
| ------------------ | ------------------------------------- | --------------------------------------------- |
| **API Framework**  | Go (Gin) or Rust (Axum)               | Performance, concurrency, type safety         |
| **Database**       | PostgreSQL 16                         | Relational integrity, JSONB, full-text search |
| **Cache**          | Redis 7                               | Sessions, presence, real-time data            |
| **Object Storage** | S3-compatible (MinIO self-hosted)     | Project files, assets, backups                |
| **WebSocket**      | Gorilla WebSocket (Go) / Tokio (Rust) | Real-time sync, presence                      |
| **Auth**           | OAuth2 + OIDC (Keycloak self-hosted)  | SSO, enterprise auth                          |

### 15.5 AI Infrastructure

| Layer               | Technology                                 | Rationale                                        |
| ------------------- | ------------------------------------------ | ------------------------------------------------ |
| **LLM Router**      | Custom (OpenAI, Anthropic, Google)         | Cost optimization, fallback, best model per task |
| **Local AI**        | Ollama (Llama 3.1, Mistral)                | Offline capability, privacy                      |
| **Vector DB**       | Qdrant or Weaviate                         | Code embeddings, design pattern search           |
| **RAG Framework**   | LangChain or custom                        | Building code retrieval, context injection       |
| **Fine-Tuning**     | OpenAI fine-tuning / LoRA                  | Floor plan generation, code compliance           |
| **Embedding Model** | text-embedding-3-small + local alternative | Code/document embeddings                         |

### 15.6 Testing & Quality

| Tool                | Purpose                                     |
| ------------------- | ------------------------------------------- |
| **Vitest**          | Unit and integration tests                  |
| **Playwright**      | E2E, visual regression, accessibility tests |
| **fast-check**      | Property-based testing                      |
| **Testing Library** | Component testing                           |
| **MSW**             | API mocking                                 |
| **Percy**           | Visual regression (cloud)                   |
| **axe-core**        | Accessibility testing                       |
| **k6**              | Load testing                                |

### 15.7 Interoperability Libraries

| Format               | Library                  | License            | WASM? | Notes                               |
| -------------------- | ------------------------ | ------------------ | ----- | ----------------------------------- |
| **IFC**              | web-ifc                  | MPL-2.0            | ✅    | Primary IFC parser, native speeds   |
| **IFC (alt)**        | IfcOpenShell             | LGPL               | ✅    | Fallback, more complete IFC support |
| **DWG**              | LibreDWG                 | GPL-3.0            | ✅    | Open-source DWG read/write          |
| **DWG (commercial)** | ODA Teigha               | Commercial         | ❌    | Full DWG compatibility (licensed)   |
| **DXF**              | dxflib                   | GPL                | ✅    | DXF read/write, used by LibreCAD    |
| **DXF (alt)**        | dxf-parser               | MIT                | ✅    | JavaScript DXF parser               |
| **PLN/PLA**          | libpln (custom)          | Reverse-engineered | ✅    | Archicad project parser (WASM)      |
| **RVT**              | Revit API (server)       | Autodesk EULA      | ❌    | Server-side conversion only         |
| **RVT (alt)**        | RevitFileReader (custom) | Reverse-engineered | ✅    | Limited to older RVT versions       |
| **SKP**              | libskp / OpenSketchUp    | Various            | ✅    | SketchUp import/export              |
| **STEP**             | OpenCASCADE (OCCT)       | LGPL               | ✅    | Native STEP support in kernel       |
| **glTF**             | Three.js GLTFLoader      | MIT                | ✅    | Built into Three.js                 |
| **OBJ/STL**          | Three.js loaders         | MIT                | ✅    | Built into Three.js                 |
| **PDF**              | PDF.js + custom          | Apache-2.0         | ✅    | PDF underlay + export               |
| **Point Cloud**      | Potree / LASzip          | Various            | ✅    | LiDAR/point cloud rendering         |
| **FBX**              | FBX SDK (Autodesk)       | Free (proprietary) | ✅    | Autodesk interchange                |
| **DGN**              | libdgn / ODA             | Various            | ✅    | Bentley/MicroStation format         |

### 15.8 Desktop (Tauri v2)

| Layer                 | Technology                                                | Rationale                                                   |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **Desktop Framework** | Tauri v2                                                  | Small binaries (10–30MB), Rust backend, mobile future-proof |
| **WebView (macOS)**   | WebKit (Safari)                                           | System-provided, no bundling                                |
| **WebView (Windows)** | WebView2 (Edge/Chromium)                                  | Auto-installed with Windows 10+                             |
| **WebView (Linux)**   | WebKitGTK                                                 | Standard on most distros                                    |
| **Rust IPC**          | tauri::command + serde                                    | Type-safe, async, capability-gated                          |
| **Local AI**          | Ollama (bundled or system)                                | CUDA/Metal/Vulkan GPU acceleration                          |
| **Native Storage**    | SQLite (rusqlite)                                         | No browser quota, ACID, fast                                |
| **Auto-Update**       | Tauri updater                                             | Signature-verified, background download                     |
| **Code Signing**      | Apple Notarization, EV Cert (Windows)                     | Required for clean install UX                               |
| **Packaging**         | DMG (macOS), NSIS/MSI (Windows), DEB/RPM/AppImage (Linux) | Platform-native installers                                  |

---

## 16. Non-Functional Requirements

### 16.1 Performance

| Metric                       | Browser Target                            | Desktop Target                         | Measurement             |
| ---------------------------- | ----------------------------------------- | -------------------------------------- | ----------------------- |
| **App Load Time**            | < 3s (cold), < 1s (warm)                  | < 1.5s (cold), < 0.5s (warm)           | Lighthouse / Tauri perf |
| **Document Open**            | < 2s for typical project (500 elements)   | < 1s for typical project               | Synthetic + RUM         |
| **Input Latency**            | < 100ms (drawing, navigation)             | < 50ms (drawing, navigation)           | Performance API         |
| **Frame Rate**               | 60fps (2D), 60fps (3D < 10K faces)        | 60fps (2D), 60fps (3D < 10K faces)     | FPS counter             |
| **Large Model**              | 30fps at 100K faces (with LOD)            | 60fps at 100K faces (native GPU)       | Benchmark suite         |
| **Sync Latency**             | < 200ms for remote edit propagation       | < 200ms for remote edit propagation    | WebSocket ping          |
| **Auto-Save**                | < 2s from edit to persistence (IndexedDB) | < 1s from edit to persistence (SQLite) | Write time              |
| **WASM Operations**          | < 50ms for boolean on typical geometry    | < 50ms for boolean on typical geometry | Geometry benchmarks     |
| **IFC Import (500MB)**       | < 30s                                     | < 15s (native I/O + streaming)         | Import benchmark        |
| **Batch Export (5 formats)** | < 50s (sequential)                        | < 15s (parallel, multi-threaded)       | Export benchmark        |

### 16.2 Scalability

| Metric                           | Target                               |
| -------------------------------- | ------------------------------------ |
| **Concurrent Users per Project** | 50 (real-time), 100 (async)          |
| **Project Size**                 | 1M+ elements with LOD                |
| **File Import**                  | 500MB IFC files                      |
| **Server Throughput**            | 10K WebSocket connections per node   |
| **Storage**                      | 10GB per project (including history) |

### 16.3 Security

| Requirement                  | Implementation                                       |
| ---------------------------- | ---------------------------------------------------- |
| **Data Encryption**          | AES-256 at rest, TLS 1.3 in transit                  |
| **Authentication**           | OAuth2 + OIDC, MFA support                           |
| **Authorization**            | RBAC, project-level permissions                      |
| **Audit Logging**            | All mutations logged with user, timestamp, operation |
| **Plugin Sandboxing**        | Web Worker + iframe, permission system               |
| **Data Privacy**             | GDPR compliant, data export/deletion                 |
| **Vulnerability Management** | Automated dependency scanning, quarterly pen tests   |

### 16.4 Accessibility

| Requirement             | Standard                                    |
| ----------------------- | ------------------------------------------- |
| **WCAG Compliance**     | WCAG 2.1 AA                                 |
| **Keyboard Navigation** | Full keyboard accessibility                 |
| **Screen Reader**       | ARIA labels, semantic HTML                  |
| **Color Contrast**      | 4.5:1 minimum ratio                         |
| **Focus Management**    | Visible focus indicators, logical tab order |

### 16.5 Browser Support

| Browser             | Support Level                |
| ------------------- | ---------------------------- |
| Chrome 120+         | Full (WebGPU)                |
| Firefox 125+        | Full (WebGPU)                |
| Safari 17.4+        | Full (WebGPU)                |
| Edge 120+           | Full (WebGPU)                |
| Mobile Safari 17.4+ | Supported (reduced features) |
| Mobile Chrome 120+  | Supported (reduced features) |

### 16.6 Desktop Platform Support

| Platform       | Minimum Version | Architecture          | Support Level                   |
| -------------- | --------------- | --------------------- | ------------------------------- |
| **macOS**      | 13.0 (Ventura)  | Apple Silicon (arm64) | Full                            |
| **macOS**      | 13.0 (Ventura)  | Intel (x86_64)        | Full (deprecated after 2 years) |
| **Windows**    | 10 (22H2+)      | x86_64, arm64         | Full (WebView2 auto-installed)  |
| **Windows**    | 11              | x86_64, arm64         | Full                            |
| **Ubuntu**     | 22.04 LTS+      | x86_64                | Full (WebKitGTK via APT)        |
| **Debian**     | 12+             | x86_64                | Full (WebKitGTK via APT)        |
| **Fedora**     | 38+             | x86_64                | Full (WebKitGTK via DNF)        |
| **Arch Linux** | Rolling         | x86_64                | Community (AUR)                 |

---

## 17. Risks & Mitigations

### 17.1 Technical Risks

| Risk                                 | Probability | Impact | Mitigation                                                              |
| ------------------------------------ | ----------- | ------ | ----------------------------------------------------------------------- |
| **WASM geometry kernel too slow**    | Medium      | High   | Profile early; have Rust custom kernel as fallback; use Web Workers     |
| **WebGPU browser adoption slow**     | Low         | Medium | WebGL 2.0 fallback path; monitor adoption metrics                       |
| **CRDT merge conflicts in BIM data** | Medium      | High   | Extensive testing; semantic conflict detection; manual resolution UI    |
| **AI generates invalid designs**     | High        | High   | Validation layer between AI output and model; code compliance checker   |
| **IndexedDB quota exceeded**         | Medium      | Medium | LRU eviction, user notifications, OPFS for large assets                 |
| **IFC import/export compatibility**  | Medium      | High   | Test against buildingSMART validation suite; use web-ifc proven library |
| **Local AI models too large**        | Medium      | Low    | Quantized models (4-bit), selective download, cloud fallback            |
| **Tauri WebView inconsistency**      | Medium      | Medium | Test across all WebView engines; use progressive enhancement            |
| **Desktop code signing complexity**  | Medium      | Medium | Early setup of EV cert + Apple notarization; automate in CI             |
| **Shared codebase drift**            | Medium      | High   | Strict package boundaries; CI builds both targets on every PR           |
| **Desktop auto-update failures**     | Low         | High   | Signature verification, rollback on failure, manual update fallback     |

### 17.2 Product Risks

| Risk                                     | Probability | Impact | Mitigation                                                                             |
| ---------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------- |
| **Feature gap vs. Archicad too large**   | High        | High   | Focus on 80% use cases; plugin ecosystem for niche features                            |
| **Architects don't trust browser tools** | Medium      | High   | Desktop app provides native experience; performance benchmarks; professional marketing |
| **Figma enters AEC space**               | Low         | High   | First-mover advantage, domain expertise, open-source community                         |
| **Autodesk/Graphisoft price drop**       | Low         | Medium | Our cost structure is fundamentally lower (browser-native)                             |
| **Plugin ecosystem doesn't develop**     | Medium      | Medium | First-party plugins, developer incentives, SDK quality                                 |
| **Users confused by browser vs desktop** | Medium      | Medium | Clear guidance on when to use each; seamless sync between them                         |

### 17.3 Business Risks

| Risk                                    | Probability | Impact | Mitigation                                                   |
| --------------------------------------- | ----------- | ------ | ------------------------------------------------------------ |
| **Revenue too low for sustainability**  | Medium      | High   | Diversified revenue (subscriptions, marketplace, enterprise) |
| **Open-source fork competes**           | Low         | Medium | Strong community, hosted services advantage, trademark       |
| **Regulatory changes (building codes)** | Medium      | Low    | Modular code database, easy updates, community contributions |
| **Key talent loss**                     | Low         | High   | Documentation, open-source transparency, team depth          |

---

## 18. Success Metrics

### 18.1 Product Metrics (Phase 1)

| Metric                               | Target                | Measurement            |
| ------------------------------------ | --------------------- | ---------------------- |
| **Test Coverage (critical modules)** | > 95%                 | CI coverage reports    |
| **All tests passing**                | 100%                  | CI status              |
| **App load time (cold)**             | < 3s                  | Lighthouse             |
| **60fps interaction**                | 95% of interactions   | Performance monitoring |
| **Offline functionality**            | 100% of core features | E2E test suite         |
| **Sync success rate**                | > 99.5%               | Server metrics         |
| **IFC import success rate**          | > 95% of test files   | Validation suite       |

### 18.2 Business Metrics (Year 1)

| Metric                     | Target       | Measurement    |
| -------------------------- | ------------ | -------------- |
| **Active Users**           | 5,000+ MAU   | Analytics      |
| **Paying Customers**       | 1,000+       | Billing system |
| **MRR**                    | $50,000+     | Billing system |
| **NPS Score**              | > 50         | Survey         |
| **Plugin Marketplace**     | 50+ plugins  | Marketplace    |
| **GitHub Stars**           | 5,000+       | GitHub         |
| **Community Contributors** | 100+         | GitHub         |
| **Customer Churn**         | < 5% monthly | Billing system |

### 18.3 Technical Metrics (Year 1)

| Metric                    | Target          | Measurement      |
| ------------------------- | --------------- | ---------------- |
| **Uptime**                | 99.9%           | Monitoring       |
| **P95 Sync Latency**      | < 500ms         | Server metrics   |
| **P99 API Response**      | < 200ms         | API monitoring   |
| **Security Incidents**    | 0               | Security team    |
| **Critical Bugs**         | < 5 per quarter | Issue tracker    |
| **Mean Time to Recovery** | < 1 hour        | Incident reports |

---

## 19. Glossary

| Term                   | Definition                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **BIM**                | Building Information Modeling — intelligent 3D model-based process                    |
| **IFC**                | Industry Foundation Classes — open BIM data format (ISO 16739)                        |
| **WASM / WebAssembly** | Binary instruction format for near-native performance in browsers                     |
| **WebGPU**             | Next-generation browser graphics API (successor to WebGL)                             |
| **CRDT**               | Conflict-free Replicated Data Type — data structure for automatic conflict resolution |
| **Yjs**                | Mature CRDT library for real-time collaboration                                       |
| **PWA**                | Progressive Web App — web app with native-like capabilities                           |
| **IndexedDB**          | Browser-based NoSQL database for structured data                                      |
| **OPFS**               | Origin Private File System — browser file storage API                                 |
| **RAG**                | Retrieval-Augmented Generation — LLM pattern using external knowledge                 |
| **BREP**               | Boundary Representation — 3D geometry representation                                  |
| **NURBS**              | Non-Uniform Rational B-Splines — mathematical curve/surface representation            |
| **OPEN BIM**           | Open BIM workflow using IFC and BCF standards                                         |
| **BCF**                | BIM Collaboration Format — issue tracking in BIM workflows                            |
| **MEP**                | Mechanical, Electrical, Plumbing — building systems                                   |
| ** LOD**               | Level of Detail — rendering optimization technique                                    |
| **PBR**                | Physically Based Rendering — realistic material rendering                             |
| **RVT**                | Revit file format (proprietary, Autodesk)                                             |
| **DWG**                | AutoCAD drawing format (proprietary, Autodesk)                                        |
| **SKP**                | SketchUp file format (proprietary, Trimble)                                           |
| **PLN**                | Archicad project file (proprietary, Graphisoft)                                       |
| **PLA**                | Archicad project archive (bundled PLN + dependencies)                                 |
| **BPN**                | Archicad backup package                                                               |
| **DXF**                | Drawing Exchange Format — AutoCAD interchange format                                  |
| **DGN**                | MicroStation design format (Bentley Systems)                                          |
| **STEP**               | Standard for Exchange of Product data — ISO 10303, manufacturing                      |
| **STL**                | Stereolithography — 3D printing mesh format                                           |
| **OBJ**                | Wavefront OBJ — 3D geometry + materials                                               |
| **FBX**                | Filmbox — Autodesk 3D interchange with animation                                      |
| **glTF**               | GL Transmission Format — Khronos web-optimized 3D                                     |
| **DWF**                | Design Web Format — Autodesk lightweight visualization                                |
| **E57**                | ASTM point cloud data exchange standard                                               |
| **LAS/LAZ**            | LiDAR point cloud format (ASPRS)                                                      |
| **COBie**              | Construction Operations Building information exchange                                 |
| **BCF**                | BIM Collaboration Format — issue tracking in BIM                                      |
| **GDL**                | Geometric Description Language — Archicad object scripting                            |
| **ODA**                | Open Design Alliance — consortium for CAD format compatibility                        |
| **Teigha**             | ODA's SDK for DWG/DGN/RVT file format support                                         |
| **LibreDWG**           | Open-source DWG library (LGPL), alternative to Teigha                                 |
| **dxflib**             | Open-source DXF library (GPL), used by QCAD/LibreCAD                                  |
| **IBC**                | International Building Code — widely adopted building code                            |
| **ADA**                | Americans with Disabilities Act — accessibility standards                             |
| **MRR**                | Monthly Recurring Revenue                                                             |
| **NPS**                | Net Promoter Score                                                                    |

---

## Appendix A: Complete Test Index

### Document & Storage Tests

| ID        | Test                                                       | Priority |
| --------- | ---------------------------------------------------------- | -------- |
| T-DOC-001 | Create project → verify document model initialized         | P0       |
| T-DOC-002 | Auto-save → verify data persisted within 2s                | P0       |
| T-DOC-003 | Offline edit → verify sync completes on reconnect          | P0       |
| T-DOC-004 | Import IFC → verify model renders with correct hierarchy   | P0       |
| T-DOC-005 | Export IFC → verify exported file validates against schema | P0       |
| T-DOC-006 | Version history → restore previous version → verify state  | P1       |

### 2D Drafting Tests

| ID       | Test                                                        | Priority |
| -------- | ----------------------------------------------------------- | -------- |
| T-2D-001 | Draw line → verify geometry stored with correct coordinates | P0       |
| T-2D-002 | Snap to endpoint → verify cursor snaps within 5px tolerance | P0       |
| T-2D-003 | Dimension → verify updates dynamically with geometry        | P0       |
| T-2D-004 | Layer visibility → toggle off → verify elements hidden      | P0       |
| T-2D-005 | Undo/redo → 20 actions → undo 10 → redo 5 → verify state    | P0       |

### 3D Modeling Tests

| ID       | Test                                                      | Priority |
| -------- | --------------------------------------------------------- | -------- |
| T-3D-001 | Extrude → verify solid volume = area × height (±0.1%)     | P0       |
| T-3D-002 | Boolean → verify resulting topology is manifold           | P0       |
| T-3D-003 | Wall → verify IFC export contains IfcWall with properties | P0       |
| T-3D-004 | Door insertion → verify wall opening + door placement     | P0       |
| T-3D-005 | Orbit/pan/zoom → verify camera transforms, no gimbal lock | P0       |

### AI Tests

| ID       | Test                                                               | Priority |
| -------- | ------------------------------------------------------------------ | -------- |
| T-AI-001 | Prompt → JSON → verify all rooms exist in output                   | P0       |
| T-AI-002 | Generated plan → verify area within ±5% of requested               | P0       |
| T-AI-003 | Generated plan → verify minimum room dimensions meet IBC           | P0       |
| T-AI-004 | Generated plan → verify circulation paths valid                    | P0       |
| T-AI-005 | Iteration → modify prompt → verify only requested changes          | P0       |
| T-AI-010 | Modification → verify only specified elements changed              | P0       |
| T-AI-011 | Modification → verify model remains valid                          | P0       |
| T-AI-012 | Modification → verify undo restores previous state                 | P0       |
| T-AI-020 | Code check → verify all violations identified (no false negatives) | P0       |
| T-AI-021 | Code check → verify no false positives on compliant model          | P0       |
| T-AI-022 | Violation → verify correct code section cited                      | P0       |
| T-AI-023 | Suggested fix → verify fix resolves violation                      | P0       |
| T-AI-024 | Offline → verify core rule engine runs without internet            | P0       |

### Offline Tests

| ID        | Test                                                 | Priority |
| --------- | ---------------------------------------------------- | -------- |
| T-OFF-001 | Install PWA → go offline → verify full functionality | P0       |
| T-OFF-002 | Offline edit → verify saved to IndexedDB             | P0       |
| T-OFF-003 | Go online → verify sync completes within 10s         | P0       |
| T-OFF-004 | Simultaneous offline edits → verify CRDT merge       | P0       |
| T-OFF-005 | Storage quota → verify user notified at 80%          | P1       |
| T-OFF-006 | Offline code compliance → verify rule engine runs    | P0       |
| T-OFF-007 | App update offline → verify update queued for online | P1       |

### Collaboration Tests

| ID        | Test                                                    | Priority |
| --------- | ------------------------------------------------------- | -------- |
| T-COL-001 | Two users edit same element → verify CRDT resolves      | P0       |
| T-COL-002 | Two users edit different elements → verify both appear  | P0       |
| T-COL-003 | Offline edit + concurrent online edit → verify merge    | P0       |
| T-COL-004 | 10 concurrent users → verify latency < 200ms            | P0       |
| T-COL-005 | Comment on element → verify persists after modification | P1       |

### Plugin Tests

| ID        | Test                                               | Priority |
| --------- | -------------------------------------------------- | -------- |
| T-PLG-001 | Install plugin → verify sandboxed execution        | P0       |
| T-PLG-002 | Plugin creates wall → verify appears in document   | P0       |
| T-PLG-003 | Plugin requests network → verify permission prompt | P0       |
| T-PLG-004 | Malicious plugin → verify forbidden APIs blocked   | P0       |
| T-PLG-005 | Plugin UI → verify no interference with main app   | P1       |

### Interoperability Tests

| ID        | Test                                                             | Priority |
| --------- | ---------------------------------------------------------------- | -------- |
| T-IFC-001 | Import IFC 2x3 → verify all Ifc entities mapped                  | P0       |
| T-IFC-002 | Import IFC 4 → verify NURBS/CSG geometry preserved               | P0       |
| T-IFC-003 | Export IFC 2x3 → validate against buildingSMART cert             | P0       |
| T-IFC-004 | Export IFC 4 → validate against buildingSMART cert               | P0       |
| T-IFC-005 | Round-trip IFC → verify geometry identical (±0.1mm)              | P0       |
| T-IFC-006 | Import IFC with Psets → verify all accessible in UI              | P0       |
| T-IFC-007 | Import large IFC (500MB) → verify loads within 30s               | P1       |
| T-AC-001  | Import .pln (Archicad 27) → verify 3D geometry renders           | P0       |
| T-AC-002  | Import .pln → verify layers/stories mapped correctly             | P0       |
| T-AC-003  | Import .pln → verify IFC data preserved                          | P0       |
| T-AC-004  | Import .pla → verify all linked assets included                  | P0       |
| T-AC-005  | Import .pln → verify 2D drawings on layouts preserved            | P1       |
| T-AC-006  | Import .pln → generate import report with fidelity rating        | P0       |
| T-AC-007  | Import GDL objects → verify approximated with warning            | P1       |
| T-RVT-001 | Import .rvt (Revit 2024) → verify 3D geometry renders            | P0       |
| T-RVT-002 | Import .rvt → verify categories mapped to OpenCAD types          | P0       |
| T-RVT-003 | Import .rvt → verify parameters preserved as properties          | P0       |
| T-RVT-004 | Import .rvt → verify levels mapped to OpenCAD stories            | P0       |
| T-RVT-005 | Import .rfa (family) → verify as reusable component              | P1       |
| T-RVT-006 | Import .rvt → generate import report with fidelity rating        | P0       |
| T-RVT-007 | Import .rvt with phases → verify phase data preserved            | P1       |
| T-DWG-001 | Import .dwg (AutoCAD 2018+) → verify 2D geometry renders         | P0       |
| T-DWG-002 | Import .dwg → verify 3D solids converted to geometry             | P0       |
| T-DWG-003 | Import .dwg → verify layers mapped to OpenCAD layers             | P0       |
| T-DWG-004 | Import .dwg → verify blocks converted to components              | P0       |
| T-DWG-005 | Export .dwg → verify opens correctly in AutoCAD                  | P0       |
| T-DWG-006 | Import .dxf → verify all entities parsed                         | P0       |
| T-DWG-007 | Export .dxf → verify opens in AutoCAD/LibreCAD                   | P0       |
| T-DWG-008 | Round-trip DWG → verify geometry identical                       | P1       |
| T-SKP-001 | Import .skp (SketchUp 2020+) → verify geometry renders           | P0       |
| T-SKP-002 | Import .skp → verify materials/colors preserved                  | P0       |
| T-SKP-003 | Import .skp → verify components converted                        | P1       |
| T-SKP-004 | Export .skp → verify opens in SketchUp                           | P1       |
| T-PDF-001 | Import PDF as underlay → verify displays in viewport             | P0       |
| T-PDF-002 | Export 2D drawing to PDF → verify vector quality, scale          | P0       |
| T-PDF-003 | Export sheet set to multi-page PDF → verify all views            | P0       |
| T-PDF-004 | Export PDF → verify layers preserved as PDF layers               | P1       |
| T-IO-001  | Import 50MB file → verify completes within 15s                   | P0       |
| T-IO-002  | Import corrupted file → verify graceful error message            | P0       |
| T-IO-003  | Import unsupported format → verify clear error with alternatives | P0       |
| T-IO-004  | Batch import 10 files → verify all processed                     | P1       |
| T-IO-005  | Export while offline → verify exports to local storage           | P0       |
| T-IO-006  | Import → verify no data leaks to server (privacy)                | P0       |

---

## Appendix B: Research Sources

### WASM & Browser CAD

- Figma's C++ WASM rendering engine (3× faster load times)
- OpenCASCADE.js — CAD kernel compiled to WASM via Emscripten
- Cadre — Browser CAD with Rust geometry kernel + React/Three.js
- WebAssembly State of 2026 — Figma, Google, Adobe production usage

### Offline-First Architecture

- IndexedDB + SQLite WASM for browser-based databases
- Service Worker background sync patterns
- CRDT-based conflict resolution (Yjs, Automerge)
- Origin Private File System (OPFS) for large binary assets
- Local-first software movement principles

### BIM & IFC

- web-ifc — JavaScript IFC read/write at native speeds (That Open Company)
- IFC.js — Web-based BIM with Three.js rendering
- BlenderBIM / IfcOpenShell — Open-source BIM tools
- buildingSMART IFC certification process

### File Format Interoperability

- Archicad import/export formats: .pln, .pla, .bpn, IFC, DWG, DXF, SKP
- Revit .rvt format — proprietary, requires Revit API or DB extraction
- LibreDWG — open-source DWG read/write (LGPL), used by LibreCAD
- dxflib — open-source DXF library (GPL), used by QCAD
- ODA Teigha — commercial SDK for DWG/DGN/RVT full compatibility
- libskp / OpenSketchUp — open-source SketchUp file parsing
- buildingSMART IFC validation suite — 200+ test files for certification
- BCF (BIM Collaboration Format) — open standard for issue tracking

### AI in Architecture

- LLM-driven floor plan generation (GPT-4o → JSON → Revit API)
- AI code compliance checking (RAG + rule-based hybrid)
- Generative design: massing, facades, layouts
- Ark Design AI — architectural brief to schematic design
- Greedy wall-seeking algorithm for furniture placement

### Desktop Application (Tauri v2)

- Tauri v2 vs Electron 2026 comparison: 10–30MB vs 150–300MB bundle size
- Tauri v2 architecture: TAO (window creation) + WRY (WebView rendering)
- System WebView usage: WebKit (macOS), WebView2 (Windows), WebKitGTK (Linux)
- Rust backend integration with JS frontend via IPC
- Tauri v2 mobile support (iOS/Android) future-proofing
- Figma desktop app: Electron wrapper, not truly offline-capable (our advantage)
- Code signing: Apple Notarization, Windows EV Certificate requirements
- Tauri capability-based security model (v2)

### Real-Time Collaboration

- Figma: OT → CRDT migration (2019)
- Yjs: mature CRDT library for real-time collaboration
- CRDT vs OT comparison for multi-modal data (text, shapes, layers)
- WebSocket-based presence and sync

---

## Appendix C: Initial Team Structure

| Role                         | Count  | Responsibilities                                                  |
| ---------------------------- | ------ | ----------------------------------------------------------------- |
| **Engineering Lead**         | 1      | Architecture, technical decisions, code reviews                   |
| **Geometry Kernel Engineer** | 2      | WASM kernel, OpenCASCADE, computational geometry                  |
| **Frontend Engineers**       | 3      | React UI, 2D/3D viewport, tool system (shared browser + desktop)  |
| **Desktop Engineer**         | 1      | Tauri v2 shell, Rust backend, native integrations, distribution   |
| **Backend Engineers**        | 2      | Sync service, API, storage, auth                                  |
| **AI/ML Engineer**           | 1      | LLM integration, code compliance, generation, local AI runtime    |
| **QA/Test Engineer**         | 1      | Test infrastructure, E2E, performance testing (browser + desktop) |
| **Designer (UX/UI)**         | 1      | User experience, visual design, design system                     |
| **DevOps**                   | 1      | CI/CD, infrastructure, monitoring, desktop build pipeline         |
| **Total**                    | **13** |                                                                   |

---

## Appendix D: Budget Estimate (Year 1)

| Category                                     | Monthly      | Annual         |
| -------------------------------------------- | ------------ | -------------- |
| **Team (13 people, avg $12K/mo)**            | $156,000     | $1,872,000     |
| **Infrastructure (cloud, AI APIs)**          | $8,000       | $96,000        |
| **Tools & Services**                         | $2,500       | $30,000        |
| **Desktop Distribution (code signing, MSI)** | $1,000       | $12,000        |
| **Legal & Compliance**                       | $3,000       | $36,000        |
| **Marketing & Community**                    | $3,000       | $36,000        |
| **Contingency (15%)**                        | $26,000      | $312,000       |
| **Total**                                    | **$199,500** | **$2,394,000** |

**Funding Strategy:**

- Seed round: $2.5M (18 months runway)
- Revenue target by Month 12: $50K MRR ($600K ARR)
- Path to profitability: 4,000 paying users at $49/mo avg

---

_End of Product Requirements Document_

**Next Steps:**

1. Review and approve PRD with stakeholders
2. Set up monorepo, CI/CD, and test infrastructure
3. Begin Phase 1, Week 1: Document Model tests (T-DOC-001 through T-DOC-006)
4. Weekly progress reviews against this PRD
5. Update PRD as learnings emerge (version-controlled)

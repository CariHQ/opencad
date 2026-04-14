name: Bug Report
description: Report a bug in OpenCAD
title: "[bug] "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug! Before you start:
        - Search [existing issues](https://github.com/CariHQ/opencad/issues) to avoid duplicates
        - Verify the bug exists on the latest version
        - For security vulnerabilities, see [SECURITY.md](https://github.com/CariHQ/opencad/blob/main/SECURITY.md)

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Which part of OpenCAD is affected?
      options:
        - Browser App
        - Desktop App
        - Geometry Kernel (WASM)
        - CRDT / Sync Engine
        - AI Features
        - Import/Export
        - Plugin System
        - Documentation
        - Other
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: Version
      description: What version of OpenCAD are you using?
      placeholder: "e.g., 0.3.1, commit abc1234"
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Briefly describe the bug
      placeholder: "A clear and concise description of what the bug is."
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: How can we reproduce this bug?
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. Draw '...'
        4. See error
      render: bash
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
      placeholder: "Describe what you expected to happen."
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened?
      placeholder: "Describe what actually happened. Include error messages, console output, or screenshots if applicable."
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this bug?
      options:
        - "Critical: Blocks entire workflow, no workaround"
        - "High: Blocks specific feature, workaround exists"
        - "Medium: Annoying but workable"
        - "Low: Cosmetic or edge case"
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      description: What OS are you using?
      options:
        - macOS (Apple Silicon)
        - macOS (Intel)
        - Windows 10
        - Windows 11
        - Ubuntu/Debian
        - Fedora/RHEL
        - Other Linux
        - Browser only (specify below)
    validations:
      required: true

  - type: dropdown
    id: browser
    attributes:
      label: Browser (if applicable)
      description: What browser are you using?
      options:
        - Chrome
        - Firefox
        - Safari
        - Edge
        - Not applicable (desktop app)

  - type: textarea
    id: environment
    attributes:
      label: Environment Details
      description: Any relevant environment details
      placeholder: |
        - RAM: 16GB
        - GPU: NVIDIA RTX 3070
        - Project size: 500 elements
        - Online/Offline: Online

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any additional context, screenshots, or files
      placeholder: "Add screenshots, screen recordings, or sample files here. IFC/DWG files can be shared via Discord or email."

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched existing issues and this is not a duplicate
          required: true
        - label: I have verified this exists on the latest version
          required: true
        - label: I have included all requested information
          required: true

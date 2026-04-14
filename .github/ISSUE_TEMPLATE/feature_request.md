name: Feature Request
description: Suggest a feature or enhancement for OpenCAD
title: "[feature] "
labels: ["enhancement", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Before you start:
        - Check the [PRD](https://github.com/CariHQ/opencad/blob/main/PRD.md) to see if this is already planned
        - Search [existing issues](https://github.com/CariHQ/opencad/issues) to avoid duplicates
        - Consider if this is core functionality or a plugin

  - type: dropdown
    id: category
    attributes:
      label: Category
      description: What type of feature is this?
      options:
        - Core Modeling (2D/3D tools)
        - BIM Elements (walls, doors, etc.)
        - Import/Export
        - AI Features
        - Collaboration
        - Documentation
        - Plugin System
        - Performance
        - User Experience
        - Developer Experience
        - Other
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this feature solve?
      placeholder: |
        Describe the pain point or use case. For example:
        "As an architect, I need to quickly check if my design meets egress requirements, but currently I have to manually calculate travel distances."
    validations:
      required: true

  - type: textarea
    id: proposal
    attributes:
      label: Proposed Solution
      description: How would you solve this problem?
      placeholder: |
        Describe your proposed solution. Include:
        - How it would work from the user's perspective
        - Any technical approach you have in mind
        - How it fits with existing OpenCAD features
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other solutions have you considered?
      placeholder: |
        Describe any alternative solutions or features you've considered.
        Why is your proposed solution better?

  - type: textarea
    id: impact
    attributes:
      label: Impact
      description: Who would benefit from this feature?
      placeholder: |
        - Who: e.g., "All architects using OpenCAD for residential projects"
        - How many: e.g., "~60% of our target users based on survey data"
        - Frequency: e.g., "Would be used daily during schematic design phase"

  - type: dropdown
    id: complexity
    attributes:
      label: Estimated Complexity
      description: How complex do you think this feature is?
      options:
        - "Small: 1-2 days of work, single component"
        - "Medium: 1-2 weeks, multiple components"
        - "Large: 1-2 months, significant architecture"
        - "Unknown: Needs investigation"

  - type: textarea
    id: examples
    attributes:
      label: Examples / References
      description: Any examples from other tools?
      placeholder: |
        - How does Archicad/Revit/SketchUp handle this?
        - Screenshots or links to similar features
        - Any relevant standards or codes

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have checked the PRD and this is not already planned
          required: true
        - label: I have searched existing issues and this is not a duplicate
          required: true
        - label: I have provided a clear problem statement
          required: true

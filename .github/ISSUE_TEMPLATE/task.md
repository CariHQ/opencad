name: Task / Discussion
description: Start a discussion or propose work that doesn't fit bug/feature templates
title: "[task] "
labels: ["triage"]
body:
  - type: markdown
    attributes:
      value: |
        Use this template for general tasks, discussions, or proposals that don't fit the bug or feature templates.

  - type: dropdown
    id: type
    attributes:
      label: Type
      description: What is this about?
      options:
        - Task (something that needs to be done)
        - Proposal (idea to discuss before formalizing)
        - Question (need help or clarification)
        - Meta (project infrastructure, process, etc.)
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Describe the task, proposal, or question
      placeholder: "Provide as much context as possible."
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Context
      description: Any relevant background information
      placeholder: "Links to discussions, related issues, external references."

  - type: textarea
    id: proposal
    attributes:
      label: Proposed Action (if applicable)
      description: What do you think should be done?
      placeholder: "If this is a task or proposal, what action do you suggest?"

# ONYX / NOVA Phase 1 Architecture

Version: 6.0.0-alpha.3.0

## Objective

Create a reusable intelligence architecture that allows NOVA and ONYX to handle:

- Files
- Documents
- Photos
- Videos
- Email
- Calendar
- Weather
- News
- Applications
- Home Automation
- Smart Devices

without hardcoded UI routing.

---

## Processing Pipeline

User Input
↓
Intent Engine
↓
Policy Evaluation
↓
Action Dispatcher
↓
Module Registry
↓
Module Execution
↓
Result

---

## Core Packages

### contracts

Shared interfaces and type definitions.

### intent-engine

Converts natural language into structured intents.

### action-dispatcher

Executes validated intents.

### module-registry

Registers modules and applications.

---

## Primary Design Rules

1. UI does not contain business logic.
2. Intent parsing is independent of execution.
3. Unknown commands never route to another module.
4. Assistant switching is separate from module selection.
5. Every action produces a structured result.
# Intent Engine

## Purpose

Transform natural language input into structured intents.

---

## Supported Intents

### assistant.switch

Examples:

- Switch to ONYX
- Call NOVA

### module.open

Examples:

- Open Calendar
- Show Weather

### app.launch

Examples:

- Launch YouTube
- Open Spotify

### document.search

Examples:

- Find architecture document
- Search baseline report

### settings.open

Examples:

- Open Settings

### unsupported

Used when no valid intent exists.

---

## Design Rules

The Intent Engine does not:

- Open UI panels
- Launch apps
- Access files
- Call APIs

The Intent Engine only classifies.
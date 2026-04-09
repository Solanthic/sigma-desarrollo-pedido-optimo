---
name: pdf
description: Convert a markdown file to a well-formatted PDF with Mermaid diagram support. Use when the user wants to export, generate, or create a PDF from a markdown document.
allowed-tools: Bash(pdf:*)
---

# Markdown to PDF

Converts markdown files to professional PDFs with full Mermaid diagram rendering, styled tables, code blocks, and clean typography.

## Usage

```bash
# Convert a markdown file (output saves alongside with .pdf extension)
node scripts/md-to-pdf.mjs path/to/file.md

# Specify output path
node scripts/md-to-pdf.mjs path/to/file.md path/to/output.pdf
```

## Prerequisites

If `marked` is not installed, run first:
```bash
npm install
```

## Features

- Renders all Mermaid diagram types (flowchart, stateDiagram, erDiagram, etc.)
- Styled tables with borders and alternating rows
- Code blocks with syntax formatting
- Blockquotes with accent styling
- A4 format with print-friendly margins
- Page break avoidance for tables and diagrams

## When invoked as `/pdf`

1. The user provides a markdown file path as the argument (e.g., `/pdf tasks/2026-04-08-nota-enrique/NOTA_PARA_ENRIQUE.md`)
2. Run `node scripts/md-to-pdf.mjs <path>` to generate the PDF
3. If it fails with a missing module error, run `npm install` first, then retry
4. Report the output file path to the user when done

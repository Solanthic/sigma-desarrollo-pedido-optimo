---
name: ai-fde
description: Orchestrate Palantir AI FDE through browser automation. Use when the user wants to create ontology objects, write transforms, build pipelines, manage code repositories, or perform any Foundry operation that requires AI FDE capabilities beyond what Palantir MCP offers.
---

# AI FDE Orchestration Skill

You are the **meta-orchestrator** for Palantir AI FDE. You handle planning, context management, decision-making, and output evaluation. AI FDE handles execution inside Foundry — creating object types, writing transforms, running builds, managing code repos, and more.

## Architecture

```
Claude Code (you)                    AI FDE (Foundry agent)
├── Plan the task                    ├── Create object types
├── Gather context from repos        ├── Write Python transforms
├── Decompose into subtasks          ├── Build Pipeline Builder pipelines
├── Generate prompts for AI FDE      ├── Manage code repositories
├── Send via Playwright              ├── Run builds and deployments
├── Monitor for approvals            ├── Edit ontology (branched)
├── Evaluate responses               └── Governance and exploration
├── Iterate if needed
└── Report outcomes to user
```

## Prerequisites

- Playwright MCP server configured with Chrome profile that has Foundry passkey auth
- **Chrome must NOT be open** (Playwright and Chrome can't share the same user-data-dir simultaneously — Chrome will lose access to profiles while Playwright holds the lock)
- Foundry session active (passkey auth happens on first navigation)
- **IMPORTANT: Always close the Playwright browser (`mcp__playwright__browser_close`) when done with AI FDE** so Chrome can access its profiles normally again. Never leave Playwright holding the Chrome profile lock.

## Interaction Protocol

### 1. Navigate to AI FDE

```
Use: mcp__playwright__browser_navigate
URL: https://{foundry-host}/workspace/ai-fde
```

If redirected to login, the passkey dialog will appear. Wait for auth to complete — it auto-redirects to AI FDE after passkey approval.

### 2. Send a Prompt

```
1. mcp__playwright__browser_click on the input textbox (ref for "Ask a question or prompt an agent...")
2. mcp__playwright__browser_type with the prompt text
3. mcp__playwright__browser_press_key "Enter"
```

### 3. Monitor for Completion and Approvals

**CRITICAL: Use `mcp__playwright__browser_take_screenshot` for monitoring — NOT `browser_snapshot`.**

The DOM snapshot becomes too large (200K+ chars) as the conversation grows and causes token limit errors. Screenshots are fast, visual, and reliably show:
- Allow/Reject approval dialogs
- "Thinking..." indicators
- "Waiting for tool approval..." messages
- The Send message button (= done)

**Polling loop:**
```
Repeat every 10-15 seconds:
  1. Take a screenshot
  2. Look for:
     - "Allow" / "Reject" buttons → Click Allow immediately
     - "Thinking..." or spinner → Still working, keep polling
     - "Send message" button visible → AI FDE is done
     - "Waiting for tool approval..." → Approval dialog may be off-screen, scroll down and screenshot again
```

**ALWAYS click Allow when you see an approval dialog.** AI FDE uses branching by default, so changes are safe and reviewable. Never make the user click Allow — that's your job.

### 4. Extract the Response

After AI FDE completes (Send message button is visible):

**Option A (preferred): Copy to clipboard**
```
1. Find the last "Copy to clipboard" button in the conversation
2. Click it
3. Read clipboard: Bash command `pbpaste`
```

**Option B: Screenshot**
```
1. Take a screenshot — the response text is visible
2. Read it directly from the image
```

### 5. Multi-Turn Conversations

AI FDE maintains session context. To send follow-ups:
- Just type in the input field and press Enter again
- AI FDE remembers the full conversation
- Use this for corrections, additions, and iterative refinement

### 6. New Sessions

To start a fresh session:
```
1. Click "Open session list" button
2. Click "New session" 
3. Or navigate to: https://{foundry-host}/workspace/ai-fde
```

## Prompt Engineering for AI FDE

### Be specific about:
- **Dataset paths or RIDs** — AI FDE needs exact references
- **Column names** — map source columns to property names explicitly  
- **Which branch to use** — "create on a new branch" or "use the existing branch"
- **Mode** — AI FDE will auto-select, but you can specify: "switch to ontology editing mode" or "use Pipeline Builder mode"

### Language rules:
- **All display names, API names, and descriptions must be in Spanish** (for Sigma Alimentos)
- API names use Spanish camelCase (e.g., codigoSap, nombreTienda, cadenaComercial)
- Object type API names use Spanish PascalCase (e.g., Tienda, Producto)

### Effective patterns:
- Start with exploration: "What object types exist in the X ontology?"
- Then create: "Create an object type called X backed by dataset Y with these property mappings..."
- Then refine: "Update property Z display name to..."
- Request branching: "Create this on a new branch so we can review"

### What AI FDE does well:
- Creating/editing object types with property mappings
- Building Pipeline Builder pipelines (reads dataset → transforms → outputs)
- Searching datasets, object types, functions
- Creating global branches and proposals
- Self-correcting: if something fails (e.g., missing project imports), it diagnoses and fixes

### What to watch for:
- AI FDE may ask clarifying questions — answer them to keep it moving
- Tool approvals block execution — screenshot and click Allow promptly
- Long operations (builds, deployments) can take 1-2 minutes
- Token usage grows fast with many tool calls (~70K tokens for a full session)

## Context Gathering (Before Sending to AI FDE)

Before composing an AI FDE prompt, gather relevant context:

1. **Local repos**: Read CLAUDE.md cross-references, ontology YAMLs, data readiness docs
2. **Foundry docs**: Use `mcp__palantir-mcp__search_foundry_documentation` for platform questions
3. **Web search**: Use WebFetch/WebSearch for external context
4. **Foundry data**: Use `mcp__palantir-mcp__run_sql_query_on_foundry_dataset` to check schemas/data

Synthesize this into a **focused, specific prompt** for AI FDE. Don't dump raw context — give AI FDE exactly what it needs to execute.

## Error Handling

- **Tool approval timeout**: If AI FDE shows "Waiting for tool approval..." and you can't find the Allow button, scroll down and take another screenshot
- **Build failures**: AI FDE usually diagnoses and self-corrects. If it gets stuck, send a follow-up: "The build failed with error X. Can you fix it?"
- **Token limit**: At ~100K tokens the session may degrade. Start a new session for the next task.
- **Auth expired**: Navigate back to AI FDE URL — passkey re-auth will trigger

## Example Session

```
User: /ai-fde Create the Store object type in Foundry backed by SOP_PAC_CAT_TIENDAS

Claude Code:
1. Read ontology/object_types/Store.yaml for the property definitions
2. Look up the dataset RID for SOP_PAC_CAT_TIENDAS
3. Navigate to AI FDE
4. Send prompt: "Create a new object type called Tienda in the Sigma Alimentos ontology. 
   Use dataset ri.foundry.main.dataset.384369ef... as backing. 
   Map: SAP→codigoSap (PK), TIENDA→nombreTienda (title), CADENA→cadenaComercial, 
   CEDI→centroDistribucion, REGION→region, ZONA→zona.
   All display names in Spanish. Create on a new branch."
5. Monitor: screenshot every 15s, click Allow on approvals
6. Extract response when done
7. Verify via MCP: search ontology for the new object type
8. Report to user: "Tienda object type created on branch X with proposal Y"
```

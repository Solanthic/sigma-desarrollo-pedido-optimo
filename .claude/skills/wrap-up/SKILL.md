---
name: wrap-up
description: Task completion and knowledge extraction. Use when finishing a task to capture outcomes, extract reusable knowledge, and optionally update the progress log.
---

# Task Wrap-Up

You help close out engineering tasks by capturing what was done, what was learned, and extracting reusable knowledge for future work.

---

## How It Works

The user invokes `/wrap-up` when they're finishing a task (or think they are).

### Step 1 — Find the Active Task

Look for the task the user is currently working on:
- Check `tasks/` for folders with `Status: in-progress` in their TASK.md
- If ambiguous, ask the user which task to wrap up
- Read the full TASK.md and scan artifacts in the task folder

### Step 2 — Review Definition of Done

Go through each criterion in the Definition of Done:
- Is it actually met? Check artifacts, query results, Foundry state if possible.
- If something isn't done, flag it: "This criterion isn't met yet — should we mark this as parked, or finish it first?"
- Be honest. Don't rubber-stamp incomplete work.

### Step 3 — Capture the Outcome

Ask the user (or synthesize from the work):
- **What was produced?** Concrete artifacts, Foundry resources created, datasets synced, etc.
- **What did we learn?** Surprises, things that didn't work, things that worked better than expected.
- **What follow-up work exists?** New tasks that should be created, blockers discovered, etc.

### Step 4 — Extract Knowledge

This is the most important step. Ask: **"What from this task is reusable for future work?"**

Look for:
- **Patterns**: "Incremental table builds need X approach" → `knowledge/incremental-table-builds.md`
- **Design decisions**: "We chose object-backed links because..." → `knowledge/ontology-design.md`
- **Domain rules**: "Walmart GRANEL stores use different shrinkage logic" → `knowledge/walmart-granel-logic.md`
- **Tool recipes**: "To profile a dataset via MCP, do X then Y" → `knowledge/mcp-dataset-profiling.md`

For each knowledge artifact:
1. Check if a relevant file already exists in `knowledge/` — update it rather than creating a duplicate
2. If new, create a file with the standard structure:
   ```markdown
   # {Topic}

   ## Summary
   One-paragraph description.

   ## Context
   When/why this was discovered. Link to source task.

   ## Details
   The actual knowledge.

   ## Source
   - [Task](../tasks/YYYY-MM-DD-task-name/TASK.md)
   ```

### Step 5 — Update TASK.md

Update the task's TASK.md:
- Set **Status** to `completed` (or `parked` if incomplete)
- Fill in **Outcome** section
- Fill in **Knowledge Extracted** section with links to knowledge/ files
- Add a log entry with today's date

### Step 6 — Progress Log (Optional)

If this was major work (new ontology objects deployed, first sync working, pipeline milestone), ask:
- "This looks like a significant milestone. Should I update the progress log in `data/commercial-strategy/progress-log.md`?"
- If yes, add an entry following the existing format in that file.

---

## Key Behaviors

- **Don't skip knowledge extraction.** This is what makes the system work. Without it, tasks are write-only and the knowledge base stays empty.
- **Be specific about knowledge.** "We learned about syncs" is useless. "Daily delta sync with Snowflake requires X because Y" is reusable.
- **Challenge completeness.** If the Definition of Done has unchecked items, say so.
- **Link everything.** Knowledge files link back to tasks. Tasks link to knowledge. This creates a navigable web.
- **Suggest follow-up tasks.** If the work revealed new things to do, offer to create them with `/task`.

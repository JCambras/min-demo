# Min Platform — Conventions

This file is the single source of truth for how code is written in this project. Follow it exactly. If a pattern isn't here, check existing code for precedent before inventing something new.

## Architecture

```
src/
  lib/            → Shared types, constants, helpers. No React. No side effects.
    custodian.ts  → Multi-custodian config. Single ACTIVE_CUSTODIAN knob.
    sf-connection.ts → OAuth token management, encrypted cookie storage, env fallback.
  components/
    ui/           → shadcn primitives (only Input currently used)
    shared/       → Reusable UI components (ClientForm, RightPane, WhyBubble, etc.)
  app/
    page.tsx      → Home screen + screen router. Thin. No business logic.
    flow/         → Open Accounts workflow
    onboard/      → Onboard New Family workflow
    compliance/   → Compliance Check workflow
    briefing/     → Client Briefing (intelligence layer)
    settings/     → SF connection management
    api/          → Next.js API routes (Salesforce, DocuSign, PDF)
```

## Adding a New Workflow

1. Create `src/app/{workflow-name}/` with two files:
   - `use{Name}State.ts` — useReducer hook with typed state, actions, and all business logic
   - `{Name}Screen.tsx` — Pure rendering component that consumes the hook
2. Add the screen type to `Screen` union in `lib/types.ts`
3. Add a route case in `page.tsx` (one `if` block)
4. Add a tile to `QUICK_ACTIONS` array in `page.tsx`
5. Reuse shared components: `FlowHeader`, `RightPane`, `ProgressSteps`, `ContinueBtn`, `ClientForm`

## State Management

- Every workflow uses `useReducer`. Never raw `useState` chains.
- Every action must be fully typed. Never use `unknown` for action payloads.
- UI-only state (dropdown visibility, SSN toggle) can use local `useState` inside the Screen component — not in the reducer.
- Mutable refs (`useRef`) are only for values that must not trigger re-renders (e.g., Salesforce record IDs used during execution). Never for data that the UI reads.

## Execution Pipelines

Multi-step SF/API executions (like generating paperwork) use the pipeline pattern:

```ts
const steps: { label: string; fn: () => Promise<void> }[] = [
  { label: "Creating household", fn: async () => { ... } },
  { label: "Recording funding", fn: async () => { ... } },
];
for (const [i, step] of steps.entries()) {
  dispatch({ type: "SET_GEN_STEP", step: i + 1 });
  await step.fn();
}
```

Never write sequential imperative blocks. Adding a step = adding one array entry.

## API Routes

- API routes use a handler map, not if/else chains:

```ts
const handlers: Record<string, Handler> = {
  searchContacts: handleSearch,
  confirmIntent: handleConfirmIntent,
};
const handler = handlers[action];
if (!handler) return error(400, "Unknown action");
return handler(data, accessToken, instanceUrl);
```

- All config (URLs, keys, IDs) comes from environment variables. Never hardcode.
- Salesforce queries use `safeQuery()` for input escaping.
- Token functions should cache results with TTL (not implemented yet — do this when adding a new route).

## Shared Components

| Component | Use for |
|---|---|
| `ContinueBtn` | Every primary action button. Always pass `processing` prop during async work. |
| `Choice` | Selection chips. Toggle and multi-select patterns. |
| `ClientForm` | KYC data entry. Used by both flows. |
| `RightPane` | Evidence trail + live plan summary. Pass `mode` prop ("flow" or "onboard"). |
| `FlowHeader` | Back button + progress bar. Every workflow screen uses this. |
| `ProgressSteps` | Animated step list during execution. Pass `steps[]` and `currentStep`. |
| `FieldLabel` | Label above any form input. |
| `SelectField` | Styled native `<select>`. |
| `WhyBubble` | Explainability affordance. Two variants: standard (expandable card) and compact (tooltip). |
| `ClientReviewCard` | Client summary card with DOB formatting and empty-field guards. |

## Custodian Configuration

- All custodian-specific references (names, doc prefixes, ACH labels, form names) come from `lib/custodian.ts`.
- **Never hardcode a custodian name.** Import `custodian` from `lib/custodian.ts` and use its properties.
- To switch custodians: set `NEXT_PUBLIC_CUSTODIAN=fidelity` in `.env.local`, or change `ACTIVE_CUSTODIAN` in `custodian.ts`.
- Available custodians: `schwab`, `fidelity`, `pershing`, `altus`.

## Salesforce Connection

- Token resolution: `getAccessToken()` from `lib/sf-connection.ts` checks OAuth cookie first, falls back to `.env.local`.
- All SF API routes import `getAccessToken` from `sf-connection.ts`, not from inline code.
- OAuth tokens stored in AES-256-GCM encrypted HTTP-only cookies.
- The `callSF()` helper in `lib/salesforce.ts` is the client-side SF API wrapper. All components use it.

## Explainability (Why Layer)

- Every automated decision Min makes should have a `WhyBubble` explaining the reasoning.
- Use `compact` variant for inline labels (tooltip on `?` icon).
- Use standard variant for callout cards (expandable explanation).
- Always include a `regulation` citation when one applies.

## Types

- All shared types live in `lib/types.ts`. One file. API routes import from here.
- Never redefine a type that exists in `types.ts`. If the API route needs `ClientInfo`, import it.
- Remove dead type variants when their usage is removed (e.g., don't leave `"local"` in a union after removing local search).

## Formatting & Validation

- All input formatting (SSN, phone, dollar) lives in `lib/format.ts`.
- All validation lives in `lib/format.ts`.
- Validation is deterministic — no LLM calls, no API calls. Pure functions.

## Error Handling

- Every screen-level component is wrapped in an `<ErrorBoundary>`.
- Every `ContinueBtn` that triggers async work must pass `processing={isProcessing}` to prevent double-clicks.
- API failures surface to the user via error state (e.g., `lastError` in reducer), not just `console.error`.
- `catch` blocks that swallow errors must have a comment explaining why.

## Security

- No secrets in source code. All keys, tokens, and credentials go in `.env.local`.
- SOQL queries escape user input via `safeQuery()`.
- SSN fields use `type="password"` with a visibility toggle.

## Naming

- Files: PascalCase for components (`FlowScreen.tsx`), camelCase for hooks/utils (`useFlowState.ts`, `format.ts`)
- Types: PascalCase (`ClientInfo`, `FlowStep`)
- Constants: SCREAMING_SNAKE for arrays/objects (`INTENT_CHIPS`, `US_STATES`), PascalCase for component-like constants
- Reducer actions: SCREAMING_SNAKE strings (`"SET_STEP"`, `"ADD_ACCOUNT"`, `"RESET"`)

## What Not to Do

- Don't add `useState` to a workflow for anything that another component might need. Use the reducer.
- Don't inline API calls in components. They go in the state hook or a lib helper.
- Don't create wrapper components for single-use styling. Use Tailwind directly.
- Don't add shadcn components unless they're actually imported somewhere. Remove unused ones.
- Don't use magic strings for branching logic. Use typed props or enums.
- Don't copy-paste API call patterns. Extract to a helper and call it from multiple branches.

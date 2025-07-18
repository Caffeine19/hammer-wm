# HammerWM Copilot Instructions

## Project Architecture

This is a Raycast extension that bridges **TypeScript/React** with **Hammerspoon Lua** for macOS space management. The core architecture follows a **bridge pattern** where TypeScript commands execute Lua scripts via AppleScript.

### Key Components

- **Command Layer** (`src/*.ts`): Individual Raycast commands (`create-space.ts`, `remove-current-space.ts`, etc.)
- **Bridge Layer** (`src/utils/call-hammerspoon.ts`): Executes Lua code in Hammerspoon via AppleScript
- **Lua Layer** (`src/lua/space.lua`): Space management logic using Hammerspoon APIs
- **UI Layer** (`src/list-spaces.tsx`): React components for space visualization

### Critical Integration Pattern

All space operations follow this pattern:

```typescript
// 1. Define Lua code with proper escaping
const code = /* lua */ `
  local ok, err = hs.spaces.removeSpace(${spaceId})
  if not ok then
    error("Failed to remove space: " .. tostring(err))
  end
`;

// 2. Execute via AppleScript bridge
const result = await callHammerspoon(code);
```

### Async Operation Handling

**Critical**: Hammerspoon space operations are asynchronous but error handling differs:

- Use `hs.timer.doAfter()` for operations that need delays
- Errors inside `doAfter` callbacks **cannot be caught** by the caller
- For reliable error handling, split operations into separate commands with `radash.sleep()` between them

Example problematic pattern:

```lua
-- DON'T: Errors won't propagate
hs.timer.doAfter(0.1, function()
  local ok, err = hs.spaces.removeSpace(spaceId)
  if not ok then
    error("This won't reach TypeScript") -- Lost!
  end
end)
```

Better pattern:

```typescript
// Split into steps with proper error handling
await switchToPreviousSpace();
await sleep(100); // radash.sleep for delay
await removeSpace(spaceId); // Errors propagate correctly
```

### Space Data Structure

```typescript
interface Space {
  id: string; // Hammerspoon space ID
  name: string; // Mission Control space name
  screenId: string; // Screen UUID
  screenName: string; // Human-readable screen name
  isCurrent: boolean; // Active space indicator
}
```

### UI Conventions

- Use `radash.group()` to group spaces by screen
- Current spaces: Green color (`Color.Green`) with `CheckCircle` icon
- List sections organized by screen name (not UUID)
- Error handling via `tryit()` from radash + `showFailureToast()`

### Development Commands

```bash
pnpm dev          # Start development mode
pnpm build        # Build extension
pnpm lint         # ESLint check
pnpm fix-lint     # Auto-fix linting issues
```

### Common Patterns

1. **Lua Template Literals**: Use `/* lua */` comments for syntax highlighting
2. **Error Propagation**: Always check `ok, err` pattern in Lua operations
3. **String Escaping**: The `callHammerspoon` function handles escaping automatically
4. **Debug Command**: `debug.ts` executes clipboard Lua code - useful for testing

### Screen vs Space Concepts

- **Screen**: Physical/virtual monitor (has UUID and human name)
- **Space**: Virtual desktop on a screen (has ID and optional name)
- Always use `screenName` for UI display, `screenId` for operations

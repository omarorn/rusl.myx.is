# Document Agent Results

**Purpose:** Systematically document completed agent deliverables with consistent format

**Usage:** `/document-agent [agent-id]`

---

## Template

When documenting agent results, follow this structure:

### 1. Retrieve Agent Output

```typescript
TaskOutput("[agent-id]", block=true, timeout=240000)
```

### 2. Count Deliverables

```bash
# Count files created
grep -c "Created:" agent_output.txt

# Count files updated
grep -c "Updated:" agent_output.txt

# Count lines of documentation
wc -l docs/*.md
```

### 3. List Key Files

**Files Created ([N] files):**
1. `path/to/file1.ts` - Brief description (~lines)
2. `path/to/file2.tsx` - Brief description (~lines)
...

**Files Updated ([N] files):**
1. `path/to/file1.ts` - Changes made
2. `path/to/file2.tsx` - Changes made
...

### 4. Document Features

**Key Features Implemented:**
- Feature 1: Brief description
- Feature 2: Brief description
- Feature 3: Brief description
...

### 5. Note Errors/Fixes

**TypeScript Errors Fixed:**
- Error category 1: What was fixed (N files)
- Error category 2: What was fixed (N files)
...

**Dependencies Installed:**
```bash
npm install package1 package2 package3
```

### 6. Create Summary

**Agent Summary:**
```markdown
### [Phase Name] ✅ COMPLETE
**Completed:** [Date]
**Agent:** [agent-id] ([token-count] tokens)
**Time:** [Estimated] hours → [Actual] hours (agent time)

**Implementation:**
- ✅ [Deliverable 1]
- ✅ [Deliverable 2]
- ✅ [Deliverable 3]

**Result:** [Outcome summary, metrics if available]
```

---

## Example Documentation

### Phase 3: Admin User Management UI ✅ COMPLETE
**Completed:** January 8, 2026
**Agent:** a6245e6 (830K tokens)
**Time:** 8 hours estimated → 2 hours (agent execution)

**Files Created (15 files):**
1. `src/types/user.ts` - Type definitions (~200 lines)
2. `src/services/userApi.ts` - API service layer (~280 lines)
3. `src/pages/UserManagement.tsx` - User list & management (~430 lines)
...

**Files Updated (4 files):**
1. `src/main.tsx` - Added Auth0Provider wrapper
2. `src/App.tsx` - Added admin routes
...

**Key Features:**
- Full user CRUD with validation (react-hook-form + zod)
- Fleet assignment (drivers to trucks/routes)
- Container assignment (containers to customers/routes)
- Bulk CSV upload for containers
- AI Assistant with chat interface

**TypeScript Errors Fixed:**
- ConfirmDialog `message` → `description` prop (3 files)
- Removed unused imports (2 files)
- Button polymorphism workaround (1 file)

**Dependencies:**
```bash
npm install @auth0/auth0-react react-hook-form zod @hookform/resolvers
```

**Result:** Production-ready admin UI with complete user, fleet, and container management capabilities.

---

## Checklist

When documenting agent results, verify:

- [ ] Retrieved agent output with extended timeout
- [ ] Counted all files created and updated
- [ ] Listed key files with descriptions
- [ ] Documented all features implemented
- [ ] Noted any TypeScript errors that were fixed
- [ ] Listed dependencies installed
- [ ] Created summary with token count
- [ ] Updated TODO.md or tasks.md with results
- [ ] Marked todo items as complete

---

## Tips

**Token Count as Quality Indicator:**
- < 500K tokens: Basic implementation
- 500K-1M tokens: Standard deliverable
- 1M-2M tokens: Comprehensive deliverable ⭐
- > 2M tokens: Exceptional detail ⭐⭐

**Time Savings Calculation:**
```
Estimated manual time: [N] hours
Agent execution time: [M] hours
Time saved: [N - M] hours (X% reduction)
```

**Update Tracking Files:**
- `TODO.md`: Mark phase/task as complete
- `tasks.md`: Update task status, mark complete
- `completedtasks.md`: Add to archive with details
- Project CLAUDE.md: Add any new patterns discovered

---

**This template ensures consistent, thorough documentation of all agent work.**

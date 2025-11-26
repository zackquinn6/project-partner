# Structure Manager Refactoring Plan

## Overview
This document outlines the refactoring plan to fix Structure Manager according to the requirements:
- Load only standard phases in Edit Standard mode
- Ensure sequential ordering positions (1, 2, 3, ...) with no gaps or duplicates
- Remove auto-refresh behavior
- Centralize ordering validation

## Current Issues

### 1. Complex Ordering Logic
The `processedPhases` memo (lines 916-1273) has extremely complex logic with:
- Multiple validation passes
- Order number preservation logic
- Duplicate detection and fixing
- Standard phase position rules
- **This should be replaced with `validateAndFixSequentialOrdering`**

### 2. Auto-Refresh Behavior
The useEffect at line 1278 triggers on many dependencies:
```typescript
}, [rebuildingPhases, currentProject?.id, rebuiltPhases?.length, mergedPhases?.length, justAddedPhaseId, skipNextRefresh, isAddingPhase, isDeletingPhase, phaseToDelete]);
```
This causes refreshes when data changes. **Should only run on initial project load.**

### 3. Redundant Filtering
Edit Standard filtering appears in multiple places:
- Line 560-571 in mergedPhases
- Line 852-863 in mergedPhases
- Line 902-908 in mergedPhases
- Line 928-930 in processedPhases
- Line 1360-1362 in useEffect
**Should be centralized in mergedPhases only.**

### 4. Multiple Validation Functions
- `validateAndFixPhaseOrderNumbers` (line 199-393)
- `ensureUniqueOrderNumbers` (line 427-531)
- Multiple inline validation passes
**Should all use `validateAndFixSequentialOrdering`**

## Proposed Changes

### Phase 1: Simplify processedPhases
Replace lines 916-1273 with:
1. Filter phases for Edit Standard mode
2. Deduplicate phases
3. Apply `validateAndFixSequentialOrdering`
4. Sort by ordering position

### Phase 2: Simplify useEffect
Change line 1278 useEffect to:
- Only depend on `currentProject?.id` (initial load)
- Remove skipNextRefresh logic
- Remove auto-update of project context

### Phase 3: Centralize Edit Standard Filtering
- Keep filtering only in mergedPhases memo
- Remove redundant filters in processedPhases and useEffect

### Phase 4: Remove Redundant Validation
- Remove `validateAndFixPhaseOrderNumbers`
- Remove `ensureUniqueOrderNumbers`
- Use only `validateAndFixSequentialOrdering`

## Implementation Priority

1. **Critical**: Add Edit Standard filtering in mergedPhases ✅ (already done)
2. **Critical**: Use validateAndFixSequentialOrdering in processedPhases
3. **Important**: Simplify useEffect to remove auto-refresh
4. **Nice to have**: Remove redundant validation functions


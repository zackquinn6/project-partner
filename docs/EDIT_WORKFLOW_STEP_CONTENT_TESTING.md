# Edit Workflow - Step Content Detail Level Testing Protocol

## Overview
This document provides a comprehensive testing protocol for verifying the Step Content Detail Level dropdown functionality in the Edit Workflow view.

## Feature Description
The Edit Workflow view allows administrators to configure three levels of instructional detail for each step in a project workflow:
- **Quick**: Brief, essential instructions for experienced users
- **Detailed**: Comprehensive step-by-step instructions (default) for most users
- **Contractor**: Professional-level technical instructions for professionals

Each step can have different content for each detail level, stored in the `step_instructions` table with the corresponding `instruction_level` value.

## CORRECT Navigation Path

### Step-by-Step Access Instructions

1. **Login as Admin**
   - Navigate to your application
   - Sign in with admin credentials
   - Verify you have admin privileges

2. **Navigate to Project Management**
   - From the home page or main navigation
   - Click on "Project Management" or admin section
   - Verify Project Management window opens

3. **Select Project**
   - In the Project Management window, find the projects table
   - Locate the project template you want to edit
   - Click on the project row to select it

4. **Select Revision Control Tab**
   - Within Project Management, locate the tab navigation
   - Click on "Revision Control" tab
   - Verify you see a list of project revisions

5. **Select Edit Workflow on Latest Revision**
   - In the Revisions table, find the most recent/latest revision
   - Click the "Edit Workflow" button for that revision
   - Verify the Edit Workflow view opens (full screen overlay)

6. **Select a Step**
   - In the left sidebar, you'll see a hierarchical navigation:
     - Phases (collapsible sections)
     - Operations (under each phase)
     - Steps (under each operation)
   - Expand a phase
   - Expand an operation
   - Click on a specific step
   - Verify the step details load in the main content area

7. **Select Edit Step**
   - At the top of the step details, locate the "Edit Step" button
   - Click "Edit Step"
   - Verify the step enters edit mode

8. **Scroll to Step Content Section**
   - Scroll down in the main content area
   - Locate the "Step Content" card (should be the first major section after step header)
   - This section has a gradient card style with "Step Content" as the title

## Feature Location

**Component File**: `src/components/EditWorkflowView.tsx`  
**Lines**: 532-563 (as of latest update)

The Step Content section appears as:
- **Card Header**: Contains title, description, and instruction level dropdown
- **Dropdown Location**: Top-right of the card header
- **Info Banner**: Below the header, showing current instruction level context
- **Content Editor**: The main content editing area

## Testing Steps

### Phase 1: Verify Dropdown Existence

1. **Locate Step Content Card**
   - After clicking "Edit Step", scroll to find the "Step Content" card
   - Verify the card has a gradient background
   - Verify "Step Content" title is visible on the left
   - Verify "Add instructions, images, videos..." description below title

2. **Locate Instruction Level Dropdown**
   - Look at the top-right of the Step Content card header
   - You should see:
     - Label: "Instruction Level:"
     - Dropdown selector showing current level (default: "Detailed")
   - The dropdown should be approximately 160px wide

**Expected Result**: Dropdown is clearly visible in the card header

### Phase 2: Test Dropdown Functionality

1. **Click the Dropdown**
   - Click on the instruction level dropdown
   - Verify dropdown menu opens with 3 options:
     - Quick
     - Detailed
     - Contractor

2. **Verify Visual Properties**
   - Dropdown menu has solid background (not transparent)
   - High z-index (z-100) - appears above all content
   - Clear border and shadow
   - Text is readable with proper contrast

3. **Select Different Level**
   - Click "Quick" option
   - Verify dropdown closes
   - Verify "Quick" is now displayed in dropdown trigger
   - Verify info banner below updates to show "Current Level: Quick"

4. **Read Info Banner**
   - Verify the info banner states:
     "Current Level: Quick - Content for this instruction level is stored in the step_instructions table with instruction_level='quick'. When users select their preferred instruction level in project runs, they will see the corresponding content."

5. **Change to Other Levels**
   - Select "Contractor"
   - Verify display updates to "Contractor"
   - Verify info banner updates accordingly
   - Select "Detailed" to return to default
   - Verify all updates work smoothly

**Expected Result**: Dropdown functions properly with immediate visual feedback

### Phase 3: Test Across Multiple Steps

1. **Navigate to Different Step**
   - In the left sidebar, click on a different step
   - Click "Edit Step" for the new step
   - Scroll to Step Content section

2. **Verify Dropdown is Present**
   - Confirm the instruction level dropdown is visible
   - Confirm it shows current selection (likely "Detailed" as default)

3. **Change Level for This Step**
   - Set this step to "Contractor"
   - Navigate to another step
   - Set that step to "Quick"

4. **Verify Independence**
   - Navigate back to the first step
   - Verify it still shows "Contractor"
   - Navigate to the second step
   - Verify it shows "Quick"

**Expected Result**: Each step can have an independent instruction level selection

### Phase 4: Verify Context and Messaging

1. **Read Card Header**
   - Title: "Step Content"
   - Description: "Add instructions, images, videos, and other content for this step"
   - Dropdown: "Instruction Level:" with current selection

2. **Read Info Banner**
   - Location: Directly below card header, above content editor
   - Background: Muted gray with border
   - Content: Explains current level and database storage
   - Mentions: step_instructions table and instruction_level column

3. **Understand Feature Purpose**
   - Dropdown indicates which detail level you're configuring
   - Content entered/edited applies to selected instruction level
   - Users will see different content based on their preference in project runs

**Expected Result**: Clear, informative messaging about the feature

### Phase 5: Visual Inspection Checklist

When viewing the Step Content section in Edit mode, verify:

- [ ] "Step Content" card is visible with gradient background
- [ ] Card title "Step Content" is on the left side of header
- [ ] Card description is below the title
- [ ] "Instruction Level:" label is visible on the right side of header
- [ ] Dropdown selector is next to the label
- [ ] Dropdown shows current selection (default: "Detailed")
- [ ] Dropdown has proper styling (border, background, chevron icon)
- [ ] Info banner is visible below the header
- [ ] Info banner has muted background and border
- [ ] Info banner mentions current instruction level
- [ ] Info banner references step_instructions table
- [ ] Content editor area is below the info banner
- [ ] No visual glitches or overlapping elements
- [ ] Layout is responsive and properly aligned

### Phase 6: Test Edit Mode vs View Mode

1. **View Mode (Not Editing)**
   - Navigate to a step without clicking "Edit Step"
   - Scroll to Step Content area
   - Verify you see rendered content (read-only)
   - Instruction level dropdown should NOT be visible in view mode

2. **Edit Mode (After Clicking Edit Step)**
   - Click "Edit Step" button
   - Scroll to Step Content card
   - Verify instruction level dropdown IS visible
   - Verify you can interact with the dropdown
   - Verify content editor allows editing

**Expected Result**: Dropdown only appears in edit mode

### Phase 7: Save and Persistence Testing

1. **Change Instruction Level**
   - Set instruction level to "Contractor"
   - Make some content changes
   - Scroll to bottom and click "Save Changes" button

2. **Navigate Away and Return**
   - Click on a different step
   - Click back to the original step
   - Click "Edit Step"
   - Verify instruction level is preserved (shows "Contractor")

3. **Exit and Re-enter Edit Workflow**
   - Click "Back to Project Manager" (top-left)
   - Navigate back through: Project Management → Revision Control → Edit Workflow
   - Select the same step
   - Click "Edit Step"
   - Note: Without database integration, level may reset to default

**Expected Result**: In-session persistence works; full persistence requires database integration

### Phase 8: Edge Cases and Error Handling

1. **Rapid Selection Changes**
   - Rapidly click dropdown and change selections
   - Verify no errors in browser console
   - Verify UI remains stable

2. **Different Content Types**
   - Test with steps that have different content:
     - Steps with text content
     - Steps with multi-section content
     - Steps with images/videos
     - Steps with no content
   - Verify dropdown works consistently

3. **Long Step Names**
   - Navigate to steps with very long names
   - Verify dropdown doesn't get pushed off screen
   - Verify layout remains functional

**Expected Result**: Feature works reliably in all scenarios

## Database Integration Notes

### Current Implementation
The dropdown provides:
- ✅ Visual UI selector for instruction level
- ✅ State management for current selection
- ✅ Info banner showing selected level
- ✅ Context about step_instructions table

### Future Enhancement Required
For full functionality, integrate with database:
1. **Load Content by Level**: Fetch content from step_instructions table filtered by instruction_level
2. **Save Content by Level**: Save edits to correct instruction_level row
3. **Level Initialization**: Load saved instruction level when step opens
4. **Multi-Level Management**: Allow viewing/editing all 3 levels side-by-side

### Database Query Examples

```sql
-- Fetch content for specific step and instruction level
SELECT content, instruction_level
FROM step_instructions
WHERE template_step_id = '[step-id]'
AND instruction_level = 'detailed';

-- Save content for specific instruction level
INSERT INTO step_instructions (template_step_id, instruction_level, content)
VALUES ('[step-id]', 'quick', '[content-json]')
ON CONFLICT (template_step_id, instruction_level) 
DO UPDATE SET content = EXCLUDED.content, updated_at = now();

-- Get all instruction levels for a step
SELECT instruction_level, content
FROM step_instructions
WHERE template_step_id = '[step-id]'
ORDER BY 
  CASE instruction_level
    WHEN 'quick' THEN 1
    WHEN 'detailed' THEN 2
    WHEN 'contractor' THEN 3
  END;
```

## Troubleshooting Guide

### Issue: Dropdown Not Visible

**Possible Causes:**
1. Not in edit mode - Click "Edit Step" button first
2. Not scrolled to Step Content section
3. Different component/wrong navigation path

**Solution:**
- Verify you followed exact navigation: Project Management → Revision Control → Edit Workflow
- Ensure you clicked "Edit Step" button
- Scroll down to find "Step Content" card

### Issue: Dropdown Menu Not Opening

**Check:**
1. Browser console for JavaScript errors
2. Z-index conflicts with other UI elements
3. Click is being captured by parent elements

**Solution:**
- Refresh the page
- Try in different browser
- Check for console errors

### Issue: Selection Not Persisting

**Expected Behavior:**
- Within edit session: Should persist when navigating between steps
- After save/reload: May not persist without database integration

**Solution:**
- Normal behavior - requires database integration for full persistence
- Selection persists within current edit session

### Issue: Info Banner Not Updating

**Check:**
1. Verify dropdown selection is changing
2. Check React state updates in dev tools
3. Look for console errors

**Solution:**
- The banner text should update immediately when dropdown changes
- If not updating, there may be a rendering issue

## Success Criteria

The Step Content Detail Level dropdown feature is functioning correctly when:

✅ Dropdown selector is visible in Step Content card header (edit mode only)  
✅ Dropdown displays 3 options: Quick, Detailed, Contractor  
✅ Dropdown has solid background with z-index 100  
✅ Selecting an option updates the dropdown display immediately  
✅ Info banner correctly shows selected level with table reference  
✅ Feature is accessible via correct navigation path  
✅ Works consistently across all steps  
✅ No visual glitches or transparency issues  
✅ Layout is responsive and well-aligned  

## Visual Reference

### Expected Layout:
```
┌──────────────────────────────────────────────────────────┐
│  Step Content                    Instruction Level: [▼]   │
│  Add instructions, images, videos...                      │
├──────────────────────────────────────────────────────────┤
│  ╔════════════════════════════════════════════════════╗  │
│  ║ Current Level: Detailed - Content for this        ║  │
│  ║ instruction level is stored in...                 ║  │
│  ╚════════════════════════════════════════════════════╝  │
│                                                           │
│  [Content Editor Area]                                    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Related Documentation

- **Component**: `src/components/EditWorkflowView.tsx` (lines 532-563)
- **Database Table**: `step_instructions`
- **Instruction Level Column**: `instruction_level` (values: 'quick', 'detailed', 'contractor')
- **UI Component**: Shadcn Select component (`src/components/ui/select.tsx`)
- **State Management**: React useState hook for `instructionLevel`

## Additional Notes

- Feature is only visible in **edit mode** (after clicking "Edit Step")
- Default instruction level is **"Detailed"**
- Dropdown width is set to 160px for optimal display
- Info banner provides clear context about database storage
- Full functionality requires database query integration (future enhancement)

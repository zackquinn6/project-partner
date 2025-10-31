# Window Standardization Guidelines

All full-screen/modal windows in the application MUST follow these standardization rules for consistency, accessibility, and proper UX.

## Critical Requirements

### 1. Dialog Component Structure
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
    {/* Content */}
  </DialogContent>
</Dialog>
```

**Key Classes Explained:**
- `w-full h-screen max-w-full max-h-full` - Full screen on mobile
- `md:max-w-[90vw] md:h-[90vh]` - 90% width/height on desktop
- `md:rounded-lg` - Rounded corners on desktop only
- `p-0` - No default padding (we control it internally)
- `overflow-hidden` - Prevent outer scrolling
- `flex flex-col` - Vertical flex layout for header + scrollable content
- `[&>button]:hidden` - Hide the default X button

### 2. Header Structure
```tsx
<DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="flex items-center justify-between gap-2">
    <DialogTitle className="text-lg md:text-xl font-bold">Window Title</DialogTitle>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => onOpenChange(false)} 
      className="h-7 px-2 text-[9px] md:text-xs"
    >
      Close
    </Button>
  </div>
</DialogHeader>
```

**Header Requirements:**
- Use `DialogHeader` and `DialogTitle` for semantic structure
- Include `flex-shrink-0` to prevent header from shrinking
- Include `border-b` for visual separation
- Background blur: `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`
- Close button must be `variant="ghost"` with text "Close" (not an X icon)
- Responsive padding: `px-2 md:px-4 py-1.5 md:py-2`
- Title size: `text-lg md:text-xl`

### 3. Scrollable Content Area
```tsx
<div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
  {/* Your content here */}
</div>
```

**Scrolling Requirements:**
- Use `flex-1` to take remaining space
- Use `overflow-y-auto` for vertical scrolling
- Responsive padding: `px-2 md:px-4 py-3 md:py-4`
- Content must scroll, not the entire dialog

### 4. Child Dialogs (Dialogs within Dialogs)

When a window needs to open another dialog:

```tsx
<Dialog open={open} onOpenChange={(isOpen) => {
  // Prevent closing if child dialog is open
  if (!isOpen && childDialogOpen) {
    return; // Don't close if child dialog is open
  }
  onOpenChange(isOpen);
}}>
  {/* Main dialog content */}
</Dialog>

{/* Child dialog renders separately */}
<ChildDialog open={childDialogOpen} onOpenChange={setChildDialogOpen} />
```

**Child Dialog Requirements:**
- Child dialogs must render as siblings (not nested inside parent DialogContent)
- Parent dialog must prevent closing when child is open
- Child dialogs should use the same standardization rules
- Child dialogs appear on top with proper z-index (automatic with Radix Dialog)

### 5. Mobile Responsiveness

**Text Sizes:**
- Titles: `text-lg md:text-xl`
- Button text: `text-[9px] md:text-xs` or `text-xs md:text-sm`
- Labels: `text-xs` or `text-xs md:text-sm`

**Spacing:**
- Padding: `px-2 md:px-4` and `py-1.5 md:py-2`
- Gaps: `gap-1 md:gap-2` or `gap-2 md:gap-4`
- Button heights: `h-7` for small buttons, `h-8 md:h-9` for regular

**Breakpoints:**
- Mobile: < 768px (default, no prefix)
- Desktop: >= 768px (use `md:` prefix)

### 6. Close Button Standardization

**Always use:**
```tsx
<Button 
  variant="ghost" 
  size="sm" 
  onClick={() => onOpenChange(false)} 
  className="h-7 px-2 text-[9px] md:text-xs"
>
  Close
</Button>
```

**Never use:**
- X icons for close buttons
- `variant="outline"` (use `variant="ghost"`)
- Different close button text

### 7. Background Blur

Header should always have background blur for visual depth:
```tsx
className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
```

This creates a frosted glass effect on the header.

## Complete Reference Example

See `src/components/HomeTaskList.tsx` for the canonical implementation of these standards.

## Checklist for New Windows

- [ ] Dialog uses correct sizing classes (90% desktop, full mobile)
- [ ] Default X button is hidden with `[&>button]:hidden`
- [ ] Header uses `DialogHeader` and `DialogTitle`
- [ ] Header has background blur
- [ ] Header has border-b separator
- [ ] Close button is "ghost" variant with "Close" text
- [ ] Content area uses `flex-1 overflow-y-auto`
- [ ] Responsive padding throughout (px-2 md:px-4)
- [ ] Text sizes are responsive (text-xs md:text-sm)
- [ ] Child dialogs render as siblings, not nested
- [ ] Parent prevents closing when child is open

## Common Mistakes to Avoid

1. ❌ Nesting child dialogs inside parent DialogContent
2. ❌ Using X icon instead of "Close" button
3. ❌ Using `variant="outline"` for close button
4. ❌ Not hiding the default X button
5. ❌ Making the entire dialog scrollable instead of just content
6. ❌ Forgetting `flex-shrink-0` on header
7. ❌ Not using background blur on header
8. ❌ Inconsistent padding between mobile and desktop
9. ❌ Not using semantic `DialogHeader` and `DialogTitle`
10. ❌ Hardcoding sizes instead of using responsive classes

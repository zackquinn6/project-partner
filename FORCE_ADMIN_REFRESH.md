# Force Admin Status Refresh

Your admin role is confirmed in the database, but your session needs to refresh.

## Confirmed Database Status
✅ User ID: `c652a43a-50d0-4fc8-ae71-ef86f502b238`
✅ Email: `zackquinn6@gmail.com`
✅ Role: `admin` (PRESENT in database)

## Steps to Activate Admin Access

### Option 1: Sign Out & Sign In (RECOMMENDED)

1. **Sign Out** completely from the app
2. **Clear browser cache** (optional but helps):
   - Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
   - Or just use Incognito/Private mode
3. **Sign Back In** with zackquinn6@gmail.com
4. Your admin status should now be active

### Option 2: Force Session Refresh (If signed out doesn't work)

1. Open **Browser DevTools** (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. **Clear all storage:**
   - Local Storage → Delete all
   - Session Storage → Delete all
   - IndexedDB → Delete all
4. **Refresh the page** (F5)
5. **Sign in again**

### Option 3: Nuclear Option (If nothing else works)

1. Open DevTools Console (F12 → Console tab)
2. Run this:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
3. Sign in again

## How Admin Access Works

The `check-subscription` edge function checks your `user_roles` table:

```typescript
const { data: adminRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .single();

if (adminRole) {
  return { 
    subscribed: true, 
    isAdmin: true,
    subscriptionEnd: null 
  };
}
```

**Your database has the admin role**, so once your session refreshes, this check will pass.

## Verify It's Working

After signing back in, check:
1. ✅ No subscription/trial warnings appear
2. ✅ You can access admin-only features
3. ✅ Console log should show `isAdmin: true`

## If Still Not Working

Let me know and I'll:
1. Check the MembershipContext implementation
2. Verify RLS policies aren't blocking the query
3. Add debug logging to the edge function

## Quick Diagnostic

Open DevTools Console and run:
```javascript
// Check what the membership context shows
console.log('Membership Context:', window);
```

Or check the Network tab for the `check-subscription` response - it should show `isAdmin: true`.


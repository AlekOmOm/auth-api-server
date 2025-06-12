# Task 004: Fix Error Message Display

## Priority: 🟡 HIGH

## Status: ⏳ TODO

## Issue Description
Error messages are not being displayed to users during form validation and API errors.

### Current Behavior
- Form validation errors not shown
- API error responses not displayed
- Playwright can't find `.error-message` elements
- Users get no feedback on failures

### Expected Behavior
- Validation errors shown immediately
- API errors displayed clearly
- Error messages have proper CSS classes
- Errors accessible to screen readers

## Root Cause Analysis
1. Check error message component usage
2. Verify error state management
3. Check CSS class names
4. Verify error response handling

## Implementation Steps

### 1. Fix Login Error Display
```javascript
// In Login.svelte
{#if errorMessage}
  <p class="error-message">{errorMessage}</p>
{/if}

// Ensure errorMessage is set on failure
if (!response.success) {
  errorMessage = response.message || 'Login failed. Please check your credentials.';
}
```

### 2. Fix Registration Error Display
```javascript
// In Register.svelte - using ErrorMessage component
{#if errorMessages.length > 0}
  <ErrorMessage errors={errorMessages} />
{/if}

// Ensure errors array is populated
if (!response.success) {
  if (response.errors && Array.isArray(response.errors)) {
    errorMessages = response.errors.map(err => err.msg);
  } else if (response.message) {
    errorMessages = [response.message];
  }
}
```

### 3. Add Validation Errors
```javascript
// Add client-side validation
function validateForm() {
  const errors = [];
  
  if (!email || !email.includes('@')) {
    errors.push('Please enter a valid email address');
  }
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  errorMessages = errors;
  return errors.length === 0;
}
```

### 4. Improve Error Visibility
```css
/* Make errors more prominent */
.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-weight: 500;
}
```

## Files to Modify
- `src/routes/card/Login.svelte`
- `src/routes/card/Register.svelte`
- `src/components/ErrorMessage.svelte`
- CSS files for error styling

## Test Verification
```bash
# Test error display
npx playwright test auth-flow.spec.js -g "show error for invalid"

# Test validation
npx playwright test auth-flow.spec.js -g "validate registration"
```

## Affected Tests
- All tests that check for error messages
- "should show error for invalid login credentials"
- "should validate registration form fields"

## Acceptance Criteria
- [ ] Login errors displayed with `.error-message` class
- [ ] Registration errors use ErrorMessage component
- [ ] Validation errors shown before submission
- [ ] Errors are visually prominent
- [ ] Playwright can find and read error messages
- [ ] Errors include helpful messages 
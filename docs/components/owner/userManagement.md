# User Management Component Documentation

## Overview

The User Management component (`UserManagementModal.svelte`) provides comprehensive CRUD (Create, Read, Update, Delete) operations for managing users within specific client server schemas. It's designed as a modal interface that allows client server owners to efficiently manage their application's user base.

## Features

### 👥 **User Operations**
- **View Users**: Display all users within a client server schema
- **Create Users**: Add new users with full profile information
- **Edit Users**: Update existing user details and roles
- **Delete Users**: Remove users with confirmation dialogs
- **Role Management**: Assign and modify user roles within the client application

### 🔍 **User Interface**
- **Responsive Table**: Adaptive layout for different screen sizes
- **Search and Filter**: Quick user lookup capabilities
- **Inline Actions**: Direct edit/delete actions from the user list
- **Form Validation**: Real-time validation for user data
- **Loading States**: Clear feedback during operations

## Component Architecture

### **Props**
```javascript
export let clientServer; // Client server object containing schema info
```

### **State Management**
```javascript
let users = [];              // Array of users in the schema
let loading = true;          // Loading state for user list
let error = '';              // Error message display
let showCreateUser = false;  // Toggle for create/edit form
let editingUser = null;      // Currently editing user object

// Form state
let userName = '';
let userEmail = '';
let userPassword = '';
let userRole = 'user';
let formLoading = false;
let formError = '';
```

### **User Roles**
```javascript
const userRoles = [
  { 
    value: 'user', 
    label: 'User', 
    description: 'Standard user access' 
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Administrative access within this client' 
  }
];
```

## API Integration

### **Endpoints Used**
```javascript
// Get all users in client schema
GET /api/owner/clients/${clientId}/users

// Create new user in client schema
POST /api/owner/clients/${clientId}/users
Body: { name, email, password, role }

// Update existing user
PUT /api/owner/clients/${clientId}/users/${userId}
Body: { name, email, password?, role }

// Delete user
DELETE /api/owner/clients/${clientId}/users/${userId}
```

### **Request/Response Format**
```javascript
// Create/Update User Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!", // Optional for updates
  "role": "user"
}

// User List Response
{
  "success": true,
  "data": [
    {
      "user_id": "uuid-string",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2025-01-25T10:00:00Z"
    }
  ]
}
```

## User Interface Components

### **User List View**
```svelte
<!-- Desktop Table Layout -->
<div class="users-table">
  <div class="table-header">
    <div class="col-name">Name</div>
    <div class="col-email">Email</div>
    <div class="col-role">Role</div>
    <div class="col-created">Created</div>
    <div class="col-actions">Actions</div>
  </div>
  
  {#each users as user}
    <div class="table-row">
      <!-- User data display -->
    </div>
  {/each}
</div>
```

### **Create/Edit Form**
```svelte
<!-- User Form -->
<form on:submit|preventDefault={handleSubmitUser}>
  <div class="form-row">
    <div class="form-group">
      <label for="userName">Name *</label>
      <input bind:value={userName} required />
    </div>
    
    <div class="form-group">
      <label for="userEmail">Email *</label>
      <input type="email" bind:value={userEmail} required />
    </div>
  </div>
  
  <div class="form-row">
    <div class="form-group">
      <label for="userPassword">
        Password {editingUser ? '(leave blank to keep current)' : '*'}
      </label>
      <input type="password" bind:value={userPassword} />
    </div>
    
    <div class="form-group">
      <label for="userRole">Role *</label>
      <select bind:value={userRole}>
        {#each userRoles as role}
          <option value={role.value}>{role.label}</option>
        {/each}
      </select>
    </div>
  </div>
</form>
```

## Functionality Details

### **Loading Users**
```javascript
async function loadUsers() {
  try {
    loading = true;
    error = '';
    
    const response = await fetch(`/api/owner/clients/${clientServer.client_id}/users`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    users = result.data || [];
    
  } catch (err) {
    console.error('Error loading users:', err);
    error = 'Failed to load users: ' + err.message;
  } finally {
    loading = false;
  }
}
```

### **Creating/Updating Users**
```javascript
async function handleSubmitUser() {
  try {
    formLoading = true;
    formError = '';
    
    // Validation
    if (!userName.trim() || !userEmail.trim()) {
      throw new Error('Name and email are required');
    }
    
    if (!editingUser && !userPassword.trim()) {
      throw new Error('Password is required for new users');
    }
    
    const userData = {
      name: userName.trim(),
      email: userEmail.trim(),
      role: userRole
    };
    
    if (userPassword.trim()) {
      userData.password = userPassword.trim();
    }
    
    // API call (create or update)
    const response = await fetch(endpoint, {
      method: editingUser ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    // Reload users and close form
    await loadUsers();
    cancelForm();
    
  } catch (err) {
    formError = err.message;
  } finally {
    formLoading = false;
  }
}
```

### **Deleting Users**
```javascript
async function handleDeleteUser(user) {
  if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(
      `/api/owner/clients/${clientServer.client_id}/users/${user.user_id}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
    
    await loadUsers(); // Refresh the list
    
  } catch (err) {
    alert('Failed to delete user: ' + err.message);
  }
}
```

## Validation Rules

### **Client-Side Validation**
```javascript
// Name validation
if (!userName.trim()) {
  throw new Error('Name is required');
}

// Email validation (HTML5 + custom)
if (!userEmail.trim()) {
  throw new Error('Email is required');
}
// Browser handles email format validation

// Password validation
if (!editingUser && !userPassword.trim()) {
  throw new Error('Password is required for new users');
}

// Role validation
if (!userRole || !userRoles.find(r => r.value === userRole)) {
  throw new Error('Valid role is required');
}
```

### **Server-Side Validation**
The backend should implement additional validation:
- Email uniqueness within the schema
- Password strength requirements
- Role authorization checks
- Input sanitization

## Responsive Design

### **Desktop Layout (> 768px)**
```css
.table-header, .table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  align-items: center;
}
```

### **Mobile Layout (≤ 768px)**
```css
.table-row {
  display: block;
  padding: 1rem;
}

.col-name, .col-email, .col-role, .col-created, .col-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.col-name::before { content: "Name: "; font-weight: 600; }
.col-email::before { content: "Email: "; font-weight: 600; }
/* ... other pseudo-elements for labels */
```

## Error Handling

### **Network Errors**
```javascript
// Connection issues
catch (err) {
  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    error = 'Network error. Please check your connection.';
  } else {
    error = 'Failed to load users: ' + err.message;
  }
}
```

### **Validation Errors**
```javascript
// Form validation errors
if (!userName.trim() || !userEmail.trim()) {
  formError = 'Name and email are required';
  return;
}

// Server validation errors
if (!response.ok) {
  const errorData = await response.json();
  formError = errorData.message || 'Operation failed';
}
```

### **Permission Errors**
```javascript
// 403 Forbidden
if (response.status === 403) {
  formError = 'You do not have permission to perform this action';
}

// 401 Unauthorized
if (response.status === 401) {
  formError = 'Authentication required. Please log in again.';
}
```

## Security Considerations

### **Access Control**
- Only client server owners can manage users in their schemas
- Role-based permissions enforced on backend
- Session-based authentication required

### **Data Validation**
- Input sanitization on both client and server
- Email format validation
- Password requirements enforcement
- SQL injection prevention through parameterized queries

### **Privacy Protection**
- Passwords never displayed in UI
- Secure password updates (optional for edits)
- User data isolated by client schema

## Performance Optimizations

### **Efficient Loading**
```javascript
// Load users only when modal opens
onMount(async () => {
  await loadUsers();
});

// Debounced search (future enhancement)
let searchTimeout;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // Perform search
  }, 300);
}
```

### **Optimistic Updates**
```javascript
// Update UI immediately, rollback on error
function optimisticUpdate(user, changes) {
  const originalUsers = [...users];
  
  // Update UI
  users = users.map(u => u.user_id === user.user_id ? {...u, ...changes} : u);
  
  // Make API call
  updateUser(user.user_id, changes)
    .catch(() => {
      // Rollback on error
      users = originalUsers;
    });
}
```

## Integration Examples

### **Opening User Management**
```javascript
// From OwnerPanel.svelte
function handleManageUsers(clientServer) {
  selectedClientServer = clientServer;
  showUserModal = true;
}
```

### **Event Handling**
```javascript
// Modal events
on:close={() => {
  showUserModal = false;
  selectedClientServer = null;
}}
```

## Testing Strategies

### **Unit Tests**
```javascript
// Test user creation
test('creates user with valid data', async () => {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'SecurePass123!',
    role: 'user'
  };
  
  const result = await createUser(userData);
  expect(result.success).toBe(true);
});

// Test validation
test('rejects invalid email', () => {
  expect(() => validateEmail('invalid-email')).toThrow();
});
```

### **Integration Tests**
```javascript
// Test full user management flow
test('complete user CRUD operations', async () => {
  // Create user
  const user = await createUser(testUserData);
  
  // Read user
  const users = await loadUsers();
  expect(users).toContain(user);
  
  // Update user
  await updateUser(user.id, { name: 'Updated Name' });
  
  // Delete user
  await deleteUser(user.id);
});
```

### **E2E Tests**
```javascript
// Test user interface interactions
test('user management modal workflow', async () => {
  // Open modal
  await page.click('[data-testid="manage-users-btn"]');
  
  // Create user
  await page.fill('[data-testid="user-name"]', 'Test User');
  await page.fill('[data-testid="user-email"]', 'test@example.com');
  await page.click('[data-testid="submit-user"]');
  
  // Verify user appears in list
  await expect(page.locator('[data-testid="user-list"]')).toContainText('Test User');
});
```

## Future Enhancements

### **Planned Features**
- **Bulk Operations**: Select multiple users for batch actions
- **Advanced Search**: Filter by role, creation date, activity status
- **User Import/Export**: CSV import/export functionality
- **Activity Logs**: Track user login history and actions
- **Email Invitations**: Send invitation emails to new users
- **Profile Pictures**: Avatar upload and management

### **Performance Improvements**
- **Virtual Scrolling**: Handle large user lists efficiently
- **Pagination**: Server-side pagination for better performance
- **Real-time Updates**: WebSocket integration for live user status
- **Caching**: Client-side caching for frequently accessed data

### **UX Enhancements**
- **Keyboard Navigation**: Full keyboard accessibility
- **Drag and Drop**: Reorder users or bulk role assignment
- **Quick Actions**: Inline editing without modal
- **Advanced Filtering**: Multiple filter criteria
- **Export Options**: PDF, Excel export formats

---

**Last Updated**: January 25, 2025  
**Version**: 1.0.0  
**Status**: Production Ready 🚀

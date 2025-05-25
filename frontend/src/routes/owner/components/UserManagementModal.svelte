<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let clientServer;
  
  const dispatch = createEventDispatcher();
  
  let users = [];
  let loading = true;
  let error = '';
  let showCreateUser = false;
  let editingUser = null;
  
  // Create/Edit user form
  let userName = '';
  let userEmail = '';
  let userPassword = '';
  let userRole = 'user';
  let formLoading = false;
  let formError = '';
  
  const userRoles = [
    { value: 'user', label: 'User', description: 'Standard user access' },
    { value: 'admin', label: 'Admin', description: 'Administrative access within this client' }
  ];
  
  onMount(async () => {
    await loadUsers();
  });
  
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
  
  function handleCreateUser() {
    resetForm();
    showCreateUser = true;
  }
  
  function handleEditUser(user) {
    editingUser = user;
    userName = user.name;
    userEmail = user.email;
    userPassword = '';
    userRole = user.role;
    showCreateUser = true;
  }
  
  function resetForm() {
    editingUser = null;
    userName = '';
    userEmail = '';
    userPassword = '';
    userRole = 'user';
    formError = '';
  }
  
  function cancelForm() {
    resetForm();
    showCreateUser = false;
  }
  
  async function handleSubmitUser() {
    try {
      formLoading = true;
      formError = '';
      
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
      
      let response;
      
      if (editingUser) {
        // Update existing user
        response = await fetch(`/api/owner/clients/${clientServer.client_id}/users/${editingUser.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });
      } else {
        // Create new user
        response = await fetch(`/api/owner/clients/${clientServer.client_id}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Reload users and close form
      await loadUsers();
      cancelForm();
      
    } catch (err) {
      console.error('Error saving user:', err);
      formError = err.message;
    } finally {
      formLoading = false;
    }
  }
  
  async function handleDeleteUser(user) {
    if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/owner/clients/${clientServer.client_id}/users/${user.user_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
      
      await loadUsers();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user: ' + err.message);
    }
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }
  
  function getRoleColor(role) {
    switch (role) {
      case 'admin':
        return '#e74c3c';
      case 'user':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  }
</script>

<div class="modal-overlay" on:click={() => dispatch('close')}>
  <div class="modal" on:click|stopPropagation>
    <div class="modal-header">
      <h2>👥 Manage Users - {clientServer.app_name}</h2>
      <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
    </div>
    
    <div class="modal-content">
      {#if showCreateUser}
        <!-- Create/Edit User Form -->
        <div class="user-form">
          <h3>{editingUser ? '✏️ Edit User' : '➕ Create New User'}</h3>
          
          <form on:submit|preventDefault={handleSubmitUser}>
            <div class="form-row">
              <div class="form-group">
                <label for="userName">Name *</label>
                <input 
                  id="userName"
                  type="text" 
                  bind:value={userName}
                  placeholder="User's full name"
                  required
                  disabled={formLoading}
                />
              </div>
              
              <div class="form-group">
                <label for="userEmail">Email *</label>
                <input 
                  id="userEmail"
                  type="email" 
                  bind:value={userEmail}
                  placeholder="user@example.com"
                  required
                  disabled={formLoading}
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="userPassword">Password {editingUser ? '(leave blank to keep current)' : '*'}</label>
                <input 
                  id="userPassword"
                  type="password" 
                  bind:value={userPassword}
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                  required={!editingUser}
                  disabled={formLoading}
                />
              </div>
              
              <div class="form-group">
                <label for="userRole">Role *</label>
                <select id="userRole" bind:value={userRole} disabled={formLoading}>
                  {#each userRoles as role}
                    <option value={role.value}>{role.label}</option>
                  {/each}
                </select>
                <small class="help-text">
                  {userRoles.find(r => r.value === userRole)?.description}
                </small>
              </div>
            </div>
            
            {#if formError}
              <div class="error-message">
                ❌ {formError}
              </div>
            {/if}
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" on:click={cancelForm} disabled={formLoading}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" disabled={formLoading}>
                {#if formLoading}
                  <span class="spinner"></span>
                  {editingUser ? 'Updating...' : 'Creating...'}
                {:else}
                  {editingUser ? 'Update User' : 'Create User'}
                {/if}
              </button>
            </div>
          </form>
        </div>
      {:else}
        <!-- Users List -->
        <div class="users-section">
          <div class="section-header">
            <h3>Users in {clientServer.assigned_schema_name}</h3>
            <button class="btn btn-primary" on:click={handleCreateUser}>
              ➕ Add User
            </button>
          </div>
          
          {#if loading}
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading users...</p>
            </div>
          {:else if error}
            <div class="error">
              <p>{error}</p>
              <button class="btn btn-primary" on:click={loadUsers}>Retry</button>
            </div>
          {:else if users.length === 0}
            <div class="empty-state">
              <h4>No Users Found</h4>
              <p>This client server doesn't have any users yet.</p>
              <button class="btn btn-primary" on:click={handleCreateUser}>
                Create First User
              </button>
            </div>
          {:else}
            <div class="users-table">
              <div class="table-header">
                <div class="col-name">Name</div>
                <div class="col-email">Email</div>
                <div class="col-role">Role</div>
                <div class="col-created">Created</div>
                <div class="col-actions">Actions</div>
              </div>
              
              {#each users as user (user.user_id)}
                <div class="table-row">
                  <div class="col-name">
                    <div class="user-name">{user.name}</div>
                  </div>
                  <div class="col-email">
                    <div class="user-email">{user.email}</div>
                  </div>
                  <div class="col-role">
                    <span class="role-badge" style="background-color: {getRoleColor(user.role)}">
                      {user.role}
                    </span>
                  </div>
                  <div class="col-created">
                    {formatDate(user.created_at)}
                  </div>
                  <div class="col-actions">
                    <button 
                      class="btn-icon btn-edit"
                      on:click={() => handleEditUser(user)}
                      title="Edit user"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn-icon btn-delete"
                      on:click={() => handleDeleteUser(user)}
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #2c3e50;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #7f8c8d;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }
  
  .close-btn:hover {
    background: #f8f9fa;
  }
  
  .modal-content {
    padding: 1.5rem;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h3 {
    margin: 0;
    color: #2c3e50;
  }
  
  .loading, .error, .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .loading .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error {
    color: #e74c3c;
  }
  
  .empty-state h4 {
    color: #7f8c8d;
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: #95a5a6;
    margin-bottom: 1.5rem;
  }
  
  .users-table {
    border: 1px solid #e1e8ed;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .table-header, .table-row {
    display: grid;
    grid-template-columns: 2fr 2fr 1fr 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    align-items: center;
  }
  
  .table-header {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .table-row {
    border-bottom: 1px solid #f1f3f4;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row:hover {
    background: #f8f9fa;
  }
  
  .user-name {
    font-weight: 600;
    color: #2c3e50;
  }
  
  .user-email {
    color: #7f8c8d;
    font-size: 0.9rem;
  }
  
  .role-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .col-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-icon {
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .btn-icon:hover {
    background: #f8f9fa;
  }
  
  .btn-edit:hover {
    background: #e3f2fd;
  }
  
  .btn-delete:hover {
    background: #ffebee;
  }
  
  /* User Form Styles */
  .user-form {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .user-form h3 {
    margin: 0 0 1.5rem 0;
    color: #2c3e50;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .form-group label {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .form-group input,
  .form-group select {
    padding: 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }
  
  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  .form-group input:disabled,
  .form-group select:disabled {
    background: #f8f9fa;
    color: #6c757d;
  }
  
  .help-text {
    margin-top: 0.25rem;
    color: #6c757d;
    font-size: 0.875rem;
  }
  
  .error-message {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 6px;
    padding: 1rem;
    color: #c53030;
    margin-bottom: 1rem;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #2980b9, #21618c);
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @media (max-width: 768px) {
    .modal {
      margin: 1rem;
      max-height: calc(100vh - 2rem);
    }
    
    .table-header, .table-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    
    .table-header {
      display: none;
    }
    
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
    .col-role::before { content: "Role: "; font-weight: 600; }
    .col-created::before { content: "Created: "; font-weight: 600; }
    .col-actions::before { content: "Actions: "; font-weight: 600; }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
    }
  }
</style> 
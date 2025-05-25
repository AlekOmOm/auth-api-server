# Owner Panel Documentation

## Overview

The Owner Panel is a comprehensive management interface for client server owners and system administrators. It provides a centralized dashboard for managing client servers, users, and viewing analytics.

## Features

### 🏢 **Client Server Management**
- **View All Client Servers**: Display all client servers owned by the current user
- **Create New Client Servers**: Full-featured modal for creating new client applications
- **Edit Client Settings**: Modify client server configurations (except schema names)
- **Delete Client Servers**: Remove client servers with confirmation dialogs
- **Real-time Status**: Live status indicators for each client server

### 👥 **User Management**
- **CRUD Operations**: Complete user management within each client schema
- **Role Assignment**: Assign user roles (user, admin) within client applications
- **Bulk Operations**: Efficient management of multiple users
- **User Analytics**: View user statistics and activity metrics

### 📊 **Dashboard Analytics**
- **Real-time Statistics**: Live metrics for client servers, users, and sessions
- **Growth Tracking**: Month-over-month growth indicators
- **System Health**: Overall system status monitoring
- **Top Performers**: Identify most active client servers

## Access Control

### **Role-Based Access**
- **Owner Role**: Users who own client servers
- **Admin Role**: System administrators with full access
- **User Role**: Regular users (no access to owner panel)

### **Permission Levels**
```javascript
// Owner permissions
- Create/Edit/Delete own client servers
- Manage users within own client schemas
- View own analytics and statistics

// Admin permissions (inherits owner + additional)
- View all client servers
- Delete any client server
- System-wide configuration access
- Global analytics and monitoring
```

## Component Architecture

### **Main Components**

#### **OwnerPanel.svelte**
- **Purpose**: Main container and orchestrator
- **Responsibilities**:
  - Authentication and role verification
  - Data loading and state management
  - Modal coordination
  - Error handling and loading states

#### **ClientServerCard.svelte**
- **Purpose**: Individual client server display
- **Features**:
  - Client information display
  - Status indicators
  - Action buttons (Edit, Delete, Manage Users)
  - Responsive design

#### **OwnerStats.svelte**
- **Purpose**: Dashboard statistics display
- **Metrics**:
  - Total client servers
  - Total users across all schemas
  - Active sessions
  - Monthly login statistics
  - Growth indicators

#### **CreateClientModal.svelte**
- **Purpose**: Client server creation and editing
- **Features**:
  - Form validation
  - Schema name validation
  - URL validation
  - Client secret generation and display
  - Edit mode support

#### **UserManagementModal.svelte**
- **Purpose**: User CRUD operations within client schemas
- **Features**:
  - User listing with pagination
  - Create/Edit user forms
  - Role management
  - Delete confirmations
  - Responsive table design

## API Endpoints

### **Client Server Management**
```javascript
// Get user's client servers
GET /api/clientServer/user/clients

// Create new client server
POST /api/clientServer/user/register

// Update client server
PUT /api/clientServer/user/clients/:clientId

// Delete client server
DELETE /api/clientServer/user/clients/:clientId
```

### **User Management**
```javascript
// Get users in client schema
GET /api/owner/clients/:clientId/users

// Create user in client schema
POST /api/owner/clients/:clientId/users

// Update user in client schema
PUT /api/owner/clients/:clientId/users/:userId

// Delete user from client schema
DELETE /api/owner/clients/:clientId/users/:userId
```

### **Analytics**
```javascript
// Get owner statistics
GET /api/owner/stats
```

## Usage Examples

### **Accessing the Owner Panel**
```javascript
// Navigate to owner panel (requires owner/admin role)
window.location.href = '/owner';

// Or programmatically
import { navigate } from 'svelte-routing';
navigate('/owner');
```

### **Creating a Client Server**
1. Click "Create New Client Server" button
2. Fill in application details:
   - **Application Name**: Display name for your app
   - **Schema Name**: Database schema (lowercase, alphanumeric + underscores)
   - **Client Mode**: Frontend Login Proxy or API Auth Server
   - **Return URLs**: Allowed redirect URLs (one per line)
3. Submit form
4. **Important**: Save the generated client secret securely (shown only once)

### **Managing Users**
1. Click "Manage Users" on any client server card
2. View existing users in the client schema
3. Create new users with name, email, password, and role
4. Edit existing users (password optional for updates)
5. Delete users with confirmation

## Security Features

### **Input Validation**
- **Schema Names**: Regex validation for database safety
- **URLs**: Full URL validation for return URLs
- **Email**: Email format validation
- **Password**: Secure password requirements

### **Access Control**
- **Role Verification**: Server-side role checking
- **Ownership Validation**: Users can only manage their own client servers
- **Session Management**: Secure session handling

### **Data Protection**
- **Client Secrets**: Shown only once during creation
- **Password Hashing**: Secure password storage
- **SQL Injection Prevention**: Parameterized queries

## Responsive Design

### **Desktop (1200px+)**
- Grid layout for client server cards
- Full-width modals with side-by-side forms
- Comprehensive table views

### **Tablet (768px - 1199px)**
- Responsive grid adjustments
- Stacked form layouts
- Condensed table views

### **Mobile (< 768px)**
- Single column layouts
- Full-screen modals
- Card-based user listings
- Touch-friendly buttons

## Error Handling

### **Network Errors**
- Automatic retry mechanisms
- User-friendly error messages
- Graceful degradation

### **Validation Errors**
- Real-time form validation
- Clear error messaging
- Field-specific error indicators

### **Permission Errors**
- Access denied screens
- Redirect to appropriate pages
- Clear permission requirements

## Performance Optimizations

### **Data Loading**
- Lazy loading of user data
- Efficient API calls
- Caching strategies

### **UI Performance**
- Virtual scrolling for large user lists
- Debounced search inputs
- Optimized re-renders

## Integration with Auth System

### **Schema Detection**
The owner panel integrates seamlessly with the auth system's schema detection:

```javascript
// Automatic role detection
if (userRole === 'owner' || userRole === 'admin') {
  // Grant access to owner panel
  // Load client servers and statistics
}
```

### **Multi-tenant Support**
- Each client server has its own database schema
- Users are isolated within their respective schemas
- Cross-schema operations are prevented

## Future Enhancements

### **Planned Features**
- **Advanced Analytics**: Detailed usage metrics and charts
- **Bulk User Operations**: Import/export user data
- **API Key Management**: Generate and manage API keys
- **Audit Logs**: Track all administrative actions
- **Email Templates**: Customize user invitation emails
- **Backup Management**: Schema backup and restore functionality

### **Scalability Improvements**
- **Pagination**: Handle large numbers of client servers
- **Search and Filtering**: Advanced search capabilities
- **Real-time Updates**: WebSocket integration for live updates
- **Caching**: Redis integration for improved performance

## Troubleshooting

### **Common Issues**

#### **Access Denied**
- **Cause**: User doesn't have owner/admin role
- **Solution**: Ensure user owns client servers or has admin privileges

#### **Client Server Creation Fails**
- **Cause**: Schema name conflicts or invalid format
- **Solution**: Use unique, valid schema names (lowercase, alphanumeric + underscores)

#### **User Management Not Loading**
- **Cause**: Client schema doesn't exist or permission issues
- **Solution**: Verify client server exists and user has ownership

#### **Statistics Not Displaying**
- **Cause**: Backend statistics endpoint not available
- **Solution**: Non-critical feature, panel works without statistics

## Development Notes

### **Component Dependencies**
```javascript
// Required Svelte packages
import { onMount } from 'svelte';
import { createEventDispatcher } from 'svelte';

// Required stores
import { authStore } from '../../stores/authStore.js';

// Required routing
import { navigate } from 'svelte-routing';
```

### **Backend Requirements**
- Owner statistics endpoint (`/api/owner/stats`)
- User management endpoints (`/api/owner/clients/:clientId/users/*`)
- Proper role-based access control middleware
- Schema detection and pool management

### **Testing Considerations**
- Role-based access testing
- Form validation testing
- Modal interaction testing
- Responsive design testing
- Error state testing

---

**Last Updated**: January 25, 2025  
**Version**: 1.0.0  
**Status**: Production Ready 🚀

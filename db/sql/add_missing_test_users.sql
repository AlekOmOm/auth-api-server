-- Add missing test users for frontend tests
-- Password for user@example.com will be 'password123' (same hash as testuser@example.com)

INSERT INTO auth_internal.users (name, email, role, password_hash) VALUES
('Test User', 'user@example.com', 'user', '$2b$10$m1dt2SsxozmshCLzBfVtceHYhArMLG.QNx6FmZGPzCjqkcxcttubG')
ON CONFLICT (email) DO NOTHING; 
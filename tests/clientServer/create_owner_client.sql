INSERT INTO client_servers (
    client_id, 
    client_secret_hash, 
    app_name, 
    assigned_schema_name, 
    allowed_return_urls, 
    user_id, 
    client_mode
) VALUES (
    'test-client-001', 
    'hashed-secret', 
    'Test App for Owner3', 
    'test_schema', 
    ARRAY['http://localhost:3000', 'http://localhost:5173'], 
    'fab6cbc8-d5af-4c07-9b74-b28b04963e8a', 
    'development'
);

-- Verify the insert
SELECT cs.client_id, cs.app_name, u.email as owner_email 
FROM client_servers cs 
JOIN auth_internal.users u ON cs.user_id = u.id 
WHERE u.email = 'owner3@mail.com'; 
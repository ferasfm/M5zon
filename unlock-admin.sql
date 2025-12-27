-- فك قفل حساب admin
UPDATE users 
SET failed_login_attempts = 0, 
    locked_until = NULL 
WHERE username = 'admin';

SELECT username, failed_login_attempts, locked_until, is_active 
FROM users 
WHERE username = 'admin';

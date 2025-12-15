-- جدول إعادة تعيين كلمة المرور
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- دالة لحذف الرموز المنتهية تلقائياً
CREATE OR REPLACE FUNCTION delete_expired_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_resets 
    WHERE expires_at < NOW() OR (used = TRUE AND used_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- تعليقات
COMMENT ON TABLE password_resets IS 'رموز إعادة تعيين كلمة المرور';
COMMENT ON COLUMN password_resets.reset_token IS 'الرمز المستخدم لإعادة التعيين';
COMMENT ON COLUMN password_resets.expires_at IS 'تاريخ انتهاء صلاحية الرمز (عادة 1 ساعة)';

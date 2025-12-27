-- ========================================
-- جدول تاريخ أسعار الموردين
-- ========================================

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS supplier_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    change_reason TEXT,
    changed_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_supplier_product ON supplier_price_history(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_product ON supplier_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_supplier ON supplier_price_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_date ON supplier_price_history(created_at);

-- التعليقات
COMMENT ON TABLE supplier_price_history IS 'تاريخ تغييرات أسعار الموردين';
COMMENT ON COLUMN supplier_price_history.supplier_product_id IS 'معرف سعر المورد';
COMMENT ON COLUMN supplier_price_history.old_price IS 'السعر القديم';
COMMENT ON COLUMN supplier_price_history.new_price IS 'السعر الجديد';
COMMENT ON COLUMN supplier_price_history.change_reason IS 'سبب التغيير';
COMMENT ON COLUMN supplier_price_history.changed_by IS 'من قام بالتغيير';

-- دالة لتسجيل تغييرات الأسعار تلقائياً
CREATE OR REPLACE FUNCTION log_supplier_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- عند التحديث فقط
    IF TG_OP = 'UPDATE' AND OLD.price != NEW.price THEN
        INSERT INTO supplier_price_history (
            supplier_product_id,
            product_id,
            supplier_id,
            old_price,
            new_price,
            change_reason
        ) VALUES (
            NEW.id,
            NEW.product_id,
            NEW.supplier_id,
            OLD.price,
            NEW.price,
            'تحديث تلقائي'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتسجيل التغييرات
DROP TRIGGER IF EXISTS trigger_log_supplier_price_change ON supplier_products;
CREATE TRIGGER trigger_log_supplier_price_change
    AFTER UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION log_supplier_price_change();

-- عرض النتائج
SELECT 
    'تم إنشاء جدول supplier_price_history بنجاح' as message,
    COUNT(*) as total_records
FROM supplier_price_history;

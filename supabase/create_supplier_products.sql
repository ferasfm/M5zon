-- ========================================
-- جدول أسعار المنتجات حسب الموردين
-- ========================================

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    is_preferred BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_preferred ON supplier_products(is_preferred) WHERE is_preferred = true;

-- التعليقات
COMMENT ON TABLE supplier_products IS 'أسعار المنتجات حسب الموردين';
COMMENT ON COLUMN supplier_products.product_id IS 'معرف المنتج';
COMMENT ON COLUMN supplier_products.supplier_id IS 'معرف المورد';
COMMENT ON COLUMN supplier_products.price IS 'سعر المنتج من هذا المورد';
COMMENT ON COLUMN supplier_products.is_preferred IS 'هل هذا المورد هو المفضل لهذا المنتج؟';
COMMENT ON COLUMN supplier_products.notes IS 'ملاحظات إضافية';

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_supplier_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS trigger_update_supplier_products_updated_at ON supplier_products;
CREATE TRIGGER trigger_update_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_products_updated_at();

-- دالة للتأكد من وجود مورد مفضل واحد فقط لكل منتج
CREATE OR REPLACE FUNCTION ensure_single_preferred_supplier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_preferred = true THEN
        -- إزالة التفضيل من الموردين الآخرين لنفس المنتج
        UPDATE supplier_products
        SET is_preferred = false
        WHERE product_id = NEW.product_id
          AND supplier_id != NEW.supplier_id
          AND is_preferred = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger للتأكد من مورد مفضل واحد فقط
DROP TRIGGER IF EXISTS trigger_ensure_single_preferred_supplier ON supplier_products;
CREATE TRIGGER trigger_ensure_single_preferred_supplier
    BEFORE INSERT OR UPDATE ON supplier_products
    FOR EACH ROW
    WHEN (NEW.is_preferred = true)
    EXECUTE FUNCTION ensure_single_preferred_supplier();

-- ========================================
-- نقل البيانات الموجودة (إذا كانت موجودة)
-- ========================================

-- ملاحظة: هذا الجزء اختياري ويعتمد على هيكل جدول products الحالي
-- إذا كان جدول products يحتوي على supplier_id، سيتم نقل البيانات
-- إذا لم يكن موجوداً، سيتم تجاهل هذا الجزء

DO $$
BEGIN
    -- التحقق من وجود عمود supplier_id في جدول products
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
          AND column_name = 'supplier_id'
    ) THEN
        -- نقل البيانات إذا كان العمود موجوداً
        INSERT INTO supplier_products (product_id, supplier_id, price, is_preferred)
        SELECT 
            p.id as product_id,
            p.supplier_id,
            COALESCE(p.price, 0) as price,
            true as is_preferred
        FROM products p
        WHERE p.supplier_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM supplier_products sp 
            WHERE sp.product_id = p.id 
              AND sp.supplier_id = p.supplier_id
          )
        ON CONFLICT (product_id, supplier_id) DO NOTHING;
        
        RAISE NOTICE 'تم نقل البيانات من جدول products';
    ELSE
        RAISE NOTICE 'جدول products لا يحتوي على supplier_id، تم تجاهل نقل البيانات';
    END IF;
END $$;

-- ========================================
-- عرض النتائج
-- ========================================

SELECT 
    'تم إنشاء جدول supplier_products بنجاح' as message,
    COUNT(*) as total_records
FROM supplier_products;

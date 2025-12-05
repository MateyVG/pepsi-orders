-- =====================================================
-- PEPSI ORDER SYSTEM - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('restaurant', 'admin', 'supplier')),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PRODUCT CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    category VARCHAR(100),
    price_per_stack DECIMAL(10, 2) NOT NULL,
    items_per_stack INTEGER DEFAULT 12,
    unit VARCHAR(50) DEFAULT 'стек',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled')),
    total_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_stack DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EMAIL SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    primary_recipients TEXT[] DEFAULT ARRAY['foods_op@aladin.bg'],
    cc_recipients TEXT[] DEFAULT ARRAY['matey.georgiev@aladin.bg'],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default email settings
INSERT INTO email_settings (primary_recipients, cc_recipients) 
VALUES (ARRAY['foods_op@aladin.bg'], ARRAY['matey.georgiev@aladin.bg'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- DELIVERY SCHEDULES TABLE (Разрешени дни за доставка)
-- =====================================================
-- Позволява на доставчика да задава кои дни от седмицата
-- са разрешени за доставка за всеки ресторант
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    -- Дни от седмицата (0=Неделя, 1=Понеделник, ... 6=Събота)
    allowed_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- По подразбиране: Пон-Пет
    -- Минимални дни предварително за поръчка
    min_days_ahead INTEGER DEFAULT 1,
    -- Максимални дни напред за поръчка
    max_days_ahead INTEGER DEFAULT 14,
    -- Специфични забранени дати (празници и т.н.)
    blocked_dates DATE[] DEFAULT ARRAY[]::DATE[],
    -- Бележки
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(restaurant_id)
);

-- Enable RLS on delivery_schedules
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_schedules
CREATE POLICY "Everyone can view delivery schedules" ON delivery_schedules
    FOR SELECT USING (true);

CREATE POLICY "Admins and suppliers can manage delivery schedules" ON delivery_schedules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'supplier'))
    );

-- Trigger for updated_at
CREATE TRIGGER update_delivery_schedules_updated_at BEFORE UPDATE ON delivery_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT PRODUCT CATEGORIES
-- =====================================================
INSERT INTO product_categories (name, sort_order) VALUES
    ('Пепси 0.5л', 1),
    ('Пепси 2л', 2),
    ('Вода', 3),
    ('Присан 0.5л', 4),
    ('Липтън 0.5л', 5),
    ('Кенчета 0.33л', 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERT DEFAULT PRODUCTS (from the provided list)
-- =====================================================
INSERT INTO products (code, name, category, price_per_stack, items_per_stack, sort_order) VALUES
    -- 0.5L Products
    ('123017', 'ПЕПСИ КОЛА 0.500 Л (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 1),
    ('123877', 'СЕВЪН UP БЕЗ ЗАХАР 0.500 Л NP (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 2),
    ('123738', 'ПЕПСИ ЗЕРО 0.5 Л NP (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 3),
    ('1231997', 'МИРИНДА ОРИНДЖ 0.500 Л (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 4),
    ('123807', 'МИРИНДА ЯГОДА И ЛИЧИ 0.5Л (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 5),
    ('123497', 'ПЕПСИ ТУИСТ 0.5 Л NP (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 6),
    ('123739', 'ПЕПСИ ЕЛЕКТРИК ЗЕРО ПЕТ 12 x 0.5Л (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 7),
    ('123809', 'МИРИНДА РОЗОВ ГРЕЙПФРУТ ПЕТ 12 x 0.5Л (12 броя в стек)', 'Пепси 0.5л', 15.55, 12, 8),
    
    -- 2L Products
    ('12605', 'ПЕПСИ КОЛА 2.0 Л (6 броя в стек)', 'Пепси 2л', 12.25, 6, 10),
    ('12695', 'ПЕПСИ ЗЕРО 2 Л (6 броя в стек)', 'Пепси 2л', 12.25, 6, 11),
    ('12687', 'СЕВЪН UP БЕЗ ЗАХАР 2.000 Л (6 броя в стек)', 'Пепси 2л', 12.25, 6, 12),
    ('126233', 'МИРИНДА ОРИНДЖ 2.0 Л (6 броя в стек)', 'Пепси 2л', 12.25, 6, 13),
    
    -- Water
    ('46351', 'МИН.ВОДА ГОРНА БАНЯ 0.500 Л (12 броя в стек)', 'Вода', 6.62, 12, 20),
    
    -- Prisan 0.5L
    ('223207', 'ПРИСАН ПОРТОКАЛ 0.5 Л NP (12 броя в стек)', 'Присан 0.5л', 12.82, 12, 30),
    ('223247', 'ПРИСАН ЯБЪЛКА 0.5 Л - ПЛ.НАП NP (12 броя в стек)', 'Присан 0.5л', 12.82, 12, 31),
    
    -- Lipton 0.5L
    ('35101', 'ЛИПТЪН СТУДЕН ЧАЙ ПРАСКОВА 0.5 Л (12 броя в стек)', 'Липтън 0.5л', 14.88, 12, 40),
    ('35102', 'ЛИПТЪН СТУДЕН ЧАЙ ЛИМОН 0.5 Л (12 броя в стек)', 'Липтън 0.5л', 14.88, 12, 41),
    
    -- Cans 0.33L
    ('13204', 'ПЕПСИ КОЛА 0.33 Л SLEEK x 24 S (24бр в стек)', 'Кенчета 0.33л', 27.36, 24, 50),
    ('132102', 'СЕВЪН ЪП КЕН 24 x 0.33Л БЗ (24бр в стек)', 'Кенчета 0.33л', 27.36, 24, 51),
    ('13222', 'МИРИНДА ПОРТОКАЛ КЕН 24 x 0.33Л (24бр в стек)', 'Кенчета 0.33л', 27.36, 24, 52),
    ('132734', 'ПЕПСИ ЗЕРО КЕН 24 x 0.33Л (24бр в стек)', 'Кенчета 0.33л', 27.36, 24, 53)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    price_per_stack = EXCLUDED.price_per_stack,
    items_per_stack = EXCLUDED.items_per_stack,
    sort_order = EXCLUDED.sort_order;

-- =====================================================
-- INSERT SAMPLE RESTAURANTS
-- =====================================================
INSERT INTO restaurants (name, code, address) VALUES
    ('Aladin Foods - Център', 'AF001', 'бул. Витоша 100, София'),
    ('Aladin Foods - Младост', 'AF002', 'ж.к. Младост 4, София'),
    ('Aladin Foods - Люлин', 'AF003', 'ж.к. Люлин 10, София'),
    ('Aladin Foods - Пловдив Център', 'AF004', 'ул. Княз Александър I 50, Пловдив'),
    ('Aladin Foods - Варна', 'AF005', 'бул. Сливница 200, Варна')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Products policies (everyone can view active products)
CREATE POLICY "Everyone can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Restaurants policies
CREATE POLICY "Everyone can view active restaurants" ON restaurants
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage restaurants" ON restaurants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Orders policies
CREATE POLICY "Restaurant users can view own orders" ON orders
    FOR SELECT USING (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant users can create orders" ON orders
    FOR INSERT WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Admins and suppliers can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'supplier'))
    );

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Suppliers can update order status" ON orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'supplier')
    );

-- Order items policies
CREATE POLICY "Users can view order items for accessible orders" ON order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE 
                restaurant_id IN (SELECT restaurant_id FROM users WHERE auth_id = auth.uid())
                OR EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'supplier'))
        )
    );

CREATE POLICY "Users can insert order items" ON order_items
    FOR INSERT WITH CHECK (
        order_id IN (
            SELECT id FROM orders WHERE 
                restaurant_id IN (SELECT restaurant_id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Email settings policies
CREATE POLICY "Admins can manage email settings" ON email_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- Product categories policies
CREATE POLICY "Everyone can view categories" ON product_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update order total when items change
CREATE TRIGGER update_order_total AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION calculate_order_total();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for orders with restaurant name and user name
CREATE OR REPLACE VIEW orders_view AS
SELECT 
    o.*,
    r.name as restaurant_name,
    r.code as restaurant_code,
    u.name as created_by_name,
    cu.name as confirmed_by_name
FROM orders o
LEFT JOIN restaurants r ON o.restaurant_id = r.id
LEFT JOIN users u ON o.created_by = u.id
LEFT JOIN users cu ON o.confirmed_by = cu.id;

-- View for order items with product details
CREATE OR REPLACE VIEW order_items_view AS
SELECT 
    oi.*,
    p.category,
    p.items_per_stack
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);

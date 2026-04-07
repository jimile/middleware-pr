// ──────────────────────────────────────────────────────────────
// Product routes — list, edit, create, delete, toggle active
// EVERY query filters platform = 'uniforms'.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// Garment family options for dropdowns
const GARMENT_FAMILIES = [
  'accessories', 'belt', 'corporate', 'crew', 'headwear', 'healthcare',
  'hoodie', 'jacket', 'pants', 'polo', 'scrubs', 'shirt', 'shorts',
  'tee', 'trades', 'vest'
];

// ── Helpers ──────────────────────────────────────────────────

// Load brands for uniforms platform
async function loadBrands() {
  const { data } = await supabase
    .from('brands')
    .select('id, name')
    .eq('platform', 'uniforms')
    .order('name');
  return data || [];
}

// Load categories for uniforms platform
async function loadCategories() {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('platform', 'uniforms')
    .order('name');
  return data || [];
}

// ── GET /products — List with search, filter, pagination ─────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 25;
    const offset = (page - 1) * perPage;

    // Build query
    let query = supabase
      .from('products')
      .select('id, name, sku, supplier_code, base_cost, is_active, image_url, garment_family, brands(name), categories(name)', { count: 'exact' })
      .eq('platform', 'uniforms')
      .order('name')
      .range(offset, offset + perPage - 1);

    // Search by name
    const search = (req.query.search || '').trim();
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Filter by brand
    if (req.query.brand_id) {
      query = query.eq('brand_id', req.query.brand_id);
    }

    // Filter by category
    if (req.query.category_id) {
      query = query.eq('category_id', req.query.category_id);
    }

    // Filter by active status
    if (req.query.active === 'true') {
      query = query.eq('is_active', true);
    } else if (req.query.active === 'false') {
      query = query.eq('is_active', false);
    }

    const [{ data: products, count, error }, brands, categories] = await Promise.all([
      query,
      loadBrands(),
      loadCategories()
    ]);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / perPage);

    res.render('products/index', {
      title: 'Products',
      products: products || [],
      brands,
      categories,
      search,
      filters: {
        brand_id: req.query.brand_id || '',
        category_id: req.query.category_id || '',
        active: req.query.active || ''
      },
      page,
      totalPages,
      totalCount: count || 0,
      body: '' // layout compatibility
    });
  } catch (err) {
    console.error('Product list error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load products.' };
    res.render('products/index', {
      title: 'Products',
      products: [],
      brands: [],
      categories: [],
      search: '',
      filters: { brand_id: '', category_id: '', active: '' },
      page: 1,
      totalPages: 0,
      totalCount: 0,
      body: ''
    });
  }
});

// ── POST /products/:id/toggle-active ─────────────────────────
router.post('/:id/toggle-active', async (req, res) => {
  try {
    // Fetch current state (verify platform)
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, is_active')
      .eq('id', req.params.id)
      .eq('platform', 'uniforms')
      .single();

    if (fetchErr || !product) throw new Error('Product not found');

    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', req.params.id)
      .eq('platform', 'uniforms');

    if (error) throw error;

    req.session.flash = { type: 'success', message: `Product ${product.is_active ? 'deactivated' : 'activated'}.` };
  } catch (err) {
    console.error('Toggle active error:', err);
    req.session.flash = { type: 'error', message: 'Failed to toggle active status.' };
  }
  // Redirect back preserving query params
  res.redirect(req.headers.referer || '/products');
});

// ── GET /products/new ────────────────────────────────────────
router.get('/new', async (req, res) => {
  try {
    const [brands, categories] = await Promise.all([loadBrands(), loadCategories()]);
    res.render('products/new', {
      title: 'New Product',
      product: {},
      brands,
      categories,
      garmentFamilies: GARMENT_FAMILIES,
      errors: {},
      body: ''
    });
  } catch (err) {
    console.error('New product form error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load form.' };
    res.redirect('/products');
  }
});

// ── POST /products — Create new product ──────────────────────
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const errors = {};

    // Validate required fields
    if (!b.name || !b.name.trim()) errors.name = 'Name is required';
    if (!b.brand_id) errors.brand_id = 'Brand is required';
    if (!b.category_id) errors.category_id = 'Category is required';

    // Validate specs JSON if provided
    let specs = null;
    if (b.specs && b.specs.trim()) {
      try {
        specs = JSON.parse(b.specs);
      } catch {
        errors.specs = 'Invalid JSON';
      }
    }

    if (Object.keys(errors).length > 0) {
      const [brands, categories] = await Promise.all([loadBrands(), loadCategories()]);
      return res.render('products/new', {
        title: 'New Product',
        product: b,
        brands,
        categories,
        garmentFamilies: GARMENT_FAMILIES,
        errors,
        body: ''
      });
    }

    // Parse industry from comma-separated string to array
    const industry = b.industry
      ? b.industry.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: b.name.trim(),
        sku: b.sku || null,
        supplier_code: b.supplier_code || null,
        description: b.description || null,
        brand_id: b.brand_id,
        category_id: b.category_id,
        garment_family: b.garment_family || null,
        industry,
        base_cost: b.base_cost ? parseFloat(b.base_cost) : null,
        markup_pct: b.markup_pct ? parseFloat(b.markup_pct) : 0,
        decoration_eligible: b.decoration_eligible === 'on',
        decoration_price: b.decoration_price ? parseFloat(b.decoration_price) : 0,
        specs,
        safety_standard: b.safety_standard || null,
        moq: b.moq ? parseInt(b.moq) : 24,
        lead_time_days: b.lead_time_days ? parseInt(b.lead_time_days) : 14,
        sizing_type: b.sizing_type || 'multi_size',
        platform: 'uniforms',  // ALWAYS set
        is_active: false        // New products start inactive
      })
      .select('id')
      .single();

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Product created successfully.' };
    res.redirect(`/products/${data.id}/edit`);
  } catch (err) {
    console.error('Create product error:', err);
    req.session.flash = { type: 'error', message: 'Failed to create product: ' + err.message };
    res.redirect('/products/new');
  }
});

// ── GET /products/:id/edit ───────────────────────────────────
router.get('/:id/edit', async (req, res) => {
  try {
    const [{ data: product, error }, brands, categories] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('id', req.params.id)
        .eq('platform', 'uniforms')
        .single(),
      loadBrands(),
      loadCategories()
    ]);

    if (error || !product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    res.render('products/edit', {
      title: 'Edit: ' + product.name,
      product,
      brands,
      categories,
      garmentFamilies: GARMENT_FAMILIES,
      errors: {},
      body: ''
    });
  } catch (err) {
    console.error('Edit form error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load product.' };
    res.redirect('/products');
  }
});

// ── POST /products/:id — Update product ──────────────────────
router.post('/:id', async (req, res) => {
  try {
    const b = req.body;
    const errors = {};

    // Validate required fields
    if (!b.name || !b.name.trim()) errors.name = 'Name is required';
    if (!b.brand_id) errors.brand_id = 'Brand is required';
    if (!b.category_id) errors.category_id = 'Category is required';

    // Validate specs JSON if provided
    let specs = null;
    if (b.specs && b.specs.trim()) {
      try {
        specs = JSON.parse(b.specs);
      } catch {
        errors.specs = 'Invalid JSON';
      }
    }

    if (Object.keys(errors).length > 0) {
      const [brands, categories] = await Promise.all([loadBrands(), loadCategories()]);
      return res.render('products/edit', {
        title: 'Edit Product',
        product: { ...b, id: req.params.id },
        brands,
        categories,
        garmentFamilies: GARMENT_FAMILIES,
        errors,
        body: ''
      });
    }

    // Parse industry from comma-separated string to array
    const industry = b.industry
      ? b.industry.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const { error } = await supabase
      .from('products')
      .update({
        name: b.name.trim(),
        sku: b.sku || null,
        supplier_code: b.supplier_code || null,
        description: b.description || null,
        brand_id: b.brand_id,
        category_id: b.category_id,
        garment_family: b.garment_family || null,
        industry,
        base_cost: b.base_cost ? parseFloat(b.base_cost) : null,
        markup_pct: b.markup_pct ? parseFloat(b.markup_pct) : 0,
        decoration_eligible: b.decoration_eligible === 'on',
        decoration_price: b.decoration_price ? parseFloat(b.decoration_price) : 0,
        specs,
        safety_standard: b.safety_standard || null,
        moq: b.moq ? parseInt(b.moq) : 24,
        lead_time_days: b.lead_time_days ? parseInt(b.lead_time_days) : 14,
        sizing_type: b.sizing_type || 'multi_size'
      })
      .eq('id', req.params.id)
      .eq('platform', 'uniforms');  // Safety: only update uniforms products

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Product updated successfully.' };
    res.redirect(`/products/${req.params.id}/edit`);
  } catch (err) {
    console.error('Update product error:', err);
    req.session.flash = { type: 'error', message: 'Failed to update product: ' + err.message };
    res.redirect(`/products/${req.params.id}/edit`);
  }
});

// ── POST /products/:id/delete ────────────────────────────────
router.post('/:id/delete', async (req, res) => {
  try {
    const id = req.params.id;

    // Verify product belongs to uniforms platform
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('platform', 'uniforms')
      .single();

    if (fetchErr || !product) {
      req.session.flash = { type: 'error', message: 'Product not found or not a uniforms product.' };
      return res.redirect('/products');
    }

    // Cascade delete related records, then the product
    await Promise.all([
      supabase.from('product_color_swatches').delete().eq('product_id', id),
      supabase.from('sizes').delete().eq('product_id', id),
      supabase.from('product_images').delete().eq('product_id', id),
      supabase.from('product_pricing_tiers').delete().eq('product_id', id)
    ]);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('platform', 'uniforms');

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Product deleted.' };
    res.redirect('/products');
  } catch (err) {
    console.error('Delete product error:', err);
    req.session.flash = { type: 'error', message: 'Failed to delete product: ' + err.message };
    res.redirect('/products');
  }
});

module.exports = router;

// ─────────────────────────────────────────────────────────���────
// Size routes — CRUD for sizes table
// Mounted at /products, so paths are /:id/sizes/...
// ─────────���──────────��─────────────────────────────────────────

const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// Standard sizes for quick-add buttons
const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// Helper: verify product belongs to uniforms platform
async function getUniformsProduct(id) {
  const { data } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', id)
    .eq('platform', 'uniforms')
    .single();
  return data;
}

// ── GET /products/:id/sizes ──────────────────────────────────
router.get('/:id/sizes', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { data: sizes } = await supabase
      .from('sizes')
      .select('*')
      .eq('product_id', product.id)
      .order('order_index');

    res.render('sizes/manage', {
      title: 'Sizes: ' + product.name,
      product,
      sizes: sizes || [],
      standardSizes: STANDARD_SIZES
    });
  } catch (err) {
    console.error('Sizes list error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load sizes.' };
    res.redirect('/products');
  }
});

// ── POST /products/:id/sizes — Add size ──────────────────────
router.post('/:id/sizes', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { label, order_index } = req.body;

    // Auto-calculate order_index if not provided
    let idx = order_index ? parseInt(order_index) : null;
    if (!idx) {
      const { data: existing } = await supabase
        .from('sizes')
        .select('order_index')
        .eq('product_id', product.id)
        .order('order_index', { ascending: false })
        .limit(1);
      idx = existing && existing.length > 0 ? existing[0].order_index + 1 : 1;
    }

    const { error } = await supabase
      .from('sizes')
      .insert({
        product_id: product.id,
        label: label || 'One Size',
        order_index: idx
      });

    if (error) throw error;

    req.session.flash = { type: 'success', message: `Size "${label}" added.` };
  } catch (err) {
    console.error('Add size error:', err);
    req.session.flash = { type: 'error', message: 'Failed to add size.' };
  }
  res.redirect(`/products/${req.params.id}/sizes`);
});

// ���─ POST /products/:id/sizes/quick-add — Add standard sizes ──
router.post('/:id/sizes/quick-add', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    // Get existing sizes to avoid duplicates
    const { data: existing } = await supabase
      .from('sizes')
      .select('label')
      .eq('product_id', product.id);

    const existingLabels = new Set((existing || []).map(s => s.label));
    const maxIndex = existing && existing.length > 0
      ? Math.max(...(await supabase.from('sizes').select('order_index').eq('product_id', product.id).then(r => (r.data || []).map(s => s.order_index))))
      : 0;

    // Only add sizes that don't already exist
    const toAdd = STANDARD_SIZES
      .filter(s => !existingLabels.has(s))
      .map((label, i) => ({
        product_id: product.id,
        label,
        order_index: maxIndex + i + 1
      }));

    if (toAdd.length > 0) {
      const { error } = await supabase.from('sizes').insert(toAdd);
      if (error) throw error;
      req.session.flash = { type: 'success', message: `Added ${toAdd.length} sizes.` };
    } else {
      req.session.flash = { type: 'success', message: 'All standard sizes already exist.' };
    }
  } catch (err) {
    console.error('Quick-add sizes error:', err);
    req.session.flash = { type: 'error', message: 'Failed to add sizes.' };
  }
  res.redirect(`/products/${req.params.id}/sizes`);
});

// ── POST /products/:id/sizes/:sizeId/delete ──────────────────
router.post('/:id/sizes/:sizeId/delete', async (req, res) => {
  try {
    const { error } = await supabase
      .from('sizes')
      .delete()
      .eq('id', parseInt(req.params.sizeId))
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Size deleted.' };
  } catch (err) {
    console.error('Delete size error:', err);
    req.session.flash = { type: 'error', message: 'Failed to delete size.' };
  }
  res.redirect(`/products/${req.params.id}/sizes`);
});

module.exports = router;

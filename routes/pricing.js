// ─────────���────────────────────────────────────────────────────
// Pricing tier routes — CRUD for product_pricing_tiers
// Mounted at /products, so paths are /:id/pricing/...
// ───────────────────────────────────────���──────────────────────

const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

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

// ── GET /products/:id/pricing ──────────��─────────────────────
router.get('/:id/pricing', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { data: tiers } = await supabase
      .from('product_pricing_tiers')
      .select('*')
      .eq('product_id', product.id)
      .order('min_quantity');

    res.render('pricing/manage', {
      title: 'Pricing: ' + product.name,
      product,
      tiers: tiers || []
    });
  } catch (err) {
    console.error('Pricing list error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load pricing tiers.' };
    res.redirect('/products');
  }
});

// ── POST /products/:id/pricing — Add tier ────────────────────
router.post('/:id/pricing', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { min_quantity, max_quantity, unit_price, currency } = req.body;

    if (!min_quantity || !unit_price) {
      req.session.flash = { type: 'error', message: 'Min quantity and unit price are required.' };
      return res.redirect(`/products/${req.params.id}/pricing`);
    }

    const { error } = await supabase
      .from('product_pricing_tiers')
      .insert({
        product_id: product.id,
        min_quantity: parseInt(min_quantity),
        max_quantity: max_quantity ? parseInt(max_quantity) : null,
        unit_price: parseFloat(unit_price),
        currency: currency || 'NZD',
        tier_level: 1,
        is_active: true
      });

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Pricing tier added.' };
  } catch (err) {
    console.error('Add pricing tier error:', err);
    req.session.flash = { type: 'error', message: 'Failed to add pricing tier.' };
  }
  res.redirect(`/products/${req.params.id}/pricing`);
});

// ── POST /products/:id/pricing/:tierId/update ────────────────
router.post('/:id/pricing/:tierId/update', async (req, res) => {
  try {
    const { min_quantity, max_quantity, unit_price, currency, is_active } = req.body;

    const { error } = await supabase
      .from('product_pricing_tiers')
      .update({
        min_quantity: parseInt(min_quantity),
        max_quantity: max_quantity ? parseInt(max_quantity) : null,
        unit_price: parseFloat(unit_price),
        currency: currency || 'NZD',
        is_active: is_active === 'on'
      })
      .eq('id', req.params.tierId)
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Pricing tier updated.' };
  } catch (err) {
    console.error('Update pricing tier error:', err);
    req.session.flash = { type: 'error', message: 'Failed to update pricing tier.' };
  }
  res.redirect(`/products/${req.params.id}/pricing`);
});

// ── POST /products/:id/pricing/:tierId/delete ──��─────────────
router.post('/:id/pricing/:tierId/delete', async (req, res) => {
  try {
    const { error } = await supabase
      .from('product_pricing_tiers')
      .delete()
      .eq('id', req.params.tierId)
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Pricing tier deleted.' };
  } catch (err) {
    console.error('Delete pricing tier error:', err);
    req.session.flash = { type: 'error', message: 'Failed to delete pricing tier.' };
  }
  res.redirect(`/products/${req.params.id}/pricing`);
});

module.exports = router;

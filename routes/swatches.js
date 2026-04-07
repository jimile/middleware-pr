// ─────────────────────────────────────────────��────────────────
// Color swatch routes — CRUD for product_color_swatches
// Mounted at /products, so paths are /:id/swatches/...
// ────────────────────────────────��─────────────────────────────

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

// ── GET /products/:id/swatches ─────────���─────────────────────
router.get('/:id/swatches', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { data: swatches } = await supabase
      .from('product_color_swatches')
      .select('*')
      .eq('product_id', product.id)
      .order('position');

    res.render('swatches/manage', {
      title: 'Colors: ' + product.name,
      product,
      swatches: swatches || []
    });
  } catch (err) {
    console.error('Swatches list error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load swatches.' };
    res.redirect('/products');
  }
});

// ── POST /products/:id/swatches — Add swatch ────────────────
router.post('/:id/swatches', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { label, hex, image_url, position } = req.body;

    const { error } = await supabase
      .from('product_color_swatches')
      .insert({
        product_id: product.id,
        label: label || 'Unnamed',
        hex: hex || '#000000',
        image_url: image_url || null,
        position: position ? parseInt(position) : 0,
        is_active: true
      });

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Swatch added.' };
  } catch (err) {
    console.error('Add swatch error:', err);
    req.session.flash = { type: 'error', message: 'Failed to add swatch.' };
  }
  res.redirect(`/products/${req.params.id}/swatches`);
});

// ── POST /products/:id/swatches/:swatchId/update ─────────────
router.post('/:id/swatches/:swatchId/update', async (req, res) => {
  try {
    const { label, hex, image_url, position, is_active } = req.body;

    const { error } = await supabase
      .from('product_color_swatches')
      .update({
        label: label || 'Unnamed',
        hex: hex || '#000000',
        image_url: image_url || null,
        position: position ? parseInt(position) : 0,
        is_active: is_active === 'on'
      })
      .eq('id', req.params.swatchId)
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Swatch updated.' };
  } catch (err) {
    console.error('Update swatch error:', err);
    req.session.flash = { type: 'error', message: 'Failed to update swatch.' };
  }
  res.redirect(`/products/${req.params.id}/swatches`);
});

// ── POST /products/:id/swatches/:swatchId/delete ─────────────
router.post('/:id/swatches/:swatchId/delete', async (req, res) => {
  try {
    const { error } = await supabase
      .from('product_color_swatches')
      .delete()
      .eq('id', req.params.swatchId)
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Swatch deleted.' };
  } catch (err) {
    console.error('Delete swatch error:', err);
    req.session.flash = { type: 'error', message: 'Failed to delete swatch.' };
  }
  res.redirect(`/products/${req.params.id}/swatches`);
});

module.exports = router;

// ────────���────────────────────���─────────────────────────��──────
// Image routes — CRUD for product_images
// Mounted at /products, so paths are /:id/images/...
// ─────────��────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

const VIEW_TYPES = ['front', 'back', 'side', 'detail', 'swatch', 'lifestyle'];

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

// ── GET /products/:id/images ───��─────────────────────────────
router.get('/:id/images', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { data: images } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('position');

    res.render('images/manage', {
      title: 'Images: ' + product.name,
      product,
      images: images || [],
      viewTypes: VIEW_TYPES
    });
  } catch (err) {
    console.error('Images list error:', err);
    req.session.flash = { type: 'error', message: 'Failed to load images.' };
    res.redirect('/products');
  }
});

// ── POST /products/:id/images — Add image ────────────────────
router.post('/:id/images', async (req, res) => {
  try {
    const product = await getUniformsProduct(req.params.id);
    if (!product) {
      req.session.flash = { type: 'error', message: 'Product not found.' };
      return res.redirect('/products');
    }

    const { file_url, view, alt_text, position } = req.body;

    if (!file_url || !file_url.trim()) {
      req.session.flash = { type: 'error', message: 'Image URL is required.' };
      return res.redirect(`/products/${req.params.id}/images`);
    }

    const { error } = await supabase
      .from('product_images')
      .insert({
        product_id: product.id,
        file_url: file_url.trim(),
        view: view || null,
        alt_text: alt_text || null,
        position: position ? parseInt(position) : 0,
        image_type: 'product'
      });

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Image added.' };
  } catch (err) {
    console.error('Add image error:', err);
    req.session.flash = { type: 'error', message: 'Failed to add image.' };
  }
  res.redirect(`/products/${req.params.id}/images`);
});

// ── POST /products/:id/images/:imageId/delete ────────────────
router.post('/:id/images/:imageId/delete', async (req, res) => {
  try {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', req.params.imageId)
      .eq('product_id', req.params.id);

    if (error) throw error;

    req.session.flash = { type: 'success', message: 'Image deleted.' };
  } catch (err) {
    console.error('Delete image error:', err);
    req.session.flash = { type: 'error', message: 'Failed to delete image.' };
  }
  res.redirect(`/products/${req.params.id}/images`);
});

module.exports = router;

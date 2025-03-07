const express = require('express');
const router = express.Router();

const {analyticsData, orders, VendorProducts} = require('../controller/Admin/adminController');
const {getSliders, addSlider} = require('../controller/activity/slider');

router.get('/analytics', analyticsData);
router.get('/orders/:id/:pageNum', orders); 
router.get('/products/:id/:pageNum', VendorProducts);
router.get('/sliders', getSliders);
router.post('/sliders', addSlider);

module.exports = router;
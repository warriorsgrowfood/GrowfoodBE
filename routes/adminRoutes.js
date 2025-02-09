const express = require('express');
const router = express.Router();

const {analyticsData, orders, VendorProducts} = require('../controller/Admin/adminController');

router.get('/analytics', analyticsData);
router.get('/orders/:id/:pageNum', orders); 
router.get('/products/:id/:pageNum', VendorProducts);

module.exports = router;
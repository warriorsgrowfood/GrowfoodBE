const express = require('express');
const {vendorOrders, updateOrder, updateOrderStatus} = require('../controller/orders/orderController');
const router = express.Router();

const Products = require('../models/products/product');
const { VendorProducts, handleDisplay } = require('../controller/Admin/adminController');

router.get('/orders/:id/:page', vendorOrders)
router.get('/products/:id', VendorProducts)
router.put('/displayProducts', handleDisplay)
router.put('/updateOrder', updateOrderStatus)


module.exports = router;
const express = require('express');
const {vendorOrders} = require('../controller/orders/orderController');
const router = express.Router();

const Products = require('../models/products/product');

router.get('/orders/:id', vendorOrders)



module.exports = router;
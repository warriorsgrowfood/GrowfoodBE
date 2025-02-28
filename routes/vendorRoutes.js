const express = require('express');
const {vendorOrders, updateOrder, updateOrderStatus} = require('../controller/orders/orderController');
const router = express.Router();
const {chatters} = require('../controller/users/authController');

const { VendorProducts, handleDisplay} = require('../controller/Admin/adminController');

router.get('/orders/:id/:page', vendorOrders)
router.get('/products/:id/:page', VendorProducts)
router.put('/displayProducts', handleDisplay)
router.put('/updateOrder', updateOrderStatus)
router.get('/chatters/:id',  chatters)


module.exports = router;
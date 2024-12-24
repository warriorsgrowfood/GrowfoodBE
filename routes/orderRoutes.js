
const express = require('express');
const router = express.Router();

const {createOrder, getOrder, adminOrders, createCart, deleteCart, getCart, deleteOrder, updateOrder} = require('../controller/orders/orderController');


router.post('/createCart', createCart);
router.get('/getCart/:id', getCart);    
router.delete('/deleteCart/:id', deleteCart);

router.post('/create', createOrder);
router.get('/getOrder/:id', getOrder);
router.delete('/deleteOrder/:id', deleteOrder);
router.put('/updateOrder/:id', updateOrder);


router.get('/adminOrders', adminOrders);


module.exports = router;
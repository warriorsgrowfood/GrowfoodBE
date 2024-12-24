const express = require('express');
const router = express.Router();

const {analyticsData, orders} = require('../controller/Admin/adminController');

router.get('/analytics', analyticsData);
router.get('/orders', orders); 

module.exports = router;
const express = require('express');
const router = express.Router();
const {getDistrict, getState} = require('../controller/activity/districts');
const {createArea, getArea} = require('../controller/activity/area');
const {getDistributors} = require('../controller/users/authController');


const {} = 

router.get('/notification', );
router.get('/states', getState);
router.get('/districts/:state', getDistrict);
router.get('/serviceArea/:city', getArea);
router.post('/serviceArea', createArea);
router.get('/distributors', getDistributors)

module.exports = router;
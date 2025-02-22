const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
    district : String, 
    area : String,
});

module.exports = mongoose.model('ServiceArea', areaSchema);
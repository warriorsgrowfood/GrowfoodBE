const mongoose = require('mongoose');

const disSchema = new mongoose.Schema({
    state: String,
    stateCode: String,
    distriCtCode: String,
    districts: String,
    headquaters: String,
    population: Number,
    area: Number,
    density: Number
}); 
module.exports = mongoose.model('District', disSchema);

const mongoose = require("mongoose");

const brandSchema = mongoose.Schema({
    name : {
        required : true,
        type : 'string'
    }, 
    icon : {
        type : 'string'
    }
});

module.exports = mongoose.model('Brand', brandSchema);
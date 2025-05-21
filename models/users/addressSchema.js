const mongoose = require('mongoose')
const addressSchema = new mongoose.Schema({
    userId : {
        type : String,
    },
    name : {
        type : String
    },
    mobile : {
        type : Number,
    },
    state : String, 
    city : String,
    address : {
        type : String, 
    },
    lng : {
        type : Number, 
    },
    lat : {
        type : Number, 
    },
    pincode : {
        type : String
    }

})

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
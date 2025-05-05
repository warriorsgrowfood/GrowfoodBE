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
    address : {
        type : String, 
    },
    lng : {
        type : Number, 
    },
    lat : {
        type : Number, 
    },
    landMark : {
        type : String
    }

})

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
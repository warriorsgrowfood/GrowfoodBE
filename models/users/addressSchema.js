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
    locality : {
        type : String
    },
    city : {
        type : String
    }, 
    state : {
        type : String
    },
    zip : {
        type : String
    },
    landMark : {
        type : String
    }

})

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
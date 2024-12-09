const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    productId : {
        type : String,
        required : true
    },
    userId : {
        type : String,
        required : true
    },
    quantity : {
        type : Number,
        required : true
    },
    paymentId : {
        type : String,
    },
    paymentMode : {
        type : String,
    },
    orderAmount : {
        type : Number,
    },
    date : {
        type : Date,
    }, 
    orderStatus : {
        type : String,
    },
    addressId : {
        type : String,
        required : true
    },
    status : {
        type : String,
    },
    vendorId : {
        type : String,
    }

});

module.exports = mongoose.model('Order', orderSchema);
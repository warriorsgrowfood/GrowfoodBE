const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    
    userId : {
        type : String,
        required : true
    },
    
    paymentId : {
        type : String,
    },
    paymentMode : {
        type : String,
    },

    addressId : {
        type : String,
        required : true
    },
    billAmount : {
        type : Number,
        required : true
    },
    productsArray : [{
        productId : {
            type : String,
        },
        
        quantity : {
            type : Number,
        },
        totalPrice : {
            type : Number,
        },
        image : {
            type : String,
        },
        vendorId : {
            type : String,
        }
    }],
    
    date : {
        type : Date,
    }, 
    
    status : {
        type : String,
        default : 'processing'
    },
    
    

});

module.exports = mongoose.model('Order', orderSchema);
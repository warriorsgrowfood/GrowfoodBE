const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    vendorId : {
        type : String,
    },
    name : {
        rquired: true,
        type : String,
    },
    description : {
        rquired: true,
        type : String,
    },
    brand : {
        type : String,
        required: true,
    },
    categories : {
        type : String,
        required: true,
    },
    display : {
        type : Boolean,
    },
    subCategory : {
        type : String,
    },
    image : {
        type : [],
    },
    discountType : {

        type : String,
    },
    discount : {
        type : Number,

    },
    
    price : {
        type : Number,

    },
    sellingPrice : {
        type : Number,
        required: true,
    },
    unit : {
        type : String,

    },
    productQty : {

        type : String,
    },
    incDecBy : {
 
        type : Number,
    },

    minimumOrderQty : {
        type : Number,
        default : 1,
    },
    availableQty : {

        type : Number,
    },
    foodPrefence : {
        type : String,
    },
    life : {
        type : String,
    },
    rating : {
        type : [{
            userId : String,
            rating : Number,
            review : String,
            date: { type: Date, default: Date.now }

        }],
        
    }
})

module.exports = mongoose.model('Product', productSchema);
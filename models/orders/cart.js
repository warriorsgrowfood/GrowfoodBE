const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
   userId : {
    type : String,
    required : true
   } ,
   productId : {
    type : String,
    required : true
   },
   qty : {
      type : Number,
   }
});

module.exports = mongoose.model('Cart', cartSchema);

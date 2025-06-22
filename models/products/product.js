const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  vendorId: String,
  name: { type: String, required: true },
  brand: { type: String, required: true },
  categories: { type: String, required: true },
  description: String,
  image: [String],
  gst: String,
  gstInclusive: { type: Boolean, default: true },
  display: Boolean,
  foodPrefence: String,
  life: String,
  subCategory: String,
  address: String,

  variants: [
    {
      type: { type: String, enum: ['box', 'packet', 'piece'], required: true },
      price: Number,
      sellingPrice: Number,
      availableQty: Number,
      minimumOrderQty: { type: Number, default: 1 },
      incDecBy: { type: Number, default: 1 },
      sku: String
    }
  ],

  rating: [
    {
      userId: String,
      rating: Number,
      review: String,
      date: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Product', productSchema)

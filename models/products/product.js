const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    vendorId: {
        type: String,
    },
    name: {
        required: true,
        type: String,
    },
    description: {
        type: String,
    },
    gst: {
        type: String,
    },
    gstInclusive: {
        type: Boolean,
        default: true,
    },
    brand: {
        type: String,
        required: true,
    },
    categories: {
        type: String,
        required: true,
    },
    display: {
        type: Boolean,
    },
    subCategory: {
        type: String,
    },
    image: {
        type: [],
    },
    discountType: {
        type: String,
    },
    discount: {
        type: Number,
    },
    price: {
        type: Number,
    },
    sellingPrice: {
        type: Number,
        required: true,
    },
    unit: {
        type: String,
    },
    productQty: {
        type: String,
    },
    incDecBy: {
        type: Number,
    },
    minimumOrderQty: {
        type: Number,
        default: 1,
    },
    availableQty: {
        type: Number,
    },
    foodPrefence: {
        type: String,
    },
    life: {
        type: String,
    },
    rating: {
        type: [{
            userId: String,
            rating: Number,
            review: String,
            date: { type: Date, default: Date.now }
        }],
    },
    address: {
        type: String,
    }
});

// 🔁 Auto-sync incDecBy to minimumOrderQty if not provided
productSchema.pre('save', function (next) {
    if (this.incDecBy && !this.minimumOrderQty) {
        this.minimumOrderQty = this.incDecBy;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);

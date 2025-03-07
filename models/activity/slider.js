const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    }, 
    sliderType : {
        type: String,
    },
    id : {
        type: String,
    }, 
    rank : {
        type: Number,
    },
});

module.exports = mongoose.model('Slider', sliderSchema);
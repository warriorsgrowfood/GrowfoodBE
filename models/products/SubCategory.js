const mongoose = require('mongoose')

const SubCategory = mongoose.Schema({
    name : {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("SubCategory", SubCategory);
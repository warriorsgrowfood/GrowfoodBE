const mongoose = require('mongoose')

const Unit = new mongoose.Schema({
    name : {
        type : String,
        required : true
    }
})

module.exports = mongoose.model("Unit", Unit);
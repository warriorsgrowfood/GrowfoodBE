const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name : {
        required : true,
        type : 'string' 
    },
    icon : {
        type : 'string',
    }
});

module.exports = mongoose.model('Category', categorySchema);
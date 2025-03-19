const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    title : String,
    text : String,
    icon : Number, 
    isSeen :{
        type : Boolean, 
        default : false,
    },
    userId : String,
    notification : {
        type : Boolean,
        default : false,
    }

})

module.exports = mongoose.model('Notification', NotificationSchema)
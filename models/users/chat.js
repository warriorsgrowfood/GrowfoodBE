const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // participants: [
  //   { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Stores both user IDs in an array
  // ],
  // messages: [
  //   {
  //     sender: String,
  //     message: { type: String, required: true },
  //     timestamp: { type: Date, default: Date.now },
  //     isRead: { type: Boolean, default: false }
  //   }
  // ]
  sender : {
    type : String,
  },
  message : String, 
  timestamp : {
    type : Date,
    default : Date.now
  },
  isRead : {
    type : Boolean,
    default : false
  },
  admin : String,
  adminMessage : String,
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;

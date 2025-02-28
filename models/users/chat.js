const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Stores both user IDs in an array
  ],
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ID of the sender
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false }
    }
  ]
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;

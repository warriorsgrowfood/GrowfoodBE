const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  shopName: {
    required: true,
    type: String,
  },
  shopAddress: {
    type: {
      formattedAddress: { type: String },
      lat: Number,
      lng: Number,
      
      // 🔥 Add location field inside shopAddress
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [lng, lat]
        },
      },
    },
  },
  gst: String,
  userType: {
    type: String,
    enum: ['User', 'Vendor'],
    required: true,
    default: 'User',
  },
  userStatus: String,
  name: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
    unique: true,
  },
  description: String,
  password: {
    required: true,
    type: String,
  },
  mobile: {
    required: true,
    type: String,
  },
  image: String,
  state: String,
  city: String,
  fcmToken: String,
  radius: Number,
  chatters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

// ✅ Geo index (on shopAddress.location)
authSchema.index({ 'shopAddress.location': '2dsphere' });

const User = mongoose.model('User', authSchema);
module.exports = User;

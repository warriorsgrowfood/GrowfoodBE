const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  shopName: {
    required: true,
    type: String,
  },
  shopAddress: {
    type: String,
  },
  gst: {
    type: String,
  },
  userType: {
    type: String,
    enum: ['User', 'Vendor'], // Restrict to User or Vendor
    required: true,
    default : 'User'
  },
  userStatus: {
    type: String,
  },
  name: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
    unique: true,
  },
  description: {
    type: String,
  },
  password: {
    required: true,
    type: String,
  },
  mobile: {
    required: true,
    type: String,
  },
  image: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  distributionAreas: {
    type: [String],
  },
  fcmToken: {
    type: String,
  },
  radius: {
    type: Number,
  },
  chatters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New field for nearby vendors
});

// Indexes for performance
authSchema.index({ vendors: 1 });
authSchema.index({ userType: 1, shopAddress: 1 });

const User = mongoose.model('User', authSchema);

module.exports = User;
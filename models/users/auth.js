const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  shopName : {
    required: true,
    type: String,
  },
  shopAddress : {
    type: String,
  },
  gst : {
    type: String,
  }, 
  userType : {
   type: String,

  },
  userStatus : {
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
  password: {
    required: true,
    type: String,
     
  },
  mobile: {
    required: true,
    type: String,
  },
  image : {
    type: String,
  },
  state : {
    type: String,
  },
  city : {
    type: String,
  },
  distributionAreas : {
    type: [String],
  },
  fcmToken : {
    type : String,
  },
  chatters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const User = mongoose.model('User', authSchema);

module.exports = User;

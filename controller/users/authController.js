require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../../models/users/auth');
const bcrypt = require('bcrypt');
const Cart = require('../../models/orders/cart');
const Order = require('../../models/orders/orders');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Product = require('../../models/products/product');
const Notification = require('../../models/activity/notification');
const OtpModel = require('../../models/users/OtpModel');
const Address = require('../../models/users/addressSchema');
const Chat = require('../../models/users/chat');
const axios = require('axios');

const SECRET_KEY = process.env.JWT_KEY;

// Send email for OTP
const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_ID,
      to,
      subject,
      text,
    });

    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending OTP email');
  }
};

// Calculate distance using Google Maps Distance Matrix API
async function calculateDistance(origin, destination, id, radius) {
  if (!origin || !destination) {
    console.log('missing origin/destination')
    return { error: 'Missing origin or destination address' };
  }
  if (!id || !radius || isNaN(radius)) {
    console.log('invalid')
    return { error: 'Invalid ID or radius' };
  }

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: origin,
          destinations: destination,
          key: 'AIzaSyAi2MQyWnPyrSAY_jny04NPMKWoXZH5M1c',
          units: 'metric',
        },
      }
    );

    const data = response.data;
    
    if (data.rows.length && data.rows[0].elements.length) {
      const element = data.rows[0].elements[0];
      if (element.status === 'OK') {
        const distanceValue = element.distance.value; // Distance in meters
        const radiusInMeters = Number(radius) * 1000; // Convert radius to meters
        return distanceValue <= radiusInMeters ? id : null;
      }
      return { error: `Distance Matrix API error: ${element.status}` };
    }
    return { error: 'No results found' };
  } catch (error) {
    console.error('Distance calculation error:', error.message);
    return { error: `Distance calculation failed: ${error.message}` };
  }
}

// Find nearby vendors for a user
async function findNearbyVendors(userAddress) {
  try {
    const vendors = await User.find({
      userType: 'Vendor',
      shopAddress: { $ne: null },
      radius: { $ne: null },
    });

    const nearbyVendorIds = [];
    for (const vendor of vendors) {
      
      const result = await calculateDistance(
        userAddress,
        vendor.shopAddress,
        vendor._id,
        vendor.radius
      );
      if (result && !result.error) {
        nearbyVendorIds.push(result);
      }
    }

    return nearbyVendorIds.filter((id) => id !== null);
  } catch (error) {
    console.error('Error finding nearby vendors:', error);
    return [];
  }
}

// Update users within a vendor's radius
async function updateUsersForVendor(vendorId, vendorAddress, vendorRadius) {
  try {
    const users = await User.find({
      userType: 'User',
      shopAddress: { $ne: null },
    });

    const updatePromises = users.map(async (user) => {
      const result = await calculateDistance(
        user.shopAddress,
        vendorAddress,
        vendorId,
        vendorRadius
      );
      if (result && !result.error) {
        await User.findByIdAndUpdate(user._id, {
          $addToSet: { vendors: vendorId },
        });
      }
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error updating users for vendor:', error);
  }
}

// Forgot Password - Generate and store OTP
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User with this email does not exist' });

    const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
    const hashedOtp = await bcrypt.hash(otp, 10); // Secure storage

    // Store OTP in database with expiration (10 minutes)
    await OtpModel.findOneAndUpdate(
      { email },
      { otp: hashedOtp, expiresAt: Date.now() + 10 * 60 * 1000 },
      { upsert: true, new: true }
    );

    // Send OTP via email
    await sendEmail(email, 'Password Reset OTP', `Your OTP is: ${otp}. Valid for 10 minutes.`);
    console.log('Your OTP is:', otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    next(error);
  }
};

// Verify OTP
exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const storedOtpRecord = await OtpModel.findOne({ email });
    if (!storedOtpRecord) return res.status(400).json({ message: 'No OTP found for this email' });

    // Check expiration
    if (Date.now() > storedOtpRecord.expiresAt) {
      await OtpModel.deleteOne({ email });
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Compare hashed OTP
    const isOtpValid = await bcrypt.compare(otp, storedOtpRecord.otp);
    if (!isOtpValid) return res.status(400).json({ message: 'Invalid OTP' });

    // OTP verified, delete from DB
    await OtpModel.deleteOne({ email });

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('verifyOtp error:', error);
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('resetPassword error:', error);
    next(error);
  }
};

// Get One User
exports.getOneUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const data = {
      name: user.name,
      email: user.email,
      shopName: user.shopName,
      gst: user.gst,
      mobile: user.mobile,
    };

    res.status(200).json(data);
  } catch (e) {
    console.error('Error in getting user', e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Create User
exports.createUser = async (req, res, next) => {
  const {
    shopName,
    name,
    email,
    password,
    mobile,
    userType,
    shopAddress,
    gst,
    state,
    city,
    distributionAreas,
    radius,
  } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, mobile, and userType are required',
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Add location to shopAddress if lat/lng present
    if (
      shopAddress &&
      typeof shopAddress.lat === 'number' &&
      typeof shopAddress.lng === 'number'
    ) {
      shopAddress.location = {
        type: 'Point',
        coordinates: [shopAddress.lng, shopAddress.lat], // Note: [lng, lat]
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData = {
      shopName: shopName || '',
      name,
      email,
      password: hashedPassword,
      mobile,
      shopAddress,
      gst,
      userType,
      state,
      city,
      distributionAreas: distributionAreas || [],
      radius: userType === 'Vendor' ? Number(radius) : null,
      vendors: [],
    };
    console.log('user is', userData)

    const user = new User(userData);


    if (userType !== 'Vendor' && shopAddress) {
      user.vendors = await findNearbyVendors(shopAddress);
    }

  
    await user.save();


    if (
      userType === 'Vendor' &&
      shopAddress &&
      radius &&
      !isNaN(radius)
    ) {
      await updateUsersForVendor(user._id, shopAddress, radius);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, {
      expiresIn: '8760h', // 1 year
    });

    // Return response
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        shopName: user.shopName,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
        shopAddress: user.shopAddress,
        vendors: user.vendors,
      },
      token,
    });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};


// Update User
exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { shopName, name, mobile, image, gst, userType, userStatus, shopAddress } = req.body.formData;

  try {
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if (image) updateData.image = image;
    if (gst) updateData.gst = gst;
    if (userType) updateData.userType = userType;
    if (userStatus) updateData.userStatus = userStatus;
    if (shopAddress) updateData.shopAddress = shopAddress;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {琉: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// Login User
exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({message : 'User not found'});
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({message : 'User ID or Password is incoreect'});
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '8760h' });

    res.status(200).json({ token, user });
  } catch (error) {
    console.error('loginUser error:', error);
    next(error);
  }
};

// Get User
exports.getUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('getUser error:', error);
    next(error);
  }
};

// Get All Users
exports.getUsers = async (req, res, next) => {
  const message = req.params.message;
  if (message === 'AdminAccess') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    next(error);
  }
};

// Get Current User
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).send('User not found');
    }
    const cartCount = await Cart.find({ userId: user._id });
    const orderCount = await Order.find({ userId: user._id });
    const cartLength = cartCount.length;
    const orderLength = orderCount.length;
    const data = { user, cartLength, orderLength };

    res.status(200).json(data);
  } catch (error) {
    console.error('Get User error:', error);
    res.status(500).send('Server error');
  }
};

// Create Address
exports.createAddress = async (req, res, next) => {
  try {
    const formData = req.body;
    const address = formData;
    console.log(req.user)
    const newAddress = new Address({
      userId: req.user.id ?? req.user._id,
      name: address.name,
      mobile: address.mobile,
      address: address.address,
      landMark: address.landmark,
      lat : address.lat,
      lng : address.lng
    });
    console.log(newAddress)

    await newAddress.save();
    res.status(200).json({ message: 'Address saved' });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Get Address
exports.getAddress = async (req, res, next) => {
  try {
    const id= req.user.id;
    const addresses = await Address.find({ userId: id });

    
      res.status(200).json(addresses);
    
  } catch (error) {
    console.error('getAddress error:', error);
    next(error);
  }
};

// Get Delivery Address
exports.getDeliveryAddress = async (req, res, next) => {
  try {
    const id = req.params.id;
    const address = await Address.findById(id);

    if (address) {
      res.status(200).json(address);
    } else {
      res.status(404).json({ message: 'Address not found' });
    }
  } catch (error) {
    console.error('getAddress error:', error);
    next(error);
  }
};

// Update Address
exports.updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const updatedData = req.body.address;
    const updatedAddress = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });

    if (!updatedAddress) {
      return res.status(404).send('Address not found');
    }
    res.status(200).json({ message: 'Address updated successfully', updatedAddress });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Delete Address
exports.deleteAddress = async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const deletedAddress = await Address.findByIdAndDelete(addressId);

    if (!deletedAddress) {
      return res.status(404).send('Address not found');
    }
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Get All Users
exports.getAllusers = async (req, res, next) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Get Distributors
exports.getDistributors = async (req, res, next) => {
  try {
    const distributors = await User.find({ userType: 'Vendor' });
    const distributorData = await Promise.all(
      distributors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ vendorId: vendor._id });
        return {
          id: vendor._id,
          name: vendor.name,
          city: vendor.city,
          area: vendor.distributionAreas,
          productCount,
        };
      })
    );

    res.status(200).json(distributorData);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Get Chatters
exports.chatters = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).populate('chatters', 'id name image userStatus');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const superUser = await User.findOne({ userType: 'admin' }).select('id name image userStatus');

    res.status(200).json({
      chatters: user.chatters.map((chatter) => ({
        id: chatter._id,
        name: chatter.name,
        image: chatter.image,
        isActive: chatter.userStatus === 'active',
      })),
      admin: superUser
        ? {
            id: superUser._id,
            name: superUser.name,
            image: superUser.image,
            isActive: superUser.userStatus === 'active',
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Send Message
async function sendMessage(senderId, receiverId, messageText) {
  try {
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!chat) {
      chat = new Chat({ participants: [senderId, receiverId], messages: [] });
    }

    chat.messages.push({
      sender: senderId,
      message: messageText,
    });

    await chat.save();
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Update FCM Token
exports.updateFcm = async (req, res, next) => {
  const { fcmToken } = req.body;
 console.log('updating token', req.user)
  try {
    const x = await User.findByIdAndUpdate(req.user.id, { fcmToken : fcmToken }, { new: true });
    console.log(x)
    return res.status(200).json({ message: 'Token Updated' });
  } catch (e) {
    console.error('Error in updating fcm token', e);
    next(e);
  }
};

// Get Notifications
exports.getNotification = async (req, res, next) => {
  console.log('gettting notification')
  try {
    const notifications = await Notification.find({ userId: req.user._id });
    res.status(200).json(notifications);
  } catch (e) {
    console.error('Error in getting notification', e);
    next(e);
  }
};

// Update Notification Seen
exports.updateNotiSeen = async (req, res, next) => {
  try {
    const { userId } = req.body;

    await Notification.updateMany(
      { userId, isSeen: false },
      { $set: { isSeen: true } }
    );

    return res.status(200).json({ success: true, message: 'Notifications updated' });
  } catch (e) {
    console.error('Error in updating notification', e);
    next(e);
  }
};

// Create Chat
exports.createChat = async (req, res, next) => {
  try {
    const newChat = new Chat(req.body);
    await newChat.save();
    return res.status(200).json({ message: newChat });
  } catch (e) {
    console.error('Error in creating chat', e);
    next(e);
  }
};

// Get Chats
exports.getChats = async (req, res, next) => {
  const id = req.params.id;
  try {
    const chats = await Chat.find({ sender: id });
    res.status(200).json(chats);
  } catch (e) {
    console.error('Error in getting chats', e);
    next(e);
  }
};

// Get Chats for Admin
exports.getChatsAdmin = async (req, res, next) => {
  try {
    const chats = await Chat.find();
    return res.status(200).json(chats);
  } catch (e) {
    console.error('Error in getting chats', e);
    next(e);
  }
};
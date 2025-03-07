require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../../models/users/auth');
const bcrypt = require('bcrypt');
const Cart = require('../../models/orders/cart')
const Order = require('../../models/orders/orders');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Product = require('../../models/products/product');

const Address = require('../../models/users/addressSchema');

const SECRET_KEY = process.env.JWT_KEY;




const otpStore = new Map();

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User with this email does not exist');
    }
    const otp = crypto.randomInt(100000, 999999); // 6-digit OTP

    // Store OTP temporarily with expiration
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // Valid for 10 minutes

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_ID, // Replace with your email
        pass: process.env.MAIL_PASSWORD, // Replace with your email password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).send('No OTP found for this email');
    }

    if (storedOtp.otp !== parseInt(otp, 10)) {
      return res.status(400).send('Invalid OTP');
    }

    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).send('OTP has expired');
    }

    otpStore.delete(email);
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('verifyOtp error:', error);
    next(error);
  }
};

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

exports.getOneUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    console.error("Error in getting user", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
};






exports.createUser = async (req, res, next) => {
  const {shopName, name, email, password, mobile, userType, shopAddress, gst, state, city, distributionAreas } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({shopName, name, email, password: hashedPassword, mobile, shopAddress, gst, userType, state, city, distributionAreas});
    await newUser.save();

    res.status(200).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('createUser error:', error);
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { shopName, name, mobile, image, gst, userType, userStatus, shopAddress} = req.body.formData;



  try {
    
 
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;
    if(image) updateData.image = image;
    if(gst) updateData.gst = gst;
    if(userType) updateData.userType = userType;
    if(userStatus) updateData.userStatus = userStatus;
    if(shopAddress) updateData.shopAddress = shopAddress;

    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
  
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (e) {
    console.error(e);
    next(e);
  }
};




exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
 

  try {
    const user = await User.findOne({ email });
    if (!user) {

      return res.status(404).send('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {

      return res.status(401).send('Invalid Password');
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '8760h' });

    res.status(200).json({ token, user });
  } catch (error) {
    console.error('loginUser error:', error);
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await User.findOne({ _id : id });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('getUser error:', error);
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  const message = req.params.message;
  if (message === "AdminAccess") {
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

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); 

    if (!user) {
      return res.status(404).send('User not found');
    }
    const cartCount = await Cart.find({userId : user._id});
    const orderCount = await Order.find({userId : user._id});
    const cartLength = cartCount.length;
    const orderLength = orderCount.length;
    const data = {user, cartLength, orderLength};

    
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Get User error:', error);
    res.status(500).send('Server error');
  }
};


exports.createAddress = async(req, res, next) => {
  
  try{
    const formData = req.body;
    const address = formData;

    const newAdddress = new Address({
      userId : address.userId,
      name : address.name,
      mobile : address.mobile,
      locality : address.locality,
      city : address.city,
      state : address.state,
      zip : address.zip,
      landMark : address.landmark
    });

    await newAdddress.save();
    res.status(200).json({message: 'Address saved'});
  }catch(err){
    console.error(err);
    next(err);
  }
};

exports.getAddress = async (req, res, next) => {
 
  try {
    const {id} = req.params;
  
    const addresses = await Address.find({userId: id});
    if(addresses){
      res.status(200).json(addresses);
    }else{
      res.status(402).json({message: 'Address not found'});
    }
    
  } catch (error) {
    console.error('getAddress error:', error);
    next(error);
  }
};

exports.getDeliveryAddress = async (req, res, next) => {
  
  try {
    const {id} = req.params;

    const addresses = await Address.findById(id);
    if(addresses){

      res.status(200).json(addresses);
    }else{
      res.status(402).json({message: 'Address not found'});
    }
    
  } catch (error) {
    console.error('getAddress error:', error);
    next(error);
  }
};

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

exports.deleteAddress = async (req, res, next) => {
  try {
    const addressId  = req.params.id;
  
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


exports.getAllusers = async (req, res, next) => { 

  try{
    const users = await User.find({});
    res.status(200).json(users);
  }catch (err) {
    console.error(err);
    next(err);
  }
}

exports.getDistributors = async (req, res, next) => {
  try {
    // Fetch all vendors
    const distributors = await User.find({ userType: "Vendor" });

    // Map through vendors and fetch product count for each vendor
    const distributorData = await Promise.all(
      distributors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ vendorId: vendor._id });
        return {
          id : vendor._id,
          name: vendor.name,
          city: vendor.city,
          area: vendor.distributionAreas,
          productCount,
        };
      })
    );

    // Send the response
    res.status(200).json(distributorData);
  } catch (err) {
    console.error(err);
    next(err);
  }
};


exports.chatters = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Find the user
    const user = await User.findById(id).populate('chatters', 'id name image userStatus');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch the admin user
    const superUser = await User.findOne({ userType: 'admin' }).select('id name image userStatus');

    res.status(200).json({
      chatters: user.chatters.map(chatter => ({
        id: chatter._id,
        name: chatter.name,
        image: chatter.image,
        isActive: chatter.userStatus === 'active' // Assuming 'userStatus' represents activity
      })),
      admin: superUser ? {
        id: superUser._id,
        name: superUser.name,
        image: superUser.image,
        isActive: superUser.userStatus === 'active'
      } : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};




async function sendMessage(senderId, receiverId, messageText) {
  try {
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!chat) {
      chat = new Chat({ participants: [senderId, receiverId], messages: [] });
    }

    chat.messages.push({
      sender: senderId,
      message: messageText
    });

    await chat.save();
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
  }
}


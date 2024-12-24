require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../../models/users/auth');
const bcrypt = require('bcrypt');
const Cart = require('../../models/orders/cart')
const Order = require('../../models/orders/orders');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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




exports.createUser = async (req, res, next) => {
  const {shopName, name, email, password, mobile, userType, shopAddress, gst } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({shopName, name, email, password: hashedPassword, mobile, shopAddress, gst, userType,});
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

  console.log(req.body.formData);

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
    console.log(updatedUser);
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
  console.log(email, password);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Password not valid");
      return res.status(401).send('Invalid Password');
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '8760h' });
    console.log('Successfully signed')
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
    console.log("User", user)
    if (!user) {
      return res.status(404).send('User not found');
    }
    const cartCount = await Cart.find({userId : user._id});
    const orderCount = await Order.find({userId : user._id});
    const cartLength = cartCount.length;
    const orderLength = orderCount.length;
    const data = {user, cartLength, orderLength};
    console.log(data);
    
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
    console.log("Create Address", address)
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
    console.log("New Address", newAdddress)
    await newAdddress.save();
    res.status(200).json({message: 'Address saved'});
  }catch(err){
    console.log(err);
    next(err);
  }
};

exports.getAddress = async (req, res, next) => {
 
  try {
    const {id} = req.params;
    console.log("Get Address", id);
    const addresses = await Address.find({userId: id});
    if(addresses){
      console.log('ad',addresses);
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
    console.log("Get Address", id);
    const addresses = await Address.find({_id: id});
    if(addresses){
      console.log("addresses", addresses);
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
    console.log(err);
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const addressId  = req.params.id;
    console.log(addressId);
    const deletedAddress = await Address.findByIdAndDelete(addressId);
    if (!deletedAddress) {
      return res.status(404).send('Address not found');
    }
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.log(err);
    next(err);
  }
};


exports.getAllusers = async (req, res, next) => { 
  console.log('tri')
  try{
    const users = await User.find({});
    res.status(200).json(users);
  }catch (err) {
    console.log(err);
    next(err);
  }
}


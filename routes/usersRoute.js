const express = require("express");
const router = express.Router();
const {
  getUser,
  getUsers,
  createUser,
  loginUser,
  getCurrentUser,
  createAddress,
  deleteAddress,
  getDeliveryAddress,
  updateAddress,
  getAddress,
  updateUser,
  forgotPassword,
  resetPassword,
  verifyOtp,
  getAllusers,
  getOneUser,
  updateFcm,
  getNotification,
  updateNotiSeen,
  createChat, getChats, getChatsAdmin,
} = require("../controller/users/authController");
const authenticateJWT = require("../middleware/authMiddleware");

router.get("/me", authenticateJWT, getCurrentUser);
router.get("/message", authenticateJWT, getUsers);
router.post("/register", createUser);
router.put('/updateUser/:id', updateUser);
router.post("/login", loginUser);
router.post("/createAddress", createAddress);
router.put("/updateAddress/:id", authenticateJWT, updateAddress);
router.delete("/deleteAddress/:id", authenticateJWT, deleteAddress);
router.get("/getAddress", authenticateJWT, getAddress);
router.get("/getDeliveryAddress/:id", authenticateJWT, getDeliveryAddress);
router.get("/getallusersforadmin", getAllusers);
router.get("/:email", getUser);
router.get('/forgotPassword/:email', forgotPassword);
router.post('/verifyOtp', verifyOtp);
router.post('/resetPassword', resetPassword);
router.get('/getOneUser/:id', getOneUser)
router.put('/updateFcmToken', authenticateJWT, updateFcm)
router.get('/notifications', authenticateJWT, getNotification)
router.put('/notifications', authenticateJWT, updateNotiSeen)
router.get('/chats/:id', authenticateJWT, getChats);
router.post('/chats', authenticateJWT, createChat);
router.get('/admin/chats',authenticateJWT, getChatsAdmin);


module.exports = router;

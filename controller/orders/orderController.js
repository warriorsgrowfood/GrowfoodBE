const Order = require("../../models/orders/orders");
const dateFns = require("date-fns");
const Cart = require("../../models/orders/cart");
const Product = require("../../models/products/product");
const Address = require("../../models/users/addressSchema");
const cart = require("../../models/orders/cart");
const Notification = require('../../models/activity/notification');
const User = require("../../models/users/auth");
const admin = require('firebase-admin')
const mongoose = require('mongoose')

const { v4: uuidv4 } = require('uuid');

exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { formData } = req.body;
    if (!formData || !formData.productsArray || !formData.addressId || !formData.paymentMode) {
      throw new Error('Invalid order data');
    }

    const { productsArray, addressId, paymentMode, paymentId = 'na', billAmount } = formData;
    const userId = req.user._id;
    const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Validate products and fetch details
    const validatedProducts = await Promise.all(
      productsArray.map(async (item) => {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const variant = product.variants.find(v => v._id.toString() === item.variantId);
        if (!variant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }

        if (item.quantity < (variant.minimumOrderQty || 1)) {
          throw new Error(`Quantity below minimum for ${product.name}: ${variant.minimumOrderQty}`);
        }

        if (item.quantity > variant.availableQty) {
          throw new Error(`Insufficient stock for ${product.name}: ${variant.availableQty} available`);
        }

        const unitPrice = variant.sellingPrice;
        const totalPrice = item.quantity * unitPrice;
        const expectedTotal = parseFloat(item.totalPrice.toFixed(2));
        if (Math.abs(totalPrice - expectedTotal) > 0.01) {
          throw new Error(`Price mismatch for ${product.name}`);
        }

        // Update stock
        variant.availableQty -= item.quantity;
        await product.save({ session });

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          images: product.image || [],
          vendorId: product.vendorId,
          gst: product.gst,
          gstInclusive: product.gstInclusive,
        };
      })
    );

    // Validate bill amount
    const calculatedBill = validatedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = validatedProducts.reduce((sum, item) => {
      if (item.gst && !item.gstInclusive) {
        const gstRate = parseFloat(item.gst) || 0;
        return sum + (item.totalPrice * gstRate) / 100;
      }
      return sum;
    }, 0);
    const totalBill = parseFloat((calculatedBill + taxAmount).toFixed(2));
    if (Math.abs(totalBill - billAmount) > 0.01) {
      throw new Error('Bill amount mismatch');
    }

    // Create order
    const newOrder = new Order({
      orderId,
      userId,
      paymentId,
      paymentMode,
      addressId,
      billAmount: totalBill,
      taxAmount,
      productsArray: validatedProducts,
      status: 'pending',
      statusHistory: [{ status: 'pending', date: new Date() }],
    });
    await newOrder.save({ session });

    // Delete cart items
    const productIds = productsArray.map(item => item.productId);
    await Cart.deleteMany({ userId, productId: { $in: productIds } }).session(session);

    await session.commitTransaction();
    return res.status(201).json({
      message: 'Order created successfully',
      orderId,
      status: newOrder.status,
      billAmount: newOrder.billAmount,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Order creation error:', err.message);
    return res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

exports.updateOrder = async (req, res, next) => {
  const { id } = req.params;

  try {
    const { quantity, orderAmount, paymentMode, paymentId, status } =
      req.body.formData;


    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id, // The ID of the order to update
      {
        quantity,
        paymentId,
        paymentMode,
        orderAmount,
        status,
      },
      { new: true } // Return the updated document
    );

    // If the order was not found
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Return the updated order
    res.status(200).json(updatedOrder);
  } catch (err) {
    console.error(err);
    next(err);
  }
};



exports.createCart = async (req, res, next) => {
  const { productId, variantId, qty } = req.body;
  const userId = req.user._id;

  try {
    if (!productId || !variantId || !qty || qty < 1) {
      return res.status(400).json({
        message: 'productId, variantId, and qty (minimum 1) are required',
      });
    }

    // Check for existing cart entry (no time filter now)
    const existingCart = await Cart.findOne({ userId, productId, variantId });

    if (existingCart) {
      existingCart.qty += qty;
      await existingCart.save();
      return res.status(200).json({ message: 'Cart updated successfully' });
    }

    // Create new cart entry
    const cart = new Cart({ userId, productId, variantId, qty });
    await cart.save();
    res.status(200).json({ message: 'Cart created successfully' });
  } catch (err) {
    console.error('Error in createCart:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.deleteCart = async (req, res, next) => {
  const { id } = req.params;

  try {
    const cart = await Cart.findOneAndDelete({ _id: id });

    if (cart) {
      res.status(200).json({ message: "Cart deleted successfully" });
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.deleteOrder = async (req, res, next) => {
  const { id } = req.params;
  try {
    const order = await Order.findOneAndDelete({ _id: id });
    if (order) {
      res.status(200).json({ message: "Order deleted successfully" });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};



// exports.getOrders = async (req, res, next) => {
//   try {
//     const userId = req.user._id;
//     const orders = await Order.find({ userId })
//       .populate({
//         path: 'productsArray.productId',
//         select: 'name image vendorId gst gstInclusive',
//       })
//       .populate({
//         path: 'addressId',
//         select: 'name mobile address',
//       })
//       .lean();

//     const detailedOrders = orders.map((order) => ({
//       orderId: order.orderId,
//       userId: order.userId,
//       paymentId: order.paymentId,
//       paymentMode: order.paymentMode,
//       billAmount: order.billAmount,
//       taxAmount: order.taxAmount,
//       createdAt: order.createdAt,
//       status: order.status,
//       statusHistory: order.statusHistory,
//       productsArray: order.productsArray.map((item) => ({
//         productId: item.productId._id,
//         variantId: item.variantId,
//         quantity: item.quantity,
//         unitPrice: item.unitPrice,
//         totalPrice: item.totalPrice,
//         images: item.productId.image || [],
//         name: item.productId.name,
//         vendorId: item.productId.vendorId,
//         gst: item.productId.gst,
//         gstInclusive: item.productId.gstInclusive,
//       })),
//       address: order.addressId
//         ? {
//             name: order.addressId.name,
//             mobile: order.addressId.mobile,
//             address: order.addressId.address,
//           }
//         : null,
//     }));

//     return res.status(200).json(detailedOrders);
//   } catch (err) {
//     console.error('Error fetching orders:', err);
//     return res.status(500).json({ message: 'Failed to fetch orders' });
//   }
// };

exports.getOrders = async(req, res, next) => {
  const id = req.user._id;
  try{
    const orders = await Order.find({userId : id});
    res.status(200).json(orders);
  }catch(err){
    console.error(err);
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ orderId: id })
      .populate({
        path: 'productsArray.productId',
        select: 'name image vendorId gst gstInclusive',
      })
      .populate({
        path: 'addressId',
        select: 'name mobile address',
      })
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const address = await Address.findById(order.addressId)
    // console.log(address);
    console.log(order.addressId)
    const detailedOrder = {
      orderId: order.orderId,
      userId: order.userId,
      paymentId: order.paymentId,
      paymentMode: order.paymentMode,
      billAmount: order.billAmount,
      taxAmount: order.taxAmount,
      createdAt: order.createdAt,
      status: order.status,
      statusHistory: order.statusHistory,
      products: order.productsArray.map((item) => ({
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        images: item.images || [],
        name: item.productId.name,
        vendorId: item.productId.vendorId,
        gst: item.productId.gst,
        gstInclusive: item.productId.gstInclusive,
      })),
      address: order.addressId
        ? {
            name: address.name,
            mobile: address.mobile,
            address: address.address,
          }
        : null,
    };

    return res.status(200).json([detailedOrder]);
  } catch (err) {
    console.error('Error fetching order:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};

// exports.deleteOrder = async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;
//     const order = await Order.findOne({ orderId: id, userId }).session(session);

//     if (!order) {
//       throw new Error('Order not found or unauthorized');
//     }

//     if (order.status === 'delivered' || order.status === 'cancelled') {
//       throw new Error('Cannot cancel delivered or already cancelled order');
//     }

//     // Restore product stock
//     for (const item of order.productsArray) {
//       const product = await Product.findById(item.productId).session(session);
//       if (product) {
//         const variant = product.variants.find((v) => v._id.toString() === item.variantId);
//         if (variant) {
//           variant.availableQty += item.quantity;
//           await product.save({ session });
//         }
//       }
//     }

//     // Update order status to cancelled
//     order.status = 'cancelled';
//     order.statusHistory.push({
//       status: 'cancelled',
//       date: new Date(),
//       note: 'Order cancelled by user',
//     });
//     await order.save({ session });

//     await session.commitTransaction();
//     return res.status(200).json({ message: 'Order cancelled successfully' });
//   } catch (err) {
//     await session.abortTransaction();
//     console.error('Error cancelling order:', err);
//     return res.status(400).json({ message: err.message });
//   } finally {
//     session.endSession();
//   }
// };




exports.getCart = async (req, res, next) => {
  const  id  = req.user._id;

  try {
    const cart = await Cart.find({ userId: id });

    if (cart) {
      res.status(200).json(cart);
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.adminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    next(err);
  }
};




exports.vendorOrders = async (req, res, next) => {
  try {
    const { id, page } = req.params; // Vendor ID
    const limit = 50;
    const skip = (parseInt(page, 10) - 1) * limit;


    // Fetch orders that contain products linked to the given vendor
    const orders = await Order.find({ "productsArray.productId": { $exists: true } })
      .skip(skip)
      .limit(limit);

    if (!orders.length) {
      return res.status(404).json({ message: "Orders not found" });
    }

    // Extract product IDs from the orders
    const productIds = orders.flatMap(order => order.productsArray.map(p => p.productId));

    // Fetch product details in one go
    const products = await Product.find({ _id: { $in: productIds }, vendorId: id });

    // Create a map of product details
    const productMap = new Map(products.map(product => [product._id.toString(), product]));

    // Construct vendor-specific orders response
    const venOrders = await Promise.all(orders.map(async order => {
      // Fetch user details
      const user = await Address.findById(order.addressId);
      
      // Filter products belonging to the vendor
      const filteredProducts = order.productsArray
        .filter(product => productMap.has(product.productId))
        .map(product => {
          const productInfo = productMap.get(product.productId);
          return {
            productId: product.productId,
            name: productInfo?.name || "Unknown",
            brand: productInfo?.brand || "Unknown",
            price: productInfo?.price || 0,
            category: productInfo?.categories || "Uncategorized",
            sellingPrice: productInfo?.sellingPrice || 0,
            discount: productInfo?.discount || 0,
            quantity: product.quantity,
            totalPrice: product.totalPrice,
          };
        });

      if (filteredProducts.length === 0) return null; // Skip orders without vendor's products
      
      const venOrderAmount = filteredProducts.reduce((sum, product) => sum + product.totalPrice, 0);
      const orderQty = filteredProducts.reduce((sum, product) => sum + product.quantity, 0);
      
      return {
        orderId: order._id,
        userId: order.userId,
        user: user ? {
          _id: user._id,
          name: user.name,
          address: user.address,
          mobile: user.mobile
        } : null,
        paymentId: order.paymentId,
        paymentMode: order.paymentMode,
        date: order.date,
        status: order.status,
        venOrderAmount,
        orderQty,
        productDetails: filteredProducts,
        addressId: order.addressId,
      };
    }));


    
    const filteredVenOrders = venOrders.filter(order => order !== null);
    
    // Count total orders for pagination
    const totalOrders = filteredVenOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      page: parseInt(page, 10),
      totalPages,
      totalOrders,
      ordersPerPage: limit,
      orders: filteredVenOrders,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};


exports.updateOrderStatus = async (req, res, next) => {
  const {orderId, status} = req.body;
  try{
     const order = await Order.findByIdAndUpdate(orderId, {status : status}, {new : true});
     const data = {
      title : 'Order Updated', 
      text : `your order status updated as  ${status}`,
      icon : 1,
      userId  : order.userId,
      notification : true,
      isSeen : false,
      
     };
     await createNotification(data);
    res.status(200).json({message : 'Order status updated successfully'});
  }catch(e){
    console.error('Error in updating order status',e);
    next(e);
  }
}

const createNotification = async(noti)=>{
  try{
   const newNoti = new Notification(noti);
   if(noti?.notification){
      const user = await User.findById(noti.userId)
      const message = {
        token : user.fcmToken,
        data : {
          title : noti.title, 
          text : noti.text,
        }

      }
      const res = await admin.messaging().send({
         token : user.fcmToken,
        data : {
          title : noti.title, 
          text : noti.text,
        },
        android : {
          priority : 'high',
        },
        apns: {
    headers: {
      'apns-priority': '10',
    },
  },
      }); 
   }
   await newNoti.save();
   return true;
  }catch(e){
    console.error('Error in creating notification', e)
    return false
  }
}



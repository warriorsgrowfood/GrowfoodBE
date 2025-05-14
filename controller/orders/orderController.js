const Order = require("../../models/orders/orders");
const dateFns = require("date-fns");
const Cart = require("../../models/orders/cart");
const Product = require("../../models/products/product");
const Address = require("../../models/users/addressSchema");
const cart = require("../../models/orders/cart");
const Notification = require('../../models/activity/notification');
const User = require("../../models/users/auth");
const admin = require('firebase-admin')

exports.createOrder = async (req, res, next) => {
  try {
    const date = Date.now();
    const istDate = dateFns.format(date, "yyyy-MM-dd HH:mm:ss", {
      timeZone: "Asia/Kolkata",
    });
    const bdata = req.body.formData; 
    const orders = ({...bdata, date : istDate, userId : req.user._id});
    console.log('orders: ', orders);

    const newOrder = new Order(orders);
    await newOrder.save();
    const productIds = orders.productsArray.map(item => item.productId);
    await Cart.deleteMany({
      userId : req.user._id,
      productId : {$in : productIds},
    })


    return res.status(200).json({ message: "Order Created" });
    
  } catch (err) {
    console.error(err);
    next(err);
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
  const {productId, qty } = req.body;
  const userId = req.user._id; 
  try {
    const cart = new Cart({ userId, productId, qty });
    await cart.save();
 
    res.status(200).json({ message: "Cart Created successfully" });
  } catch (err) {
    console.error(err);
    next(err);
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
  const { id } = req.params;

  try {
    // Fetch all orders for the user
    const orders = await Order.find({ _id: id }).exec();
    

    // If no orders are found
    if (orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    // Process each order to fetch associated products and address
    const detailedOrders = await Promise.all(orders.map(async (order) => {
      // Fetch product details for each order's productsArray
      const products = await Promise.all(order.productsArray.map(async (productItem) => {
        const product = await Product.findById(productItem.productId);
       
        if (!product) {
          return { message: "Product not found", productId: productItem.productId }; // Handle missing product
        }

        return {
          productId: product._id, // Ensure productId is included
          name: product.name, // Include product name
          price: product.price, // Include product price
          quantity: productItem.quantity,
          totalPrice: productItem.totalPrice
        };
      }));

      // Fetch address details for the order
      const address = await Address.findById(order.addressId);

     
      return {
        orderId: order._id,
        userId: order.userId,
        paymentId: order.paymentId,
        paymentMode: order.paymentMode,
        billAmount: order.billAmount,
        date: order.date,
        status: order.status,
        products: products, 
        address: address ? address._doc : null
      };
    }));

    return res.status(200).json(detailedOrders);
    
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the error-handling middleware
  }
};




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

    console.log("Vendor ID:", id, "Page:", page);

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
    const venOrders = orders.map(order => {
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
        paymentId: order.paymentId,
        paymentMode: order.paymentMode,
        date: order.date,
        status: order.status,
        venOrderAmount,
        orderQty,
        productDetails: filteredProducts,
        addressId: order.addressId,
      };
    }).filter(order => order !== null); // Remove null entries

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments({ "productsArray.productId": { $exists: true } });
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      page: parseInt(page, 10),
      totalPages,
      totalOrders,
      ordersPerPage: limit,
      orders: venOrders,
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
  console.log('creating notification')
  try{
   const newNoti = new Notification(noti);
   if(noti?.notification){
      const user = await User.findById(noti.userId)
      console.log(user)
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
      console.log('fcm message sent to', noti.userId)
   }
   await newNoti.save();
   return true;
  }catch(e){
    console.error('Error in creating notification', e)
    return false
  }
}



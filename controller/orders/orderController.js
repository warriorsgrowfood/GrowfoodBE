const Order = require("../../models/orders/orders");
const dateFns = require("date-fns");
const Cart = require("../../models/orders/cart");
const Product = require("../../models/products/product");
const Address = require("../../models/users/addressSchema");

exports.createOrder = async (req, res, next) => {
  try {
    const date = Date.now();
    const istDate = dateFns.format(date, "yyyy-MM-dd HH:mm:ss", {
      timeZone: "Asia/Kolkata",
    });
    const orders = req.body.formData; // Array of orders

    // Save all orders
    const orderPromises = orders.map(async (orderData) => {
      const {
        productId,
        userId,
        quantity,
        paymentId,
        paymentMode,
        orderAmount,
        addressId,
        vendorId,
      } = orderData;
      const order = new Order({
        productId,
        userId,
        quantity,
        paymentId,
        paymentMode,
        addressId,
        orderAmount,
        date: istDate,
        vendorId,
      });
      await order.save();
      return order;
    });

    await Promise.all(orderPromises);

    // Remove ordered items from the user's cart
    const userId = orders[0].userId; // Assuming all orders have the same userId
    await Cart.deleteMany({
      userId,
      productId: { $in: orders.map((order) => order.productId) },
    });

    console.log("All orders saved and cart cleared successfully");
    res
      .status(200)
      .json({ message: "All Orders Created and Cart Cleared Successfully" });
  } catch (err) {
    console.log(err);
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
    console.log(err);
    next(err);
  }
};

exports.createCart = async (req, res, next) => {
  const { userId, productId, qty } = req.body;
  try {
    const cart = new Cart({ userId, productId, qty });
    await cart.save();
    console.log("Cart saved successfully");
    res.status(200).json({ message: "Cart Created successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.deleteCart = async (req, res, next) => {
  const { id } = req.params;
  console.log("Delete Cart called", id);
  try {
    const cart = await Cart.findOneAndDelete({ _id: id });
    console.log(cart);
    if (cart) {
      res.status(200).json({ message: "Cart deleted successfully" });
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    console.log(err);
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
    console.log(err);
    next(err);
  }
};


exports.getOrder = async (req, res, next) => {
  const { id } = req.params;
  try {
    const orders = await Order.find({ userId: id }); // Fetch all orders for the user

    if (orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const product = await Product.findById(order.productId);
        const address = await Address.findById(order.addressId);

        return {
          ...order._doc, // Spread order details
          productDetails: product ? product._doc : null, 
          addressDetails: address ? address._doc : null, 
        };
      })
    );

    res.status(200).json(detailedOrders);
  } catch (err) {
    console.log(err);
    next(err);
  }
};


exports.getCart = async (req, res, next) => {
  const { id } = req.params;

  try {
    const cart = await Cart.find({ userId: id });
    console.log("cart uis", cart);
    if (cart) {
      res.status(200).json(cart);
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.adminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (err) {
    console.log(err);
    next(err);
  }
};

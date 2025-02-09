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
    const bdata = req.body.formData; // Array of orders
    const orders = ({...bdata, date : istDate})

    const newOrder = new Order(orders);
    await newOrder.save();
    



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
  const { userId, productId, qty } = req.body;
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
  const { id } = req.params;
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

      // Return the full order with product and address details
      return {
        orderId: order._id,
        userId: order.userId,
        paymentId: order.paymentId,
        paymentMode: order.paymentMode,
        billAmount: order.billAmount,
        date: order.date,
        status: order.status,
        products: products, // Attach the products array
        address: address ? address._doc : null // Attach address if exists
      };
    }));

    return res.status(200).json(detailedOrders);
    
  } catch (err) {
    console.error(err);
    next(err); // Pass the error to the error-handling middleware
  }
};




exports.getCart = async (req, res, next) => {
  const { id } = req.params;

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
    const skip = (page - 1) * limit;

    console.log("Vendor ID:", id, "Page:", page);

    // Fetch all orders containing products with the given vendor ID
    const orders = await Order.find({ "productsArray.vendorId": id })
      .skip(skip)
      .limit(limit);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Orders not found" });
    }

    // Iterate through orders to construct the vendor-specific response
    const venOrders = await Promise.all(
      orders.map(async (order) => {
        // Filter products belonging to the vendor
        const filteredProducts = order.productsArray.filter(
          (product) => product.vendorId === id
        );

        // Fetch additional details for the filtered products
        const productDetails = await Promise.all(
          filteredProducts.map(async (product) => {
            const productInfo = await Product.findById(product.productId);
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
          })
        );

        // Calculate total bill amount for this vendor's products in the order
        const venOrderAmount = filteredProducts.reduce(
          (sum, product) => sum + product.totalPrice,
          0
        );

        return {
          orderId: order._id,
          userId: order.userId,
          paymentId: order.paymentId,
          paymentMode: order.paymentMode,
          date: order.date,
          status: order.status,
          venOrderAmount,
          orderQty: order.quantity,
          productDetails,
          addressId: order.addressId,
        };
      })
    );

    // Count total orders for pagination metadata
    const totalOrders = await Order.countDocuments({ "productsArray.vendorId": id });
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      page,
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
     await Order.findByIdAndUpdate(orderId, {status : status}, {new : true});
    res.status(200).json({message : 'Order status updated successfully'});
  }catch(e){
    console.error('Error in updating order status',e);
    next(e);
  }
}



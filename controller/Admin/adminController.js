const Orders = require("../../models/orders/orders");
const Product = require("../../models/products/product");
const Address = require("../../models/users/addressSchema");


exports.analyticsData = async (req, res, next) => {
  try {
    const orders = await Orders.countDocuments();

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" }); // Send an error response
  }
};

exports.orders = async (req, res) => {
  const { id, pageNum } = req.params;
  console.log(`orders`, id, pageNum);
  try {
    const orders = await Orders.find({ vendorId: id })
      .skip((pageNum - 1) * 50)
      .limit(50);

    const populateOrder = await Promise.all(
      orders.map(async (order) => {
        const product = await Product.findOne({ _id: order.productId });
        const address = await Address.find({ _id: order.addressId });
        return {
          ...order.toObject(),
          productDetails: product,
          address,
        };
      })
    );

    const totalOrders = await Orders.countDocuments({ vendorId: id });
    res.status(200).json({
      totalPages: Math.ceil(totalOrders / 50),
      totalOrders,
      orders: populateOrder,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.VendorProducts = async (req, res) => {
  const { id, pageNum } = req.params;
  try {
    const products = await Product.find({ vendorId: id })
      .skip((pageNum - 1) * 50)
      .limit(50);

    const totalProducts = await Product.countDocuments({ vendorId: id });
    res.status(200).json({
      totalPages: Math.ceil(totalProducts / 50),
      totalProducts,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.handleDisplay = async (req, res) => {
  
  try {
    const product = await Product.findByIdAndUpdate( // Corrected method name
      req.body.id, // No need to wrap it in an object
      { display: req.body.display },
      { new: true }
    );
    res.status(200).json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


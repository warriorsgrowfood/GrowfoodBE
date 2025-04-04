const Product = require("../models/products/product");
const Brand = require("../models/products/brandSchema");
const Category = require("../models/products/categories");
const SubCategory = require("../models/products/SubCategory");
const Unit = require("../models/products/unitSchema");
const axios = require('axios');
const Distributor = require("../models/users/auth");
const User = require("../models/users/auth");






async function calculateDistance(address1, address2, vendorId, radius) {
  if (!address1 || !address2) return { error: "Missing origin or destination address" };
  if (!vendorId || !radius || isNaN(radius)) return { error: "Invalid vendorId or radius" };

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
      params: {
        origins: address1,
        destinations: address2,
        key: "AIzaSyAi2MQyWnPyrSAY_jny04NPMKWoXZH5M1c", // TODO: Move to .env in production
        units: "metric",
      },
    });

    const data = response.data;
    if (data.rows.length && data.rows[0].elements.length) {
      const element = data.rows[0].elements[0];
      if (element.status === "OK") {
        const distanceValue = element.distance.value;
        const radiusInMeters = Number(radius) * 1000;
        return distanceValue <= radiusInMeters ? vendorId : null;
      }
      return { error: `Distance Matrix API error: ${element.status}` };
    }
    return { error: "No results found" };
  } catch (error) {
    return { error: `An error occurred: ${error.message}` };
  }
}

exports.getProducts = async (req, res, next) => {
  try {
    const { page, address } = req.params;
    
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "User address is required",
      });
    }
    
    const result = await getProductsGlobally(parseInt(page), address, 50);
    res.status(result.status).json(result.response);
  } catch (error) {
    next(error);
    console.error("Error in getProducts:", error);
  }
};

const getProductsGlobally = async (page, address, limit, filterBy) => {
  try {
    const vendors = await User.find({ userType: "Vendor" });
    if (!vendors.length) {
      return {
        status: 404,
        response: { success: false, message: "No vendors found" },
      };
    }

    const nearbyVendorIds = [];
    for (const vendor of vendors) {
      if (!vendor.shopAddress || !vendor.radius || isNaN(vendor.radius)) continue;

      const result = await calculateDistance(address, vendor.shopAddress, vendor._id, vendor.radius);
      if (result && !result.error) nearbyVendorIds.push(result);
    }

    if (!nearbyVendorIds.length) {
      return {
        status: 200,
        response: {
          success: true,
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false },
          message: "No nearby vendors found",
        },
      };
    }

    let productFilter = { vendorId: { $in: nearbyVendorIds } };
    if (filterBy === "brand") productFilter.Brand = filterBy;
    if (filterBy === "category") productFilter.Category = filterBy;

    const filteredProducts = await Product.find(productFilter);
    const totalFilteredProducts = filteredProducts.length;

    const skip = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(skip, skip + limit);

    return {
      status: 200,
      response: {
        success: true,
        data: paginatedProducts,
        pagination: {
          total: totalFilteredProducts,
          page,
          limit,
          totalPages: Math.ceil(totalFilteredProducts / limit),
          hasNextPage: page * limit < totalFilteredProducts,
        },
      },
    };
  } catch (error) {
    console.error("Error in getProductsGlobally:", error);
    return {
      status: 500,
      response: { success: false, message: "Server error", error: error.message },
    };
  }
};

exports.getProduct = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  const productData = req.body;

  try {
    const existingBrand = await Brand.findOne({ name: productData.brand });
    if (!existingBrand) {
      let newBrand = new Brand({ name: productData.brand });
      await newBrand.save();
    }

    // Creating Categories
    const existingCategories = await Category.findOne({
      name: productData.categories,
    });
    if (!existingCategories) {
      let newCategories = new Category({ name: productData.categories });
      await newCategories.save();
    }

    const newProduct = new Product(productData);
    await newProduct.save();
    res.status(200).json({ message: "Product created successfully" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  const formData = req.body.formData;
  const id = formData._id;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $set: {
          name: formData.name,
          description: formData.description,
          brand: formData.brand,
          categories: formData.categories,
          subCategory: formData.subCategory,
          image: formData.image,
          discount: formData.discount,
          price: formData.price,
          display: formData.display ?? true,
          sellingPrice: formData.sellingPrice,
          productQty: formData.productQty,
          minimumOrderQty: formData.minimumOrderQty,
          availableQty: formData.availableQty,
          foodPrefence: formData.foodPrefence,
          life: formData.life,
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product updated" });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.subProduct = async (req, res, next) => {
  try {
    const { subCategory } = req.params;

    const products = await Product.find({ subCategory: subCategory });
    if (products) {
      res.status(200).json(products);
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndDelete({ _id: id });
    if (product) {
      res.status(200).json({ message: "Product deleted" });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500);
    next(err);
  }
};

// Getting Brands
exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.find();
    const updatedBrands = brands.map(brand => ({
      ...brand._doc,
      icon: convertToHttps(brand.icon), // Convert the icon URL
    }));
    res.status(200).json(updatedBrands);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

const convertToHttps = (url) => {
  if (typeof url === 'string' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url; // Return original URL if it's already https or not a string
};

exports.getBrandsProduct = async (req, res) => {
  const { brand } = req.params;

  try {
    const { page } = req.params || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const products = await Product.find({ brand: brand })
      .skip(skip)
      .limit(limit);
    const totalProducts = await Product.countDocuments({ brand: brand });
    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit),
        hasNextPage: page * limit < totalProducts,
      },
    });
  } catch (err) {
    console.error("Error in Searching:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

exports.updateBrands = async (req, res, next) => {
  const { id } = req.params;
  const { name, icon } = req.body;

  try {
    const brand = await Brand.findByIdAndUpdate(
      id,
      { name, icon },
      { new: true }
    );

    if (brand) {
      res.status(200).json({ message: "Brand updated successfully", brand });
    } else {
      res.status(404).json({ message: "Brand not found" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.createBrand = async (req, res, next) => {
  const { name, icon } = req.body;

  try {
    const existingBrand = await Brand.findOne({ name });
    if (!existingBrand) {
      let newBrand = new Brand({ name, icon });
      await newBrand.save();
      res.status(200).json({ message: "Brand created" });
    } else {
      res.status(201).json({ message: "Brand Exists" });
    }
  } catch (e) {
    console.error(e);
    next(e);
  }
};

exports.deleteBrand = async (req, res, next) => {
  const { id } = req.params;
  try {
    const brand = await Brand.findByIdAndDelete({ _id: id });
    if (brand) {
      res.status(200).json();
    } else {
      res.status(404).json({ message: "Brand not found" });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    let { name, icon } = req.body;
    name = name.toLowerCase();

    const existingCategory = await Category.findOne({ name });
    if (!existingCategory) {
      let newCategory = new Category({ name, icon });
      await newCategory.save();
      res.status(200).json({ message: "Category created" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Getting Categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    const updatedCategories = categories.map(cat=>({
      ...cat._doc,
      icon: convertToHttps(cat.icon),
    }))
    res.status(200).json(updatedCategories);
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name, icon } = req.body;
  try {
    const category = await Category.findByIdAndUpdate(
      id,
      { name, icon },
      { new: true }
    );
    if (category) {
      res.status(200).json({ message: "Category updated" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (err) {
    console.log("Error updating category", err);
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const category = await Category.findByIdAndDelete({ _id: id });
    if (category) {
      res.status(200).json({ message: "Category deleted" });
    } else {
      res.status(404).json({ message: "Error deleting category" });
    }
  } catch (err) {
    console.log("Error deleting category", err);
    next(err);
  }
};

exports.createUnit = async (req, res, next) => {
  try {
    const unit = new Unit({ name: req.body.formData });
    await unit.save();
    res.status(200).json({ message: "Unit saved successfully" });
  } catch (err) {
    console.log("Error creating unit", err);
    next(err);
  }
};

exports.getUnit = async (req, res, next) => {
  try {
    const units = await Unit.find();
    res.status(200).json(units);
  } catch (err) {
    console.log("Error getting", err);
    next(err);
  }
};

//----------------------------Sub Category----------------------------------------

exports.CreateSubCategory = async (req, res, next) => {
  try {
    const { formData } = req.body;
    const item = new SubCategory({
      name: formData.name,
    });
    await item.save();
    res.status(200).json(item);
  } catch (err) {
    console.log("Error getting", err);
    next(err);
  }
};

exports.getSubCategory = async (req, res, next) => {
  try {
    const subCategory = await SubCategory.find({});
    res.status(200).json(subCategory);
  } catch (err) {
    console.log("Error getting", err);
    next(err);
  }
};

// -------------Search controller --------------------------------



exports.searchController = async (req, res, next) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }

  try {
    const products = await Product.find({
      $or: [
        { brand: { $regex: query, $options: "i" } },
        { categories: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    }).limit(10);

    const brands = await Brand.find({
      name: { $regex: query, $options: "i" },
    }).limit(10);

    const categories = await Category.find({
      name: { $regex: query, $options: "i" },
    }).limit(10);

    const distributors = await Distributor.find({
      name: { $regex: query, $options: "i" }, userType : 'Vendor',
    }).limit(10);

    const resultWithTypes = [
      ...products.map(product => ({ ...product.toObject(), type: "product" })),
      ...brands.map(brand => ({ ...brand.toObject(), type: "brand" })),
      ...categories.map(category => ({ ...category.toObject(), type: "category" })),
      ...distributors.map(distributor => ({ ...distributor.toObject(), type: "distributor" })),
    ];

    return res.status(200).json(resultWithTypes);
  } catch (err) {
    console.error("Error in Searching:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

exports.filterController = async (req, res, next) => {
  console.log("filterController", req.params)
  const { type, value, page, address } = req.query;


  try {
    let filteredResults;
  

    switch (type) {
      case "brand":
        filteredResults = await getProductsGlobally(page, address, 50, type);
        break;
      case "category":
        // Call getProductsGlobally for brand and category
        filteredResults = await getProductsGlobally(page, address, 50, type);
        break;
        
      case "distributor":
        // Directly fetch products based on vendorId
        filteredResults = await Product.find({ vendorId: value });
        break;
        
      default:
        return res.status(400).json({ success: false, message: "Invalid filter type" });
    }

    return res.status(200).json({
      success: true,
      data: filteredResults,
      pagination: {
        total: filteredResults.length,
        page: parseInt(page) || 1,
        limit: 50,
        totalPages: Math.ceil(filteredResults.length / 50),
        hasNextPage: filteredResults.length > page * 50,
      },
    });
  } catch (err) {
    console.error("Error in Filtering:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

exports.categoriesProduct = async (req, res, next) => {
  const { category } = req.params;

  try {
    const { page } = req.params || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const products = await Product.find({ categories: category.toLowerCase() })
      .skip(skip)
      .limit(limit);
    const totalProducts = await Product.countDocuments({
      categories: category.toLowerCase(),
    });
    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(products.length / limit),
        total: totalProducts,
        hasNextPage: page * limit < totalProducts,
      },
    });
  } catch (err) {
    console.error("Error in Searching:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

exports.bulkCreate = async (req, res, next) => {
  const { formData } = req.body;

  try {
    if (formData?.length === 0) {
      res.status(400).json({ message: "Atleast one product have to create." });
    }
    await Product.insertMany(formData);
    res.status(200).json({ message: "Products successfully created" });
  } catch (err) {
    console.error("Error in bulk creation", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.params.page) || 1; // Parse page as an integer and set default to 1
    const limit = 50;
    const skip = (page - 1) * limit;

    

    const products = await Product.aggregate([
      {
        $addFields: {
          totalRating: { $sum: "$rating.rating" }, // Calculate the total rating sum
        },
      },
      {
        $sort: { totalRating: -1 }, // Sort by totalRating in descending order
      },
      {
        $skip: skip, // Skip documents for pagination
      },
      {
        $limit: limit, // Limit the number of documents
      },
    ]);

    const totalProducts = await Product.countDocuments();

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit),
        total: totalProducts,
        hasNextPage: page * limit < totalProducts,
      },
    });
  } catch (e) {
    console.error("Error in fetching top-rated products", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


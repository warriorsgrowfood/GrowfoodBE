const express = require("express");
const router = express.Router();



const {
  getProducts,
  createProduct,
  getBrands,
  searchController,
  getCategories,
  getProduct,
  updateProduct,
  createBrand,
  updateBrands,
  deleteBrand,
  createCategory,
  deleteProduct,
  deleteCategory,
  updateCategory,
  bulkCreate,
  getTopRatedProducts,
  getBrandsProduct,
  createUnit, getUnit, subProduct, CreateSubCategory, getSubCategory, categoriesProduct,
  filterController
} = require("../controller/productController"); 



// ---------------Products Routes --------------------
router.get("/getAllProducts", getProducts);
router.get("/product/:id", getProduct);
router.put("/updateProduct", updateProduct);
router.delete("/deleteProduct/:id", deleteProduct);
router.post("/", createProduct);
router.get("/subProduct/:subCategory", subProduct)
router.get('/search/searchInDatabase', searchController)
router.get('/filter', filterController)
router.get('/categoriesProduct/:category/:page', categoriesProduct)
router.get('/brandsProduct/:brand/:page', getBrandsProduct)
router.post('/products/bulkCreate', bulkCreate)
router.get('/topratedproducts/:page', getTopRatedProducts)


// _____________________Brand Routes______________________

router.get("/brands", getBrands);
router.put("/updateBrand/:id",  updateBrands);
router.post("/createBrand", createBrand);
router.delete("/deleteBrand/:id", deleteBrand);


// ______________________Category Routes_____________________
router.post("/createCategory", createCategory);
router.get("/category", getCategories);
router.put("/updateCategory/:id", updateCategory);
router.delete("/deleteCategory/:id", deleteCategory);

//______________________Sub Category Routes____________________
router.post("/createSubCategory", CreateSubCategory);
router.get("/getSubCategory", getSubCategory);


// _______________________Unit Routes_________________________
router.get("/getUnit", getUnit)
router.post("/createUnit", createUnit);


module.exports = router;

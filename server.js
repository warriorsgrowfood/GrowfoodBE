const express = require('express');
const bodyParser = require('body-parser');
const productRoutes = require('./routes/productRoutes');  
const errorHandler = require('./middleware/errorHanlder');
const cors = require('cors');
const auth = require('./routes/usersRoute') 
const order = require('./routes/orderRoutes');
const admin = require('./routes/adminRoutes');
const connectDb = require('./config/db')
const vendorRoute = require('./routes/vendorRoutes')
const activity = require('./routes/activityRoutes')

require('dotenv').config();


const app = express();
const port = 5000;

// Middleware
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
app.use(bodyParser.json({limit : '5mb'}));
app.use(bodyParser.urlencoded({limit : '5mb', extended : true}));

// Database
connectDb();

// Routes
app.use('/api/products', productRoutes);  
app.use('/api/users', auth)
app.use('/api/orders', order)
app.use('/api/admin', admin)
app.use('/api/vendors', vendorRoute)
app.use('/api/activity', activity)

// Handling errors
app.use(errorHandler);

// Starting server
app.listen(port, () => {
    console.log('Server listening on port', port);
});

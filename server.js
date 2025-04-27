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
const firebaseAdmin = require('firebase-admin');
const verifyToken = require('./config/verification')

require('dotenv').config();

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert({
    type: process.env.FBTYPE,
  project_id: process.env.FB_PID,
  private_key_id: process.env.FB_PKID,   
  private_key: process.env.FB_P.replace(/\\n/g, '\n'), 
  client_email: process.env.FB_C_EMAIL,
  client_id: process.env.FB_CID,
  auth_uri: process.env.FB_AURI,
  token_uri: process.env.FB_TOKEN,
  auth_provider_x509_cert_url: process.env.FB_AUTHP,
  client_x509_cert_url: process.env.FB_CXCU,
  universe_domain: process.env.FB_UD || 'googleapis.com',
  }),
})

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
app.use('/api/products', verifyToken, productRoutes);  
app.use('/api/users', auth)
app.use('/api/orders', verifyToken, order)
app.use('/api/admin', admin)
app.use('/api/vendors', vendorRoute)
app.use('/api/activity',verifyToken, activity)

// Handling errors
app.use(errorHandler);

// Starting server
app.listen(port, () => {
    console.log('Server listening on port', port);
});

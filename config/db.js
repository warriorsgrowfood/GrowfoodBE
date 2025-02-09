require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const connectDb = async() => {
    try{
        // const connection = await mongoose.connect('mongodb://localhost:27017/growFood',)
        const connection = await mongoose.connect(MONGODB_URI,)
        console.log("Connected to Database ");
    }catch(e){
        console.error("Error connecting to Database ", e);
        process.exit(1);
    }
}

module.exports = connectDb;
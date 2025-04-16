const jwt = require('jsonwebtoken');
const User = require('../models/users/auth');


const verifyToken = async(req, res, next) => {
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader){
            return res.status(403).json({message: 'Unauthorized Access'});
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
   
        const user = await User.findById(decoded.id);
        console.log(user)
        if(!user){
            return res.status(420).json({message: 'Token but not user'});
        }
        req.user = user;
        console.log('Verified')
        console.log('Access granted', user._id);
        next();
    }catch(e){
        console.error('Error authenticating token', e);
        return res.status(401).json({message: 'Unauthorized'});
    }
};

module.exports = verifyToken;
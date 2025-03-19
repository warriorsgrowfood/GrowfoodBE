const User = require('../../models/users/auth')
const Notification = require('../../models/activity/notification')

exports.getNotification = async(req, res, next)=>{
    const {id} = req.params;
    try{
        const notificationData  = await Notification.find({userId : id});
        res.status(200).json(notificationData);
    }catch(e){
        console.error('Error in getting notification ', e )
        next(e);
    }
}

exports.updateNotificationSeen = async(req, res, next)=>{
    try{
        const {isSeen, id} = req.body;
        await Notification.findByIdAndUpdate(id, {isSeen : isSeen}, {new : true})
        res.status(200).json({message : 'Updated seen '})
    }catch{
        console.error(e)
        next(e);
    }
}
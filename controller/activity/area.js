
const Area = require('../../models/activity/area');


exports.createArea = async(req, res)=>{
    try{
        const area = new Area(req.body);
        await area.save();
        res.status(200).json(area);
    } catch(err){
        res.status(400).json({message: err.message});
    }
}

exports.getArea = async(req, res)=>{
    const {city} = req.params;
    console.log(city);
    try{
        const area = await Area.find({district : city});
        console.log(area);
        res.status(200).json(area);
    } catch(err){
        res.status(500).json({message: err.message});
    }
}
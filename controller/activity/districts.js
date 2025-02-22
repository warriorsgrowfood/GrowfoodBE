const District = require('../../models/activity/districts');
exports.getDistrict = async(req, res)=>{
	const {state} = req.params;
	try{
		const districts = await District.find({state : state})
		res.status(200).json(districts)
	}catch(err){
		console.error('error in getting districts', err);
		res.status(500).json({error : 'Server Error'})
	}
}

exports.getState = async (req, res) => {
    try {
        const states = await District.distinct("state");

        res.status(200).json(states);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};


const Slider = require('../../models/activity/slider');

exports.getSliders = async (req, res, next) => {
    try {
        const sliders = await Slider.find();
        res.status(200).json(sliders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addSlider = async (req, res, next) => {
    try {
        const slider = new Slider(req.body);
        await slider.save();
        res.status(200).json({ message: 'Slider added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
const express = require('express');
const User = require('../models/user');
const Task = require('../models/task');
const router = new express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const multerObj = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload jpg|jpeg|png file only!'));
        }

        cb(undefined, true)
    }
});

router.post('/users', async (req, res) => {
    const user = new User(req.body);

    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.status(201).send({user, token});
    } catch(e) {
        res.status(400).send(e);
    }
})

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findUserByCredential(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({user, token});
    } catch (error) {
        res.status(500).send(error);
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((item) => item.token !== req.token);
        await req.user.save();
        res.send();
    } catch (error) {
        res.status(500).send();
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.send();
    } catch (error) {
        res.status(500).send();
    }
})

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
})

router.get('/users/:id', async (req, res) => {
    const _id = req.params.id;

    try {
        const user = await User.findById(_id);
        if(!user) {
            res.status(404).send();
        }
        res.send(user);
    } catch (e) {
        res.status(500).send();
    }
})

router.patch('/users/me', auth, async (req, res) => {
    const validateProperties = Object.keys(req.body);
    const allowedProperties = ['name', 'email', 'password', 'age'];
    const isValid = validateProperties.every((property) => allowedProperties.includes(property));

    if (!isValid) {
        res.status(400).send({
            error: 'Not Valid Property!'
        })
    }

    try {
        validateProperties.forEach((property) => req.user[property] = req.body[property]);
        await req.user.save();

        res.send(req.user);
    } catch (error) {
        res.status(500).send(error);
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user._id);
        await Task.deleteMany({ owner: req.user._id });
        if (!user) {
            res.status(404).send();
        }
        res.send(req.user);
    } catch (error) {
        res.status(500).send(error);
    }
})

router.post('/users/me/avatar', auth, multerObj.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width:250, height: 250 }).png().toBuffer();
    req.user.avatar = buffer;

    await req.user.save();
    res.send();
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message });
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
})

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
    
        if (!user || !user.avatar) {
            throw new Error('Not able to fetch!');
        }

        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch (error) {
        res.status(400).send();
    }
})

module.exports = router;

const express = require('express');
const Task = require('../models/task');
const router = new express.Router();
const auth = require('../middleware/auth');

router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });

    try {
        const newTask = await task.save();
        res.status(201).send(newTask);
    } catch (e) {
        res.status(400).send(e);
    }
})

// tasks/completed=true
// tasks/limit=4&skip=2
// tasks/sortBy=createdAt:decs
router.get('/tasks', auth, async (req, res) => {
    const match = {};
    const sort = {};

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        })
        res.send(req.user.tasks);
    } catch (e) { 
        res.status(500).send(e);
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;
    try {
        const task = await Task.findOne({ _id, owner: req.user._id });
        if(!task) {
            res.status(404).send();
        }
        res.send(task);
    } catch (e) {
        res.status(500).send();
    }
})

router.patch('/tasks/:id', auth, async (req, res) => {
    const validateProperties = Object.keys(req.body);
    const allowedProperties = ['description', 'completed'];
    const isValid = validateProperties.every((property) => allowedProperties.includes(property));

    if (!isValid) {
        res.status(400).send({
            error: 'Not Valid Property!'
        })
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id});
        if (!task) {
            res.status(404).send();
        }
        validateProperties.forEach((property) => task[property] = req.body[property]);
        await task.save();
        res.send(task);
    } catch (error) {
        res.status(500).send(error);
    }
})

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
        if (!task) {
            res.status(404).send();
        }
        res.send(task);
    } catch (error) {
        res.status(500).send(error);
    }
})

module.exports = router;

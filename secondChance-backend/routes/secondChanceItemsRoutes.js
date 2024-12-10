const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase(); // Task 1: Retrieve the database connection
        const collection = db.collection("secondChanceItems"); // Task 2: Retrieve the secondChanceItems collection
        const secondChanceItems = await collection.find({}).toArray(); // Task 3: Fetch all secondChanceItems
        res.json(secondChanceItems); // Task 4: Return the secondChanceItems
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'), async(req, res, next) => { // Task 7: Upload the image to the images directory
    try {
        const db = await connectToDatabase(); // Task 1: Retrieve the database connection
        const collection = db.collection("secondChanceItems"); // Task 2: Retrieve the secondChanceItems collection

        let secondChanceItem = req.body; // Task 3: Create a new secondChanceItem from the request body

        const lastItemQuery = await collection.find().sort({'id': -1}).limit(1); // Task 4: Get the last id
        await lastItemQuery.forEach(item => {
            secondChanceItem.id = (parseInt(item.id) + 1).toString(); // Increment the id by 1
        });

        const date_added = Math.floor(new Date().getTime() / 1000); // Task 5: Set the current date
        secondChanceItem.date_added = date_added;

        secondChanceItem = await collection.insertOne(secondChanceItem); // Task 6: Add the secondChanceItem to the database

        res.status(201).json(secondChanceItem.ops[0]);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase(); // Task 1: Retrieve the database connection
        const collection = db.collection("secondChanceItems"); // Task 2: Retrieve the secondChanceItems collection

        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id: id }); // Task 3: Find a specific secondChanceItem by ID

        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found"); // Task 4: Return an error message if the item is not found
        }
        res.json(secondChanceItem); // Task 4: Return the secondChanceItem as a JSON object
    } catch (e) {
        next(e);
    }
});

// Update an existing item
router.put('/:id', async(req, res, next) => {
    try {
        const db = await connectToDatabase(); // Task 1: Retrieve the database connection
        const collection = db.collection("secondChanceItems"); // Task 2: Retrieve the secondChanceItems collection

        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id }); // Task 3: Check if the secondChanceItem exists

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" }); // Task 3: Send an appropriate message if it doesn't exist
        }

        // Task 4: Update the item's attributes
        secondChanceItem.category = req.body.category;
        secondChanceItem.condition = req.body.condition;
        secondChanceItem.age_days = req.body.age_days;
        secondChanceItem.description = req.body.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1));
        secondChanceItem.updatedAt = new Date();

        const updatepreloveItem = await collection.findOneAndUpdate(
            { id },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );

        // Task 5: Send confirmation
        if (updatepreloveItem) {
            res.json({ "uploaded": "success" });
        } else {
            res.json({ "uploaded": "failed" });
        }
    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res, next) => {
    try {
        const db = await connectToDatabase(); // Task 1: Retrieve the database connection
        const collection = db.collection("secondChanceItems"); // Task 2: Retrieve the secondChanceItems collection

        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id }); // Task 3: Find a specific secondChanceItem by ID

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" }); // Task 3: Send an appropriate message if it doesn't exist
        }

        await collection.deleteOne({ id }); // Task 4: Delete the object
        res.json({ "deleted": "success" }); // Task 4: Send an appropriate message
    } catch (e) {
        next(e);
    }
});

module.exports = router;

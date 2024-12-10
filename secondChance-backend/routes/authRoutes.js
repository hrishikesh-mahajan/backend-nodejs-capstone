const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const router = express.Router();
const dotenv = require('dotenv');
const pino = require('pino');  // Import Pino logger
dotenv.config();

const logger = pino();  // Create a Pino logger instance

//Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();

        // Task 2: Access MongoDB `users` collection
        const collection = db.collection("users");

        // Task 3: Check if user credentials already exist in the database and throw an error if they do
        const existingEmail = await collection.findOne({ email: req.body.email });
        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }

        // Task 4: Create a hash to encrypt the password so that it is not readable in the database
        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);

        // Task 5: Insert the user into the database
        const email = req.body.email;

        //Save user details
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });

        // Task 6: Create JWT authentication if passwords match with user._id as payload
        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };

        //Create JWT
        const authtoken = jwt.sign(payload, JWT_SECRET);

        // Task 7: Log the successful registration using the logger
        logger.info('User registered successfully');

        // Task 8: Return the user email and the token as a JSON
        res.json({ authtoken, email });
    } catch (e) {
        logger.error(e);
        return res.status(500).send('Internal server error');
    }
});

//Login Endpoint
router.post('/login', async (req, res) => {
    console.log("\n\n Inside login")

    try {
        // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();

        // Task 2: Access MongoDB `users` collection
        const collection = db.collection("users");

        // Task 3: Check for user credentials in database
        const theUser = await collection.findOne({ email: req.body.email });

        if (theUser) {
            // Task 4: Check if the password matches the encrypted password and send appropriate message on mismatch
            let result = await bcryptjs.compare(req.body.password, theUser.password)
            if (!result) {
                logger.error('Passwords do not match');
                return res.status(404).json({ error: 'Wrong pasword' });
            }

            // Task 5: Fetch user details from a database
            let payload = {
                user: {
                    id: theUser._id.toString(),
                },
            };

            const userName = theUser.firstName;
            const userEmail = theUser.email;

            // Task 6: Create JWT authentication if passwords match with user._id as payload
            const authtoken = jwt.sign(payload, JWT_SECRET);
            logger.info('User logged in successfully');
            return res.status(200).json({ authtoken, userName, userEmail });
            // Task 7: Send appropriate message if the user is not found
        } else {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (e) {
        logger.error(e);
        return res.status(500).json({ error: 'Internal server error', details: e.message });
    }
});

module.exports = router;
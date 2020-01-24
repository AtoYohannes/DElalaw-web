const functions = require('firebase-functions');


const express = require('express');
const app = express();

const FBAuth = require('./util/fbAuth')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

// ==================== ITEMS HANDLERS =========================>

const { getAllItems, postAnItem, getItem } = require('./handlers/items');

app.get('/items', getAllItems);
app.post('/item', FBAuth, postAnItem);
app.get('/item:itemId', getItem);


// ==================== USERS HANDLERS =========================>

const { signUp, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');

app.post('/signUp', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);



exports.api = functions.https.onRequest(app);

const functions = require('firebase-functions');
const express = require('express');
const app = express();
const FBAuth = require('./util/fbAuth')
const { db } = require('./util/admin')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

// ==================== ITEMS HANDLERS =========================>

const { getAllItems,
    postAnItem,
    getItem,
    likeItem,
    unlikeItem,
    deleteItem } = require('./handlers/items');

app.get('/items', getAllItems);
app.post('/item', FBAuth, postAnItem);
app.get('/item/:itemID', getItem);
app.delete('/item/:itemID', FBAuth, deleteItem)
app.get('/item/:itemID/like', FBAuth, likeItem);
app.get('/item/:itemID/unlike', FBAuth, unlikeItem);


// ==================== USERS HANDLERS =========================>

const { signUp,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    rateUser,
    getUserDetails,
    markNotificationRead
} = require('./handlers/users');

app.post('/signUp', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notification', FBAuth, markNotificationRead)
app.post('/rate_User/:userID/rating', FBAuth, rateUser);



exports.api = functions.https.onRequest(app);

exports.deleteNotificationOnUnLike = functions
    .firestore.document('item_likes/{id}')
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
                return;
            });
    });

exports.createNotificationOnLike = functions
    .firestore.document('item_likes/{id}')
    .onCreate((snapshot) => {
        return db
            .doc(`/items/${snapshot.data().itemId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        read: false,
                        itemID: doc.id
                    });
                }
            })
            .catch((err) => console.error(err));
    });

exports.onUserImageChange = functions
    .firestore.document('/users/{userId}')
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            console.log('image has changed');
            const batch = db.batch();
            return db
                .collection('items')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const item = db.doc(`/items/${doc.id}`);
                        batch.update(item, { userImage: change.after.data().imageUrl });
                    });
                    return batch.commit();
                });
        } else return true;
    });

exports.onItemDelete = functions
    .firestore.document('/items/{itemID}')
    .onDelete((snapshot, context) => {
        const itemID = context.params.itemID;
        const batch = db.batch();
        return db
            .collection('item_likes')
            .where('itemId', '==', itemID)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/item_likes/${doc.id}`));
                });
                return db
                    .collection('notifications')
                    .where('itemID', '==', itemID)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((err) => console.error(err));
    });
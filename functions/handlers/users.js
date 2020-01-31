const { admin, db } = require('../util/admin')

const firebaseConfig = require('../util/firebaseConfig')

const firebase = require('firebase');

firebase.initializeApp(firebaseConfig);

const { validateSignUpData, validateLoginData, reduceUserDetails } = require('../util/validators')



// ===================== SIGNUP ==============================?

exports.signUp = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle,
    };

    const { valid, errors } = validateSignUpData(newUser);

    if (!valid) return response.status(400).json(errors);

    const noImg = 'no-img.png';

    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return response.status(400).json({ handle: 'this handle is already taken' });
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid;
            // const userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
                userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch(err => {
            console.error(err);

            if (err.code === "auth/email-already-in-use") {
                return response.status(400).json({ email: 'email is already in use' });
            }
            else {
                return response.status(500).json({ general: "Something went wrong, Please try again" });

            }
        })
};
// ===================== LOGIN ==============================?

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    };

    const { valid, errors } = validateLoginData(user);

    if (!valid) return response.status(400).json(errors);


    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        }).then(token => {
            return response.json({ token })
        }).catch(err => {
            console.error(err);

            if (err.code === "auth/wrong-password") {
                return response.status(400).json({ general: 'Invalid Credentials' });
            } else {
                return response.status(500).json({ general: "Something went wrong, Please try again" });
            }
        });
};
// ===================== UPLOAD IMAGE ==============================?

exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);

    db.doc(`/users/${request.user.handle}`)
        .update(userDetails)
        .then(() => {
            return response.json({ message: 'Details added successfully' });
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({ general: "Something went wrong, Please try again" });
        });
};

// ===================== UPLOAD PROFILE IMAGE ==============================?
exports.uploadImage = (request, response) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: request.headers });

    let imageToBeUploaded = {};
    let imageFileName;

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(fieldname, file, filename, encoding, mimetype);
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return response.status(400).json({ error: 'Wrong file type submitted' });
        }
        // my.image.png => ['my', 'image', 'png']
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        // 32756238461724837.png
        imageFileName = `${Math.round(
            Math.random() * 1000000000000
        ).toString()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
                    firebaseConfig.storageBucket
                    }/o/${imageFileName}?alt=media`;
                return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                return response.json({ message: 'image uploaded successfully' });
            })
            .catch((err) => {
                console.error(err);
                return response.status(500).json({ error: 'something went wrong' });
            });
    });
    busboy.end(request.rawBody);
};

// ===================== GET AUTHENTICATED USER ==============================?

exports.getAuthenticatedUser = (request, response) => {

    let userData = {};

    db.doc(`/users/${request.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection('user_ratings')
                    .where('userHandle', '==', request.user.handle)
                    .get();
            }
        })
        .then(data => {
            userData.ratings = [];
            data.forEach(doc => {
                userData.ratings.push(doc.data());
            });

            return db.collection('notifications').where('recipient', '==', request.user.handle).get();
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach((doc) => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    read: doc.data().read,
                    itemId: doc.data().itemId,
                    createdAt: doc.data().createdAt
                });
            });
            return response.json(userData);
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({ general: "Something went wrong, Please try again" });
        });
};

// ===================== RATE USER ==============================?

exports.rateUser = (req, res) => {
    // if (req.body.description.trim() === '')
    //     return res.status(400).json({ comment: 'Must not be empty' });

    // const newRating = {
    //     description: req.body.description,
    //     createdAt: new Date().toISOString(),
    //     userHandle: req.params.userId,
    //     ratorHandle: req.user.handle,
    //     userImage: req.user.imageUrl
    // };
    // console.log(newRating);

    // db.doc(`/users/${req.params.userId}`)
    //     .get()
    //     .then((doc) => {
    //         if (!doc.exists) {
    //             return res.status(404).json({ error: 'user not found' });
    //         }
    //     })
    //     .then(() => {
    //         return db.collection('user_ratings').add(newRating);
    //     })
    //     .then(() => {
    //         res.json(newRating);
    //     })
    //     .catch((err) => {
    //         console.log(err);
    //         res.status(500).json({ error: 'Something went wrong' });
    //     });
};
// ===================== GETTING USER DETAIL ==============================?

exports.getUserDetails = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.params.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.user = doc.data();
                return db.collection('items').where('userHandle', '==', request.params.handle).get();
            } else {
                return response.status(404).json({ error: 'user not found' });
            }
        })
        .then(data => {
            userData.items = [];
            data.forEach(doc => {
                userData.items.push({
                    itemName: doc.data().itemName,
                    createdAt: doc.data().createdAt,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage,
                    userHandle: doc.data().userHandle,
                    itemId: doc.id,
                });
            });
            response.json(userData);
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({ general: "Something went wrong, Please try again" });
        });
};
// ===================== MARK NOTIFICATION AS READ ==============================?

exports.markNotificationRead = (request, response) => {
    let batch = db.batch();
    request.body.forEach((notificationId) => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true });
    });
    batch
        .commit()
        .then(() => {
            return response.json({ message: 'Notifications marked as read' });
        })
        .catch((err) => {
            console.error(err);
            return response.status(500).json({ general: "Something went wrong, Please try again" });
        });
};

// ===================== RATE USER ==============================?


const { db } = require('../util/admin')

// ==================== GET ALL ITEMS =========================>

exports.getAllItems = (request, response) => {
    db.collection('items')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let items = [];
            data.forEach(doc => {
                items.push({
                    itemID: doc.id,
                    itemName: doc.data().itemName,
                    userHandle: doc.data().userHandle,
                    viewCount: doc.data().viewCount,
                    createdAt: doc.data().createdAt,
                    userImage: doc.data().userImage
                });
            });
            return response.json(items);
        })
        .catch(err => console.error(err))
};

// ==================== POST AN ITEM =========================>

exports.postAnItem = (request, response) => {
    const newItem = {
        itemName: request.body.itemName,
        description: request.body.description,
        category: request.body.category,
        price: request.body.price,
        condition: request.body.condition,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
    };
    db.collection('items')
        .add(newItem)
        .then(doc => {
            const resItem = newItem;
            resItem.itemId = doc.id;
            response.json(resItem);
        })
        .catch(err => {
            response.status(500).json({
                error: 'someting went wrong'
            });
            console.error(err);
        })
};

// ==================== GET ONE ITEM =========================>

exports.getItem = (request, response) => {
    let itemData = {};
    db.doc(`/items/${request.params.itemID}`).get()
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({ error: 'Item is not found' });
            }
            itemData = doc.data();
            itemData.itemID = doc.id;
            return db.collection('item_likes').where('itemId', '==', request.params.itemID)
                .get();
        }).then(data => {
            itemData.likes = [];
            data.forEach(doc => {
                itemData.likes.push(doc.data());
            });
            return response.json(itemData);
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({ error: err.code });
        });
};

// ==================== LIKE ITEM =========================>

exports.likeItem = (request, response) => {
    const likeItem = db.collection('item_likes').where('userHandle', '==', request.user.handle)
        .where('itemId', '==', request.params.itemID).limit(1);

    const itemDocumet = db.doc(`items/${request.params.itemID}`);

    let itemData;

    itemDocumet.get()
        .then(doc => {
            if (doc.exists) {
                itemData = doc.data();
                itemData.itemID = doc.id;
                return likeItem.get();
            } else {
                return response.status(404).json({ error: 'item has been removed' });
            }
        })
        .then(data => {
            if (data.empty) {
                return db.collection('item_likes').add({
                    itemId: request.params.itemID,
                    userHandle: request.user.handle,
                })
                    .then(() => {
                        itemData.likeCount++;
                        return itemDocumet.update({ likeCount: itemData.likeCount });
                    })
                    .then(() => {
                        return response.json(itemData);
                    })
            } else {
                return response.status(400).json({ error: "item already liked" });
            }
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({ error: err.code });
        });
}
// ==================== UNLIKE ITEM =========================>

exports.unlikeItem = (request, response) => {
    const likeItem = db.collection('item_likes').where('userHandle', '==', request.user.handle)
        .where('itemId', '==', request.params.itemID).limit(1);

    const itemDocumet = db.doc(`items/${request.params.itemID}`);

    let itemData;

    itemDocumet.get()
        .then(doc => {
            if (doc.exists) {
                itemData = doc.data();
                itemData.itemID = doc.id;
                return likeItem.get();
            } else {
                return response.status(404).json({ error: 'item has been removed' });
            }
        })
        .then(data => {
            if (data.empty) {
                return response.status(400).json({ error: "item already unliked" });
            } else {
                return db.doc(`/item_likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        itemData.likeCount--;
                        return itemDocumet.update({ likeCount: itemData.likeCount });
                    })
                    .then(() => {
                        return response.json(itemData);
                    })
            }
        })
        .catch(err => {
            console.error(err);
            return response.status(500).json({ error: err.code });
        });
};

// ==================== DELETE AN ITEM =========================>

exports.deleteItem = (request, response) => {
    const item = db.doc(`/items/${request.params.itemID}`);
    item.get()
    .then(doc => {
        if(!doc.exists) {
            return response.status(404).json({ error : 'item is not found'});
        }
        if(doc.data().userHandle !== request.user.handle) {
             return response.status(403).json ({error : ' Unauthorized'});
        } else {
            return item.delete();
        }
    })
    .then (() => {
        return response.json({message : 'item has been deleted'});
    })
    .catch(err => {
        console.error(err);
        return response.status(500).json({ error: err.code });
    });
}
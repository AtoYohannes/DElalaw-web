const { db } = require('../util/admin')

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
                    createdAt: doc.data().createdAt

                });
            });
            return response.json(items);
        })
        .catch(err => console.error(err))
};

exports.postAnItem = (request, response) => {
    const newItem = {
        itemName: request.body.itemName,
        userHandle: request.user.handle,
        createdAt: new Date().toISOString()
    };
    db.collection('items')
        // .orderBy('createdAt', 'desc')
        .add(newItem)
        .then(doc => {
            response.json({ message: `document ${doc.id} created successfully` })
        })
        .catch(err => {
            response.status(500).json({
                error: 'someting went wrong'
            });
            console.error(err);
        })
};

exports.getItem =(request) => {

}
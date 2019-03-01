const functions = require('firebase-functions');
const os = require('os');
const path = require('path');
const cors = require('cors')({
    origin: true,
});
const BusBoy = require('busboy');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');
//required to use firebase storage functions from http endpoint
const gcs = new Storage({
    projectId: 'fb-cloud-functions-demo-a3b08',
    keyFilename: 'fb-cloud-functions-demo-a3b08-firebase-adminsdk-92ycq-2fcdd41188.json'
  });

const bucket = gcs.bucket('fb-cloud-functions-demo-a3b08.appspot.com/');


//simple function to test Cors module is working
exports.helloWorld = functions.https.onRequest(function (request, response) {
    cors(request, response, () => {
         response.status(200).send("Hello from Firebase!");
    });
});

//download function
// exports.download = functions.https.onRequest((req, res) => {
//     const file = bucket.file(fileName);
// return file.getSignedUrl({
//   action: 'read',
//   expires: '03-09-2491'
// }).then(signedUrls => {
//   // signedUrls[0] contains the file's public URL
// });
// });

exports.uploadFile = functions.https.onRequest((req, res) => {
    //enable cross-oirgin resource sharing
    cors(req, res, () => {
        //enforce POST policy only for data upload request
        if (req.method !== 'POST'){
            return res.status(500).json({
                message: 'POST not allowed!'
            });
        }
        const busboy = new Busboy({ headers: req.headers });
        let uploadData = null;

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            const filepath = path.join(os.tmpdir(), filename);
            uploadData = {file: filepath, type: mimetype};
            file.pipe(fs.createWriteStream(filepath));
        });

        //start the upload process
        busboy.on('finish', () => {
            bucket.
                upload(uploadData.file, {
                    uploadType: 'media',
                    metadata: {
                        metadata: {
                            contentType: uploadData.type
                    }
                } 
            })
            .then(() => {
                res.status(200).json({
                    message: 'It worked!'
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
        });
        busboy.end(req.rawBody);
    });
});
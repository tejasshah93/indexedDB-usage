var fs = require('fs'),
    url = require('url'),
    mime = require('mime'),
    path = require('path'),
    http = require('http'),
    request = require('request');

var MongoClient = require('mongodb').MongoClient;

// Connect to the db 'imageArchivesDB'
MongoClient.connect("mongodb://localhost:27017/imageArchivesDB", function(err, db) {
    if(!err) {
        console.log("We are connected");
    }
    var imageManifest = db.collection("imageManifest");
    var server = http.createServer(function (req, res) {

        var uri = url.parse(req.url).pathname.substring(1);        
        imageManifest.find({"_id": uri}).toArray(function(err, resultImageManifest){
            if(!resultImageManifest.length){
                console.log('404 File Not Found: ' + filename);
                res.writeHead(404, {
                    'Content-Type': "text/plain",
                    'Access-Control-Allow-Origin': '*',
                });
                res.write("404: File Not Found\n");
                res.end();
                return;
            }
            else{
                console.log('Request for file ' + uri);
                var file = resultImageManifest[0].imagePath;
                var filename = path.basename(file);
                var mimetype = mime.lookup(file);

                fs.stat(file, function(error, stat){
                    if(error){ throw error; }
                    res.writeHead(200, {
                        'Content-Type' : mimetype,
                        'Content-Disposition': 'attachment; filename=' + uri,
                        'X-Total-Length' : stat.size,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Expose-Headers': 'X-Total-Length, Content-Disposition'
                    });

                    var readStream = fs.createReadStream(file, {
                        autoClose: true
                    });

                    // Waits until the readable stream is actually valid before piping
                    readStream.on('open', function(){
                        // Pipes the read stream to the response object(which goes to the client)
                        // req.pipe(request('http://127.0.0.1/blob')).pipe(res);
                        readStream.pipe(res);
                    });

                    // Catches any errors that happen(invalid filenames, etc)
                    readStream.on('error', function(err){
                        res.end(err);
                    });
                }); 
            }
        });
    });

    server.listen(8090);
});


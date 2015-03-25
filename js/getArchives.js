var downloadArchive = function () {
    // IndexedDB
    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
        dbVersion = 1.0;

    // Create or open the database
    var request = indexedDB.open("CancerImagingData", dbVersion),
        db,
        createObjectStore = function (dataBase) {
            // Create an objectStore
            console.log("Creating objectStore");
            dataBase.createObjectStore("images");
        };

    if(!$("#filenameUser").val()){
        $('.progress').hide();
	document.getElementById("error").innerHTML = "Please enter a file name";
	return;
    }

    var getImageFile = function () {
	document.getElementById("error").innerHTML = "";                
	$('.progress').show();
        // Create XHR
        var xhr = new XMLHttpRequest(),
            blob;

        xhr.addEventListener("progress", updateProgress, false);            
        xhr.addEventListener("error", transferFailed, false);
        xhr.addEventListener("abort", transferCanceled, false);

        xhr.open("GET", "http://54.68.32.118:8090/" + $("#filenameUser").val(), true);
        // Set the responseType to blob
        xhr.responseType = "blob";

        xhr.addEventListener("load", function () {
            if (xhr.status === 200) {
                console.log("Image retrieved");
                // Blob as response
                blob = xhr.response;
                console.log("Blob:" + blob);

                // Put the received blob into IndexedDB
                blobName = xhr.getResponseHeader('Content-Disposition');
                blobName = blobName.split(";")[1].split("=")[1];
                console.log("blobName: " + blobName);
                putBlobInDatabase(blob, blobName);
            }
            else{
                $('.progress').hide();
                document.getElementById("error").innerHTML = xhr.status + 
                                                            " File: '" + $("#filenameUser").val() + 
                                                            "' not found";
                console.log("404 not found");
            }
        }, false);
        // Send XHR
        xhr.send();

        // Progress on transfers from the server to the client
        function updateProgress (evt) {
            var total = evt.lengthComputable ? evt.total : parseInt(xhr.getResponseHeader('X-Total-Length'));
            if (total) {
                var percentComplete = Math.round(evt.loaded * 100 / total);
                $('#downloadProgress').val(percentComplete);
                $("#prog").width(percentComplete + '%');
                document.getElementById("textValue").innerHTML = percentComplete + "% complete";
            } 
            else {
                console.log("Unable to compute progress information since the total size is unknown");
            }
        }

        function transferFailed(evt) {
          console.log("An error occurred while transferring the file.");
        }

        function transferCanceled(evt) {
          console.log("The transfer has been canceled by the user.");
        }
    };

    var putBlobInDatabase = function (blob, blobName){
            console.log("Putting blob in IndexedDB");

            // Open a transaction to the database
            var readWriteMode = typeof IDBTransaction.READ_WRITE == "undefined" ? "readwrite" : IDBTransaction.READ_WRITE;
            var transaction = db.transaction(["images"], readWriteMode);

	    // Put the blob into the dabase
	    var put = transaction.objectStore("images").put(blob, blobName);
	    put.onabort = function(event) {
		    var error = event.target.error; // DOMError
		    if (error.name == 'QuotaExceededError') {
		        // Fallback code
			alert(error.name);
			return;
		    }
	    };

            // Retrieve the file that was just stored
            transaction.objectStore("images").get(blobName).onsuccess = function(event){
                var blobFile = event.target.result;
                console.log("Got blob!" + blobFile);

                // Get window.URL object
                var URL = window.URL || window.webkitURL;

                // Create and revoke ObjectURL
                var blobURL = URL.createObjectURL(blobFile);

                // Set src to ObjectURL                
                var downloadBlob = document.getElementById("downloadBlob");                
                downloadBlob.href = blobURL;
                downloadBlob.download = blobName;
                $('#downloadBlob')[0].click();
                // Revoking ObjectURL
                downloadBlob.addEventListener("load", function (evt) {
                    URL.revokeObjectURL(blobURL);                    
                });                
            };
        };

    request.onerror = function (event) {
        console.log("Error creating/accessing IndexedDB database");
    };

    request.onsuccess = function (event) {
        console.log("Success creating/accessing IndexedDB database");
        db = request.result;

        db.onerror = function (event) {
            console.log("Error creating/accessing IndexedDB database");
        };
                
        if (db.setVersion) {
            if (db.version != dbVersion) {
                var setVersion = db.setVersion(dbVersion);
                setVersion.onsuccess = function () {
                    createObjectStore(db);
                    getImageFile();
                };
            }
            else getImageFile();            
        }
        else getImageFile();
    }
        
    request.onupgradeneeded = function (event) {
        createObjectStore(event.target.result);
    };
};

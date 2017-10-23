var request = require('request-promise');

module.exports = function (context, carReviewTextChecked) {

if (carReviewTextChecked && (!carReviewTextChecked.imageApproval || carReviewTextChecked.imageApproval != "complete")) {
    var options = {
        uri: process.env["VisionApiUrl"],
        method: 'POST',
        qs: {
            visualFeatures: 'Description'
        },
        headers: {
            'Ocp-Apim-Subscription-Key': process.env["VisionApiKey"],
            'Content-Type': 'application/json'
        },
        body :{ "url" : carReviewTextChecked.image_url },
        json: true
    };

    request(options)
    .then(function (parsedBody) {
        var tags = parsedBody.description.tags;
        context.log(parsedBody);
        // TBD move "car" to settings 
        if(tags.indexOf("car") > -1){
        context.log("Item content is appropriate");
        } else {
            context.log(false);
            carReviewTextChecked.state = "rejected";
            carReviewTextChecked.imageApproval = "complete";
            // Update Cosmos DB record
            context.log(carReviewTextChecked);
            context.bindings.outputDocument = carReviewTextChecked;

             var rejectionEvent = {
                id: carReviewTextChecked.id,
                company: carReviewTextChecked.company,
                description: carReviewTextChecked.description,
                image_url: carReviewTextChecked.image_url,
                name: carReviewTextChecked.name,
                state: carReviewTextChecked.state,
                rejectionReason: "car is not on the image"
            };

            // Send an event to Event Grid
            context.bindings.rejectedReviewEvent = rejectionEvent;

            context.done();
        }
    })
    .catch(function (err) {
       context.log(err);
       throw err;
       context.done();
    });
    }
    else {

        if(!carReviewTextChecked.imageApproval || carReviewTextChecked.imageApproval != "complete") {
            throw "Please pass an image url and term for verification in the request body";
        }
        context.done();
    }
};
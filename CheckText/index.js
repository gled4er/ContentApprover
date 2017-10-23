var request = require('request-promise');

module.exports = function (context, carReview) {
if (carReview && carReview.description && (!carReview.textApproval || carReview.textApproval != "complete")) {
    var options = {
        uri: process.env["ContentModeratorApiUrl"],
        method: 'POST',
        qs: {
            language: 'eng'
        },
        headers: {
            'Ocp-Apim-Subscription-Key': process.env["ContentModeratorApiKey"],
            'Content-Type': 'text/plain'
        },
        body : carReview.description,
        json: true
    };

    request(options)
    .then(function (parsedBody) {
        var terms = parsedBody.Terms;
        context.log(terms);
        if(terms === null){
            context.bindings.carReviewTextChecked = carReview;
            context.done();
        } else {
            carReview.state = "rejected";
            context.log("image state chnaged to rejected");
            // change state to rejected in Cosmos DB
            carReview.textApproval = "complete";
            context.bindings.outputDocument = carReview;
            context.log("document upated in Cosmos DB");

            // send an event to alerting operator for manual review of an item
            var rejectionEvent = {
                id: carReview.id,
                company: carReview.company,
                description: carReview.description,
                image_url: carReview.image_url,
                name: carReview.name,
                state: carReview.state,
                rejectionReason: "description text"
            };
            
            context.bindings.rejectedReviewItem = rejectionEvent;
            // pass to image inspection
            context.bindings.carReviewTextChecked = carReview;
            context.log("document passed for image reivew");
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
        if(carReview.textApproval != "complete") {
            context.log("Please pass a description in the request body");
            throw "Please pass a description in the request body";
        }
        else {
            context.bindings.carReviewTextChecked = carReview;
        }

        context.done();
    }

};
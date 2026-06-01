# delivery-quote-backend
Submit Quote
{
  "name": "delivery-quote-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "nodemailer": "^6.10.0"
  }
}
function submitQuote() {

    if (!lastQuote.total) {
        alert("Please calculate the quote first.");
        return;
    }

    fetch("https://YOUR-BACKEND-URL/create-quote", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(lastQuote)
    })
    .then(response => response.json())
    .then(data => {
        alert("Quote submitted successfully.");
    })
    .catch(error => {
        console.error(error);
        alert("Error submitting quote.");
    });
}

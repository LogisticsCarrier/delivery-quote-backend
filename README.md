# delivery-quote-backend
Submit Quote
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

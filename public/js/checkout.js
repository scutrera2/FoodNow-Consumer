// This is your test publishable API key.
const stripe = Stripe("pk_test_51U61hdHvGiXgV60j10vt3hd3MX1owQDd4BYLRFsD5w8YS46a8EQWesyt3iCWEIPYnP2DivCXVDk141RKsLvGUL2V00z5ttnZpM");

const urlParams = new URLSearchParams(window.location.search);
const item = urlParams.get('item');

let elements;

initialize();

document
  .querySelector("[name=\"payment-form\"]")
  .addEventListener("submit", handleSubmit);

  

// Fetches a payment intent and captures the client secret
async function initialize() {
  const response = await fetch("/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
  });
  const { clientSecret } = await response.json();

  const appearance = {
    theme: 'stripe',
  };
  elements = stripe.elements({ appearance, clientSecret });

  const paymentElementOptions = {
    layout: "accordion",
  };

  const paymentElement = elements.create("payment", paymentElementOptions);
  paymentElement.mount("#payment-element");
}

async function handleSubmit(e) {
  e.preventDefault();


  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      // Make sure to change this to your payment completion page
      return_url: "http://localhost:3000/success",
    },
  });

  // This point will only be reached if there is an immediate error when
  // confirming the payment. Otherwise, your customer will be redirected to
  // your `return_url`. For some payment methods like iDEAL, your customer will
  // be redirected to an intermediate site first to authorize the payment, then
  // redirected to the `return_url`.
  if (error.type === "card_error" || error.type === "validation_error") {
    alert(error.message);
  } else {
    alert("An unexpected error occurred.");
    
}

}


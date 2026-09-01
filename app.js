const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
require('dotenv').config();
//const stripe = require('stripe');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

var app = express();

// view engine setup (Handlebars)
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))
app.use(express.json({}));

/**
 * Home route
 */
app.get('/', function(req, res) {
  res.render('index');
});

/** SGC
 * Function getBookDetail 
 */

  function getBookDetails(item) {
  // Just hardcoding amounts here to avoid using a database
  let title, amount, error;

  switch (item) {
    case '1':
      title = "Grilled Salmon with Lemon Butter"
      amount = 2300      
      break;
    case '2':
      title = "Wood-Fired Margherita Pizza"
      amount = 2500
      break;     
    case '3':
      title = "Slow-Braised Beef Ramen"
      amount = 2800  
      break;     
    default:
      // Included in layout view, feel free to assign error
      error = "No item selected"      
      break;
  }
  return { title, amount, error };
};



/**
 * Checkout route
 */
app.get('/checkout', function(req, res) {
  
  const item = req.query.item;

  const bookDetail = getBookDetails(item)

  res.render('checkout', {
    title: bookDetail.title,
    amount: bookDetail.amount,
    error: bookDetail.error
  });
});

/** SGC
 * Create Payment Intent
 */
app.post("/create-payment-intent", async (req, res) => {
  const { item } = req.body;
  const bookDetail = getBookDetails(item); 
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: bookDetail.amount,
    currency: "aud",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});



/** SGC
 * Success route
 */
app.get('/success', async(req, res)  => {
  
  const payment_intent = req.query.payment_intent;
  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
//  console.log(paymentIntent);  

  res.render('success', {
    amount: paymentIntent.amount,
    id: paymentIntent.id
  });
});



/**
 * Start server
 */
app.listen(3000, () => {
  console.log('Getting served on port 3000');
});

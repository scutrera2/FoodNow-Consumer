# Stripe Payments Integration: Take Home Project

**Sergio Cutrera**

This is a small online bookstore built with Node.js and Express. The shop and the checkout page already existed, but it had no way to take payments. My task was to integrate Stripe so a customer can actually buy a book, and then see a confirmation of what they paid.

The integration is complete and working end to end: a customer picks a book, pays with a card, and lands on a confirmation page showing the amount charged and the payment reference.

The full history of how I built it, step by step, is in the commit history of this repository. Every change described in this document can be seen there as a separate commit.

---

## Getting started

### What you need

- Node.js installed on your machine  
- A Stripe account. A free test account is enough; no real money is involved at any point.

### Steps

**1\. Clone the repository and install the dependencies**

git clone https://github.com/scutrera2/sa-takehome-project-node && cd sa-takehome-project-node

npm install

**2\. Get your Stripe test keys**

In the Stripe Dashboard, go to **Developers → API keys**. You need two keys:

\- Secret key (sk\_test\_…): just for the server only, this should never be on the browser  
\- Publishable key (pk\_test\_…): In the browser, it designed to be public

**3\. Create your `.env` file**

Rename `sample.env` to `.env` and put your two keys in it:

STRIPE\_SECRET\_KEY=sk\_test\_your\_key\_here  
STRIPE\_PUBLISHABLE\_KEY=pk\_test\_your\_key\_here

The `.env` file is not committed to the repository, so your keys stay private.

**4\. Start the application**

npm start

The app runs at `http://localhost:3000`.

**5\. Make a test payment**

Open `http://localhost:3000` and choose one of the three books. Use one of Stripe's test cards:

- Card number: `4242 4242 4242 4242`  
- Expiry date: any date in the future  
- CVC: any 3 digits

Click Pay. You will be redirected to the confirmation page, which shows the amount charged and the payment ID. The same payment will also appear in your Stripe Dashboard, under Transactions.

### One note while developing

If you change `app.js`, you have to stop the server (`Ctrl+C`) and run `npm start` again. Server code is loaded into memory once when the app starts, so changes on disk are not picked up until it restarts. Files inside `public/` and the `.hbs` page templates do not need a restart;  a browser refresh is enough.

---

## How it works

### The basic idea

There are two separate programs running in two different places, and they do not share memory:

- **The server:**  (Node.js, running on the machine) knows the secret key and decides how much money to charge.  
- **The browser:**  (the customer's computer) shows the page and collects the card details, but only through a secure form provided by Stripe itself.

They only talk to each other through normal web requests. This separation is the most important part of the design, and it is what makes the integration safe.

### Security constrains

**1\. The browser never sends a price to the server.** It only sends a book number, like `"2"`. The server looks up the real price on its side. If it worked the other way, a customer could open the browser developer tools, change the price from $28.00 to $0.01, and the server would have no way to know the amount had been changed.

**2\. The server never sees the card number.** When the customer types their card details, those details go directly from the browser to Stripe. They never pass through this application, which means the application never stores or handles raw card data.

### The flow, step by step

1. The customer opens the shop at `http://localhost:3000` and sees the three books with their prices.  
2. They click Purchase on one of them, for example the second book at $25. This takes them to the checkout page, `/checkout?item=2`. The book number travels in the address, and it is the only thing that identifies the purchase from here on.  
3. The server looks up that book and renders the checkout page with its title and price.  
4. In the browser, `checkout.js` reads the book number from the page address and sends it to the server.  
5. The server looks up the real price again and asks Stripe to create a Payment Intent. This creates a real, permanent record inside Stripe; not just a value in memory on our side. It is the same record that later appears in the Stripe Dashboard, and it holds the amount, the currency and the status of the payment. Stripe returns a `client_secret`, which the server passes back to the browser. Nothing else is sent back.  
6. The browser uses that `client_secret` to load the Stripe Payment Element into the page. This is Stripe's own ready-made payment form, and it also decides which payment methods to show (card, Link, and others depending on the account and the country).  
7. The customer enters their card and clicks Pay. The browser sends the card details straight to Stripe to confirm the payment.  
8. If the payment succeeds, Stripe redirects the browser to the confirmation page and automatically adds the payment ID to the address, like this: `/success?payment_intent=pi_xxxxx&...`  
9. The confirmation page reads that ID and asks Stripe directly: *what happened with this payment, and how much was it?* Stripe returns the real, confirmed details.  
10. The page shows the amount and the payment ID to the customer.

Step 9 is worth explaining. The address bar only contains the payment ID; a reference number. It does not contain the amount. So to show the customer what they actually paid, the application asks Stripe for it. This also means the amount shown is always the amount Stripe really processed, not a number this application remembered or guessed.

### Which Stripe APIs are used

This project uses the **Payment Intents API**, which is what the exercise asked for. Four Stripe calls are involved:

- **stripe.elements()** Loads Stripe's secure payment form into the page. ([https://docs.stripe.com/payments/payment-element](https://docs.stripe.com/payments/payment-element)) Runs on Browser  
- **stripe.paymentIntents.create()** Creates the payment record in Stripe with the correct amount. ([https://docs.stripe.com/api/payment\_intents/create](https://docs.stripe.com/api/payment_intents/create)) Runs on Server  
- **stripe.confirmPayment()** Sends the card details to Stripe and confirms the payment. ([https://docs.stripe.com/js/payment\_intents/confirm\_payment](https://docs.stripe.com/js/payment_intents/confirm_payment)) Runs on Browser  
- **stripe.paymentIntents.retrieve()** Reads back the confirmed payment details for the confirmation page.( [https://docs.stripe.com/api/payment\_intents/retrieve](https://docs.stripe.com/api/payment_intents/retrieve) ) Runs on Server

###  The files 

- [**app.js**](http://app.js)**:** The server. Holds the routes for the shop, the checkout page, the creation of the Payment Intent, and the confirmation page. This is the only file that uses the secret key.  
- **public/js/[checkout.js](http://checkout.js):**  Runs in the browser. Loads the Stripe payment form and handles the Pay button. This file did not exist before;  it is the main new file in this integration.I rewrite the example from the Stripe docs (stripe-sample-code/public/checkout.js)  
- **views/index.hbs**: The shop page, with the three books.  
- **views/checkout.hbs:** The checkout page, where the payment form is loaded.  
- **views/success.hbs**: The confirmation page.  
- **views/layouts/main.hbs:** The shared layout used by every page; the header, the styles, and the scripts that load on all pages.  
- **public/js/[custom.js](http://custom.js):** A script that already existed in the project. It converts amounts from cents into dollars anywhere on the site.

There is no database in this project. The three books and their prices are written directly in `app.js`, using a simple lookup by book number.

---

## How I approached the build

### Starting with the part that has nothing to do with Stripe

In the original code, the book prices were written inside the checkout route in `app.js`. But the new payment route also needed to know the price of a book, so the same information was needed in two places.

Before writing a single line of Stripe code, I moved that lookup into its own small function, `getBookDetails()`, and tested that the checkout page still worked exactly as before. Both routes now call the same function.

I did this first, on purpose, for two reasons. The obvious one is that the price of a book should be defined in one place only; if it were copied into two routes, one day someone would update one and forget the other, and the app would charge a different price than it displays. The second reason is about debugging: by getting this working and verified before adding Stripe, I knew that if something broke later, the price lookup was not the cause. It removed one variable from every problem that came afterwards.

### Using Payment Intents

I used for this exercise Payment Intents, because the instructions said that I have to use Stripe Elements, there is a note at the end of this document about a different project of mine where I chose Checkout Session API, and why.

### Running Stripe's own example first

Before touching this project, I downloaded the complete working example from Stripe's quickstart guide and ran it locally on my machine, on its own port. That example is a small, standalone shop that already works.

This was useful for two reasons. First, I could see the finished behaviour before building it; how the payment form appears, what the customer sees after paying, and what the address bar looks like when Stripe redirects back. Second, when something did not work in my own version later, I had a working reference next to it and could compare the two, instead of only reading the documentation.

`checkout.js` in this project started from that example, and was then adapted to fit the real code here.

### Adapting the example instead of copying it

The examples in the documentation are written for a generic project, and this project is not generic. The example assumed a form with a certain name, a page running on a different port, a different confirmation page, and a shopping cart that does not exist here. Every one of those had to be changed to match the real application. Copying the example without reading it would not have worked.

### Building it in small steps

I built and tested one piece at a time: first the price lookup, then creating the Payment Intent on the server, then loading the payment form in the browser, then a real test payment, and only then the confirmation page. Each commit in this repository is one of those steps.

### Documentation I used

- [`docs.stripe.com/payments/quickstart-payment-intents`](https://docs.stripe.com/payments/quickstart-payment-intents) : the main guide I followed (Node \+ HTML version), and the source of the downloadable example I ran locally. The test card number also comes from here.  
- [`docs.stripe.com/api/payment_intents/object`](https://docs.stripe.com/api/payment_intents/object) : the full list of fields on a Payment Intent, which is where I confirmed the exact field names for the amount and the ID.

---

## Problems I found while building this

These can all be followed in the commit history.

### The Pay button did nothing, and the page reloaded instead

When I clicked the Pay button did not start a payment. Instead the page reloaded and the book number disappeared from the address bar. The next request crashed the server.

Then I revised checkout.hbs file and I saw that  the browser reads a page from top to bottom. The `<script>` tag for `checkout.js` was placed above the form, so the script ran before the form existed on the page. It tried to attach itself to a form that was not there yet, and failed quietly. Because nothing was listening to the Pay button, the browser did what it does by default with a form: it reloaded the page and put the form fields into the address bar, replacing the book number.

Then, I started to compare my current version against the working example I had downloaded from the Stripe documentation, and saw that its script tag had `defer` and mine did not. I had dropped it while adapting the code. `defer` tells the browser to wait until the page is fully loaded before running the script.

It was difficult, because the error was invisible. Nothing appeared to be wrong on screen; the button just did nothing. Silent failures like this are why I now check the browser console early, instead of only looking at the page.

### The confirmation page showed $0.00 instead of the real amount

When the payment worked, Stripe showed $28.00 in the dashboard, the payment ID appeared correctly on the confirmation page; but the amount on that same page said $0.00.

Instead of guessing, I printed the data the server received from Stripe. The server log showed `amount: 2300`, the correct value. So the server was right, and the problem had to be after that, in the browser.

Then I searched the whole project for the word "amount" and found a file I had not looked at before: `custom.js`, a script that already existed in the project and runs on every page. It looks for any element marked as an amount, reads the value from a specific attribute, divides it by 100 to convert cents into dollars, and replaces what is on screen.

My version of the confirmation page was putting the amount as plain text instead of in that attribute. So the script found my element, looked for the attribute, found nothing, treated nothing as zero, and overwrote my correct value with `0.00`.

I realised that the checkout page was working OK, showing well the numbers, so use the same pattern the checkout page was already using. Then the existing script formats the amount for me, and I do not write the same conversion logic a second time.

The bug was not in the code I wrote; it was in how my code interacted with code that was already there.   
---

## Where I would take this next

The application works, but a real store is not the same as a working demo. Some of these come from Stripe's own suggested next steps at the end of the quickstart guide.

**1\. Add a database and a real book catalogue.** This is the most obvious first step. The three books and their prices are currently written into the code, which means adding or removing a book, or changing a price, requires editing the application and restarting it. A real store needs a proper catalogue in a database, and a way for someone non-technical to manage it; either building a small admin page, or using an existing e-commerce platform for the shop side and keeping Stripe for the payments.

The database is also needed for a second reason: the business should keep its own record of every order, linked to the Stripe payment ID. Right now, if you needed to know what a customer bought last month, the only record is inside Stripe. The business should have its own.

**2\. Use webhooks instead of trusting the redirect.** Right now, the confirmation page trusts that the customer arrived there with a valid payment ID in the address. This is enough for what the page does today, which is only to show the customer what they paid. But it is not enough for anything more than that, for two reasons. The first is that it depends on the customer's browser coming back. If they close the tab, lose their internet connection, or their phone dies right after paying, the payment still succeeds at Stripe, but the application never finds out. The second is that anyone can type that page address by hand, so arriving there does not by itself prove a payment was made. 

The solution, which Stripe recommends in the same quickstart guide I followed ([docs.stripe.com/payments/quickstart-payment-intents](https://docs.stripe.com/payments/quickstart-payment-intents)), is a webhook. A webhook works in the opposite direction to the rest of the integration: instead of my server calling Stripe, Stripe calls my server directly, machine to machine, whenever a payment succeeds, is still processing, or fails. The customer's browser is not involved at all. It is a normal route in the application, with one extra step: every message has to be checked to confirm it really came from Stripe before acting on it. Webhooks also become necessary, not just safer, if the shop ever accepts payment methods other than cards. Some of those take hours or days to complete, so there is no moment where the browser can report the result. The webhook is the only way to know. I have built this pattern before in my own project, described at the end of this document, where a webhook activates and cancels subscriptions without the customer needing to return to the site.

**3\. Show errors properly on the page.** Payment errors currently appear in a browser pop-up. They should appear inside the page, next to the form, in the same style as the rest of the site. The pop-up was a deliberate shortcut to get the payment flow working and tested first.

**4\. Send a receipt by email.** Stripe can email a receipt automatically after a successful payment, using the business's own logo and colours. This is a setting in the Stripe Dashboard rather than new code; it is one of the options Stripe suggests once a payment integration is working, and it is something I have already turned on and used in my own project.

**5\. Fulfil the order automatically.** At the moment the payment succeeds and nothing else happens; nobody is told to send the book. This is the webhook from point 2 doing its second job: not just confirming the payment happened, but safely triggering what comes next, since (unlike the redirect)  it cannot be faked by someone just visiting the confirmation page. In a real store that usually means talking to another system; a warehouse, a delivery company, or a digital download service. That integration is outside this application, but the webhook is the correct place to start it from. 

**6\. Collect the billing address.** The payment form currently asks only for what is strictly needed to take the payment. A real store normally needs a full billing address, and a shipping address for physical books. Stripe provides an Address Element for this that works alongside the payment form.

**7\. Handle refunds and disputes.** A real business needs a way to refund a customer, and a process for responding when a customer disputes a charge with their bank. Stripe provides both, but they need to be built into the application and into the way the business works.

---

## Appendix; a note about a different project, and a different choice

This section is not part of the exercise. I include it because the choice of Stripe API in this project was a deliberate decision, and I want to show it was a decision and not the only approach I know.

I have a separate personal project called Tiempa, a subscription streaming service for older adults. For that project I use the **Checkout Sessions API**; the opposite choice to this exercise. The reasons are specific to that product:

**Trust matters more than design control for that audience.** Tiempa's users are mostly seniors, and many are cautious about entering their card details online. Sending them to a page that clearly shows Stripe's own branding, rather than a custom form on a small platform they have never heard of, makes them more comfortable completing the payment. In that context, giving up control of the page design is not a loss; it is exactly the point.

**It sells subscriptions, not single purchases.** A subscription is not only a payment. It also needs renewals every month or year, retries when a card is declined, upgrades and downgrades in the middle of a billing period, and a way for the customer to cancel or update their card themselves. Stripe provides all of this around Checkout Sessions, including a customer portal page that handles cancellations and card updates without me building any of it. With Payment Intents, each of those pieces would have to be built and maintained by me.

Tiempa is a React frontend running on Supabase (Postgres and Edge Functions), with Stripe handling all billing. The Stripe webhook runs as a Supabase Edge Function that updates the customer's record directly in the database, so a subscription is activated, renewed or cancelled based on messages coming directly from Stripe, not on whether the customer's browser made it back to the site. It handles cancellations and failed payments the same way. The receipt emails mentioned earlier are also configured there.

Tiempa is close to launch. One reason I built it this way is that once it is live, this part of the product should not need much of my attention: Stripe handles the billing, the webhooks keep the accounts up to date on their own, and the customer can manage their own subscription without contacting me.


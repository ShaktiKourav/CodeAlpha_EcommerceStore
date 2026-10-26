# CodeAlpha E-commerce Store — ShopEase

A beginner-friendly full-stack e-commerce demo project for the CodeAlpha Full Stack Development internship.

## Features

- Product listing and individual product detail modal
- Product search and category filter
- Shopping cart with quantity controls, remove item, and subtotal
- User registration and login
- Passwords stored as salted scrypt hashes (not plain text)
- Server-side order creation and price calculation
- Order history for the signed-in user
- Product inventory stored and updated in JSON files
- Responsive layout for desktop and mobile
- Express API routes and static frontend hosting

## Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js and Express
- Data storage: JSON files in `data/` (simple local demo database)

## Requirements

- Node.js 18 or newer recommended
- npm

## Run on Windows / VS Code

1. create folder CodeAlpha_EcommerceStore
2. Open the `CodeAlpha_EcommerceStore` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000` in your browser.

Keep the terminal running while using the website. Press `Ctrl + C` to stop the server.

## Main files

```text
CodeAlpha_EcommerceStore/
├── data/
│   ├── orders.json
│   ├── products.json
│   └── users.json
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## API routes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API status |
| GET | `/api/products` | List products; supports `?search=` and `?category=` |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Get current account |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/orders` | View current user's orders |
| POST | `/api/orders` | Place an order |

## Manual test checklist

1. Open the homepage and confirm products load.
2. Search for “laptop” and try the category filter.
3. Open a product detail card.
4. Add products to the cart, adjust quantities, and remove an item.
5. Create an account with a valid email and a password of at least 8 characters.
6. Place a demo order and check the order ID.
7. Open “My orders” to see order history.
8. Stop and restart the server; product stock and order data remain in JSON files.

## Important notes

- Checkout is a **demo order flow only**. It does not take real payments or collect delivery addresses.
- This project uses JSON files for learning and local demonstration, not a production database.
- Sessions are stored in server memory and reset when the server restarts. Log in again after restarting.
- Do not deploy this demo as a production store without adding production-grade session storage, rate limiting, HTTPS, validation, CSRF protections where relevant, a proper database, and a trusted payment provider.
- For internship submission, read the official CodeAlpha instructions, test the project, upload the source code to your own GitHub repository named `CodeAlpha_EcommerceStore`, and record your own project explanation video. Do not claim features you have not personally tested.

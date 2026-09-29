# Real-Time Order Tracker & Live Support System

## Project Overview

This project is a full-stack **Real-Time Order Tracking & Live Support System** developed for CSC337 Lab Assignment 04.

The system demonstrates multiple communication protocols working together in one application:

- REST API for orders and products
- WebSockets using Socket.io for real-time order updates and support chat
- JSON-RPC 2.0 for method-based actions such as cancelling an order
- Server-Sent Events (SSE) for live system alerts

The backend is built with Node.js and Express.js, while the frontend is built using HTML, CSS, and JavaScript.

---

## Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript
- Socket.io Client
- Server-Sent Events (EventSource)

### Backend

- Node.js
- Express.js
- Socket.io
- CORS
- UUID

### Communication Protocols

- REST API
- WebSockets
- JSON-RPC 2.0
- Server-Sent Events (SSE)

### Development Tools

- Visual Studio Code
- Postman
- Git
- GitHub

---

## Project Structure

    order-tracking-system/
    │
    ├── backend/
    │   ├── node_modules/
    │   ├── package.json
    │   ├── package-lock.json
    │   ├── server.js
    │   └── socket-test.html
    │
    ├── frontend/
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    │
    ├── .gitignore
    └── README.md

---

## Features

### 1. Order Management

The system allows users to:

- View available orders
- Create new orders
- View order details
- Track order status
- Update order status
- Cancel orders

Supported order statuses include:

- Processing
- Shipped
- Delivered
- Cancelled

---

### 2. Product Catalog

The system contains a product catalog with:

- Product ID
- Product name
- Category
- Price
- Stock quantity

Example products include:

- Wireless Headphones
- Smart Watch
- Laptop Bag

---

### 3. Real-Time Order Tracking

Order status changes are delivered to the frontend in real time using Socket.io.

For example:

    Processing → Shipped → Delivered

When the order status changes, the connected frontend receives the update without refreshing the page.

---

### 4. Real-Time Support Chat

Customers can join an order-specific support room and communicate with support in real time.

Socket.io is used for:

- Joining an order room
- Sending messages
- Receiving messages
- Real-time communication

Example Socket.io events:

- `joinOrder`
- `joinedOrder`
- `sendMessage`
- `receiveMessage`
- `orderStatusUpdated`

---

## REST API

The REST API is used for managing products and orders.

### Product Endpoints

Get all products:

    GET /api/v1/products

Create/access product data through the REST API.

### Order Endpoints

Get all orders:

    GET /api/v1/orders

Create a new order:

    POST /api/v1/orders

Update order status:

    PUT /api/v1/orders/:id/status

Example request:

    {
      "status": "Shipped"
    }

---

## WebSockets

Socket.io is used to provide real-time communication between the frontend and backend.

### Main Socket Events

Join an order:

    joinOrder

Join confirmation:

    joinedOrder

Send chat message:

    sendMessage

Receive chat message:

    receiveMessage

Order status update:

    orderStatusUpdated

### Real-Time Order Updates

When an order status is changed through the REST API or JSON-RPC, the backend emits a Socket.io event.

The frontend receives the event immediately and updates the order status without refreshing the browser.

---

## JSON-RPC 2.0

The JSON-RPC endpoint is:

    POST /rpc

The system supports method-based operations.

### Available Methods

    getOrders

    getProducts

    cancelOrder

### Example: Cancel Order

Request:

    {
      "jsonrpc": "2.0",
      "method": "cancelOrder",
      "params": {
        "orderId": "ORD001"
      },
      "id": 1
    }

Example response:

    {
      "jsonrpc": "2.0",
      "result": {
        "message": "Order cancelled successfully"
      },
      "id": 1
    }

When an order is cancelled:

- The order status changes to `Cancelled`
- Product stock is restored
- A Socket.io update is emitted
- An SSE alert is generated

---

## Server-Sent Events (SSE)

The SSE endpoint is:

    GET /events

SSE is used to send live system alerts from the backend to the frontend.

The frontend connects using JavaScript `EventSource`.

Example events include:

- `connected`
- `heartbeat`
- `orderCreated`
- `orderStatusUpdated`
- `orderCancelled`
- `newMessage`

SSE allows the frontend to receive server-generated notifications without continuously requesting the server.

---

## Local Setup

### Step 1: Clone the Repository

Clone the GitHub repository:

    git clone https://github.com/studentseries575/order-tracking-system.git

Move into the project folder:

    cd order-tracking-system

---

### Step 2: Install Backend Dependencies

Open the backend folder:

    cd backend

Install dependencies:

    npm install

If PowerShell blocks the `npm` command on Windows, use:

    npm.cmd install

---

### Step 3: Start the Backend

Run:

    npm start

Or for development:

    npm run dev

The backend will run at:

    http://localhost:5000

---

## Backend Endpoints

Home:

    http://localhost:5000/

REST Products:

    http://localhost:5000/api/v1/products

REST Orders:

    http://localhost:5000/api/v1/orders

JSON-RPC:

    http://localhost:5000/rpc

SSE:

    http://localhost:5000/events

---

## Running the Frontend

Open the `frontend` folder.

The frontend can be opened using VS Code Live Server or another local development server.

The frontend connects to:

    http://localhost:5000

The dashboard provides:

- Order tracking
- Product catalog
- Order status
- Support chat
- Socket.io connection status
- SSE connection status
- Live system alerts

---

## Testing

The system was tested using the following tools and methods:

### REST API Testing

REST APIs were tested using Postman.

Tested operations:

- GET products
- GET orders
- POST new order
- PUT order status

Example:

    GET http://localhost:5000/api/v1/orders

---

### WebSocket Testing

Socket.io was tested using the frontend and a Socket.io test page.

The following functionality was verified:

- Socket connection
- Joining order room
- Sending messages
- Receiving messages
- Real-time order status updates

---

### JSON-RPC Testing

JSON-RPC was tested using Postman.

The `cancelOrder` method was successfully tested using:

    POST http://localhost:5000/rpc

with JSON-RPC 2.0 request format.

---

### SSE Testing

SSE was tested by opening:

    http://localhost:5000/events

The connection successfully displayed:

- Connected event
- Heartbeat events
- Order status update events

---

## Example Testing Flow

A complete real-time testing flow is:

1. Start the backend server.
2. Open the frontend dashboard.
3. Verify that Socket.io is connected.
4. Verify that SSE is connected.
5. Select an order.
6. Join the order support room.
7. Send a support chat message.
8. Update the order status through the REST API.
9. Observe the order status changing automatically on the frontend.
10. Observe the SSE live alert.
11. Test `cancelOrder` through JSON-RPC.
12. Verify that the order becomes cancelled.

---

## Deployment

### Backend Deployment

The backend can be deployed using:

- Render
- Railway

After deployment, the backend will provide a public URL such as:

    https://your-backend-url.onrender.com

The deployed backend must support:

- REST API
- Socket.io WebSockets
- JSON-RPC
- SSE

---

### Frontend Deployment

The frontend can be deployed using:

- Vercel
- Netlify

The frontend must be configured to connect to the deployed backend URL instead of:

    http://localhost:5000

After deployment, the frontend will have a public URL such as:

    https://your-frontend-url.vercel.app

---

## Screenshots

The project includes testing and interface screenshots showing:

1. Main dashboard
   <img width="1867" height="1055" alt="image" src="https://github.com/user-attachments/assets/53efc226-71d8-44c5-b7bb-73fcb5797d2a" />

2. Order tracking
   <img width="1865" height="1042" alt="image" src="https://github.com/user-attachments/assets/49048945-930d-466c-b27f-d38f207d6698" />

3. Product catalog
   <img width="1862" height="1045" alt="image" src="https://github.com/user-attachments/assets/e0b59d46-206b-4127-8d03-7b997cf8b80b" />

4. Socket.io connection
   <img width="1862" height="1050" alt="image" src="https://github.com/user-attachments/assets/3bed6fd0-f825-42b5-8ec9-8bbda3f4564b" />

5. Real-time support chat
    <img width="1867" height="1035" alt="image" src="https://github.com/user-attachments/assets/ce66ef8d-689a-4872-9efd-cfa7cd6cb361" />

6. Real-time order status update
    <img width="1866" height="1025" alt="image" src="https://github.com/user-attachments/assets/d1538bf3-f33d-4b30-9d7f-19d88f09d394" />

7. SSE live alerts
    <img width="1865" height="1032" alt="image" src="https://github.com/user-attachments/assets/6f70f602-97bb-445b-97b3-3eb87a27ffce" />

8. REST API testing in Postman
    <img width="1920" height="1005" alt="image" src="https://github.com/user-attachments/assets/b9b11089-d567-46a5-836c-7185bb578627" />

9. JSON-RPC testing in Postman
    <img width="1920" height="975" alt="image" src="https://github.com/user-attachments/assets/acb89dce-991d-4c49-a770-b17246c519ce" />

---

## Assignment Requirements Covered

This project covers the required CSC337 Lab Assignment 04 components:

- [x] Full-stack Real-Time Order Tracking System
- [x] REST API for resource management
- [x] Product catalog
- [x] Order management
- [x] WebSockets using Socket.io
- [x] Real-time order status updates
- [x] Real-time support chat
- [x] JSON-RPC 2.0 endpoint
- [x] `cancelOrder` method
- [x] Server-Sent Events
- [x] Live system alerts
- [x] Public GitHub repository
- [x] Frontend application
- [x] Backend application
- [x] REST API testing
- [x] WebSocket testing
- [x] JSON-RPC testing
- [x] SSE testing
- [x] Deployment-ready project

---

## GitHub Repository

GitHub Repository:

    https://github.com/studentseries575/order-tracking-system

---

## Author

**Ayesha Iram**

Registration No: **SP24-BSE-039**

Course: **CSC337**

Project: **Real-Time Order Tracker & Live Support System**

---

## Conclusion

The project demonstrates how different communication protocols can work together in a single full-stack application.

REST API is used for resource management, WebSockets provide real-time communication, JSON-RPC handles method-based operations, and Server-Sent Events provide live system alerts.

The application is designed to demonstrate real-time order tracking and customer-support communication as required by the CSC337 Lab Assignment 04.

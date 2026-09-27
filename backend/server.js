const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const app = express();
const server = http.createServer(app);


// ===============================
// SOCKET.IO SETUP
// ===============================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});


// ===============================
// SERVER SETUP
// ===============================

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// ===============================
// PRODUCTS / CATALOG
// ===============================

let products = [
  {
    id: "P001",
    name: "Wireless Headphones",
    price: 4500,
    category: "Electronics",
    stock: 10
  },
  {
    id: "P002",
    name: "Smart Watch",
    price: 6500,
    category: "Electronics",
    stock: 8
  },
  {
    id: "P003",
    name: "Laptop Bag",
    price: 2500,
    category: "Accessories",
    stock: 15
  }
];


// ===============================
// ORDERS
// ===============================

let orders = [
  {
    id: "ORD001",
    customerName: "Ayesha",
    productId: "P001",
    quantity: 1,
    status: "Processing"
  }
];


// ===============================
// SSE CLIENTS
// ===============================

let sseClients = [];


// ===============================
// HELPER FUNCTION
// SEND SSE LIVE ALERT
// ===============================

function sendSSE(eventName, data) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

  sseClients.forEach((client) => {
    client.res.write(message);
  });
}


// ===============================
// HOME API
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "Order Tracking & Live Support API is running",
    status: "success",
    features: [
      "REST API",
      "Socket.io",
      "JSON-RPC 2.0",
      "Server-Sent Events"
    ]
  });
});


// ============================================================
// PRODUCTS / CATALOG REST APIs
// ============================================================


// Get all products
app.get(
  ["/api/products", "/api/v1/products"],
  (req, res) => {
    res.json(products);
  }
);


// Get single product
app.get(
  ["/api/products/:id", "/api/v1/products/:id"],
  (req, res) => {

    const product = products.find(
      (p) => p.id === req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json(product);
  }
);


// Add product
app.post(
  ["/api/products", "/api/v1/products"],
  (req, res) => {

    const {
      name,
      price,
      category,
      stock
    } = req.body;

    if (
      !name ||
      price === undefined ||
      !category ||
      stock === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, price, category and stock are required"
      });
    }

    const product = {
      id:
        "P" +
        String(products.length + 1).padStart(3, "0"),
      name,
      price,
      category,
      stock
    };

    products.push(product);

    sendSSE("systemAlert", {
      message: `New product added: ${product.name}`,
      product
    });

    res.status(201).json({
      message: "Product created successfully",
      product
    });
  }
);


// ============================================================
// ORDERS REST APIs
// ============================================================


// Get all orders
app.get(
  ["/api/orders", "/api/v1/orders"],
  (req, res) => {
    res.json(orders);
  }
);


// Get single order
app.get(
  ["/api/orders/:id", "/api/v1/orders/:id"],
  (req, res) => {

    const order = orders.find(
      (o) => o.id === req.params.id
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.json(order);
  }
);


// Create order
app.post(
  ["/api/orders", "/api/v1/orders"],
  (req, res) => {

    const {
      customerName,
      productId,
      quantity
    } = req.body;

    if (
      !customerName ||
      !productId ||
      !quantity
    ) {
      return res.status(400).json({
        message:
          "customerName, productId and quantity are required"
      });
    }

    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        message: "Not enough stock available"
      });
    }

    product.stock -= quantity;

    const order = {
      id: "ORD-" + randomUUID().slice(0, 8),
      customerName,
      productId,
      quantity,
      status: "Pending"
    };

    orders.push(order);


    // SSE live alert
    sendSSE("orderCreated", {
      message: `New order created: ${order.id}`,
      order
    });


    // Socket.io live update
    io.to(`order-${order.id}`).emit(
      "orderCreated",
      order
    );


    res.status(201).json({
      message: "Order created successfully",
      order
    });
  }
);


// ============================================================
// UPDATE ORDER STATUS
// ============================================================

app.put(
  [
    "/api/orders/:id/status",
    "/api/v1/orders/:id/status"
  ],
  (req, res) => {

    const { status } = req.body;

    const order = orders.find(
      (o) => o.id === req.params.id
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }


    order.status = status;


    // ===============================
    // SOCKET.IO REAL-TIME UPDATE
    // ===============================

    io.to(`order-${order.id}`).emit(
      "orderStatusUpdated",
      order
    );


    // ===============================
    // SSE LIVE ALERT
    // ===============================

    sendSSE("orderStatusUpdated", {
      message:
        `Order ${order.id} status changed to ${status}`,
      order
    });


    res.json({
      message: "Order status updated",
      order
    });
  }
);


// ============================================================
// SERVER-SENT EVENTS (SSE)
// /events
// ============================================================

app.get("/events", (req, res) => {

  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );


  // Send initial connection message
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      message: "Connected to live system alerts"
    })}\n\n`
  );


  const clientId = randomUUID();

  const client = {
    id: clientId,
    res
  };

  sseClients.push(client);

  console.log(
    `SSE client connected: ${clientId}`
  );


  // Heartbeat
  const heartbeat = setInterval(() => {

    res.write(
      `event: heartbeat\ndata: ${JSON.stringify({
        time: new Date().toISOString()
      })}\n\n`
    );

  }, 30000);


  req.on("close", () => {

    clearInterval(heartbeat);

    sseClients = sseClients.filter(
      (client) => client.id !== clientId
    );

    console.log(
      `SSE client disconnected: ${clientId}`
    );
  });
});


// ============================================================
// JSON-RPC 2.0
// /rpc
// ============================================================

app.post("/rpc", (req, res) => {

  const rpcRequest = req.body;


  // ===============================
  // JSON-RPC BASIC VALIDATION
  // ===============================

  if (
    !rpcRequest ||
    rpcRequest.jsonrpc !== "2.0" ||
    !rpcRequest.method
  ) {

    return res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid Request"
      },
      id: rpcRequest?.id || null
    });
  }


  const requestId = rpcRequest.id;


  // ==========================================================
  // METHOD: getOrders
  // ==========================================================

  if (rpcRequest.method === "getOrders") {

    return res.json({
      jsonrpc: "2.0",
      result: orders,
      id: requestId
    });
  }


  // ==========================================================
  // METHOD: getProducts
  // ==========================================================

  if (rpcRequest.method === "getProducts") {

    return res.json({
      jsonrpc: "2.0",
      result: products,
      id: requestId
    });
  }


  // ==========================================================
  // METHOD: cancelOrder
  // ==========================================================

  if (rpcRequest.method === "cancelOrder") {

    const params = rpcRequest.params || {};

    const orderId = params.orderId;


    if (!orderId) {

      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: "orderId is required"
        },
        id: requestId
      });
    }


    const order = orders.find(
      (o) => o.id === orderId
    );


    if (!order) {

      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "Order not found"
        },
        id: requestId
      });
    }


    // Already cancelled
    if (order.status === "Cancelled") {

      return res.json({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: "Order is already cancelled"
        },
        id: requestId
      });
    }


    // ===============================
    // RETURN PRODUCT STOCK
    // ===============================

    const product = products.find(
      (p) => p.id === order.productId
    );

    if (product) {
      product.stock += order.quantity;
    }


    // ===============================
    // CANCEL ORDER
    // ===============================

    order.status = "Cancelled";


    // ===============================
    // SOCKET.IO UPDATE
    // ===============================

    io.to(`order-${order.id}`).emit(
      "orderStatusUpdated",
      order
    );


    // ===============================
    // SSE ALERT
    // ===============================

    sendSSE("orderCancelled", {
      message:
        `Order ${order.id} has been cancelled`,
      order
    });


    return res.json({
      jsonrpc: "2.0",
      result: {
        message: "Order cancelled successfully",
        order
      },
      id: requestId
    });
  }


  // ==========================================================
  // UNKNOWN METHOD
  // ==========================================================

  return res.json({
    jsonrpc: "2.0",
    error: {
      code: -32601,
      message: "Method not found"
    },
    id: requestId
  });
});


// ============================================================
// SOCKET.IO
// REAL-TIME ORDER TRACKING + LIVE SUPPORT CHAT
// ============================================================

io.on("connection", (socket) => {

  console.log(
    "Client connected:",
    socket.id
  );


  // ==========================================================
  // JOIN ORDER ROOM
  // Customer and support agent join same order room
  // ==========================================================

  socket.on("joinOrder", (orderId) => {

    socket.join(`order-${orderId}`);


    console.log(
      `${socket.id} joined order room: order-${orderId}`
    );


    socket.emit("joinedOrder", {
      message:
        `Successfully joined order ${orderId}`,
      orderId
    });
  });


  // ==========================================================
  // SEND CHAT MESSAGE
  // ==========================================================

  socket.on("sendMessage", (messageData) => {

    const {
      orderId,
      sender,
      message
    } = messageData;


    if (!orderId || !sender || !message) {
      return;
    }


    const chatMessage = {
      orderId,
      sender,
      message,
      time: new Date().toISOString()
    };


    // Send message only to users in same order room
    io.to(`order-${orderId}`).emit(
      "receiveMessage",
      chatMessage
    );


    // Also send SSE system alert
    sendSSE("newMessage", {
      message:
        `New support message for order ${orderId}`,
      chatMessage
    });
  });


  // ==========================================================
  // DISCONNECT
  // ==========================================================

  socket.on("disconnect", () => {

    console.log(
      "Client disconnected:",
      socket.id
    );
  });
});


// ============================================================
// START SERVER
// ============================================================

server.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

  console.log(
    `REST API: http://localhost:${PORT}/api/v1/orders`
  );

  console.log(
    `JSON-RPC: http://localhost:${PORT}/rpc`
  );

  console.log(
    `SSE Events: http://localhost:${PORT}/events`
  );
});
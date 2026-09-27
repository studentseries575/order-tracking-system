// =========================================
// CONFIGURATION
// =========================================

const API_URL = "http://localhost:5000";


// =========================================
// SOCKET.IO CONNECTION
// =========================================

const socket = io(API_URL);

let selectedOrderId = null;
let ordersData = [];
let productsData = [];
let alertCount = 0;


// =========================================
// DOM ELEMENTS
// =========================================

const socketStatus = document.getElementById("socketStatus");
const socketStatusDot = document.getElementById("socketStatusDot");

const totalOrders = document.getElementById("totalOrders");
const activeOrders = document.getElementById("activeOrders");
const totalProducts = document.getElementById("totalProducts");
const alertCountElement = document.getElementById("alertCount");

const ordersList = document.getElementById("ordersList");
const productsList = document.getElementById("productsList");

const currentRoom = document.getElementById("currentRoom");
const chatMessages = document.getElementById("chatMessages");

const alertsList = document.getElementById("alertsList");
const sseStatus = document.getElementById("sseStatus");


// =========================================
// SOCKET.IO - CONNECTION
// =========================================

socket.on("connect", () => {

    socketStatus.innerText = "Socket.io Connected";

    socketStatusDot.classList.remove("offline");
    socketStatusDot.classList.add("online");

    showToast("Real-time connection established");

    console.log(
        "Socket.io connected:",
        socket.id
    );
});


socket.on("disconnect", () => {

    socketStatus.innerText = "Socket.io Disconnected";

    socketStatusDot.classList.remove("online");
    socketStatusDot.classList.add("offline");

    showToast("Real-time connection disconnected");
});


socket.on("connect_error", (error) => {

    socketStatus.innerText = "Connection Error";

    socketStatusDot.classList.remove("online");
    socketStatusDot.classList.add("offline");

    console.error(
        "Socket connection error:",
        error.message
    );
});


// =========================================
// LOAD PRODUCTS
// =========================================

async function loadProducts() {

    try {

        const response = await fetch(
            `${API_URL}/api/v1/products`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load products"
            );
        }

        productsData = await response.json();

        displayProducts(productsData);

        totalProducts.innerText =
            productsData.length;

    } catch (error) {

        console.error(
            "Products error:",
            error
        );

        productsList.innerHTML = `
            <div class="loading">
                Unable to load products.
            </div>
        `;
    }
}


// =========================================
// DISPLAY PRODUCTS
// =========================================

function displayProducts(products) {

    if (!products.length) {

        productsList.innerHTML = `
            <div class="loading">
                No products available.
            </div>
        `;

        return;
    }


    productsList.innerHTML =
        products.map(product => {

            return `
                <div class="product-card">

                    <div class="product-name">
                        ${escapeHTML(product.name)}
                    </div>

                    <div class="product-category">
                        ${escapeHTML(product.category)}
                    </div>

                    <div class="product-bottom">

                        <span class="product-price">
                            Rs. ${Number(product.price).toLocaleString()}
                        </span>

                        <span class="product-stock">
                            Stock: ${product.stock}
                        </span>

                    </div>

                </div>
            `;

        }).join("");
}


// =========================================
// LOAD ORDERS
// =========================================

async function loadOrders() {

    try {

        const response = await fetch(
            `${API_URL}/api/v1/orders`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load orders"
            );
        }

        ordersData = await response.json();

        displayOrders(ordersData);

        updateOrderStats(ordersData);

    } catch (error) {

        console.error(
            "Orders error:",
            error
        );

        ordersList.innerHTML = `
            <div class="loading">
                Unable to load orders.
            </div>
        `;
    }
}


// =========================================
// DISPLAY ORDERS
// =========================================

function displayOrders(orders) {

    if (!orders.length) {

        ordersList.innerHTML = `
            <div class="loading">
                No orders found.
            </div>
        `;

        return;
    }


    ordersList.innerHTML =
        orders.map(order => {

            const selected =
                selectedOrderId === order.id
                    ? "selected"
                    : "";


            return `
                <div
                    class="order-card ${selected}"
                    onclick="selectOrder('${order.id}')"
                >

                    <div class="order-top">

                        <span class="order-id">
                            ${escapeHTML(order.id)}
                        </span>

                        <span class="status ${getStatusClass(order.status)}">
                            ${escapeHTML(order.status)}
                        </span>

                    </div>


                    <div class="order-customer">
                        Customer:
                        ${escapeHTML(order.customerName)}
                    </div>


                    <div class="order-details">

                        <span>
                            Product:
                            ${escapeHTML(order.productId)}
                        </span>

                        <span>
                            Qty:
                            ${order.quantity}
                        </span>

                    </div>

                </div>
            `;

        }).join("");
}


// =========================================
// UPDATE ORDER STATISTICS
// =========================================

function updateOrderStats(orders) {

    totalOrders.innerText =
        orders.length;


    const activeStatuses = [
        "Pending",
        "Processing",
        "Shipped"
    ];


    const active =
        orders.filter(order =>
            activeStatuses.includes(
                order.status
            )
        );


    activeOrders.innerText =
        active.length;
}


// =========================================
// SELECT ORDER
// =========================================

function selectOrder(orderId) {

    selectedOrderId = orderId;


    // Join Socket.io room
    socket.emit(
        "joinOrder",
        orderId
    );


    currentRoom.innerText =
        `order-${orderId}`;


    displayOrders(ordersData);


    clearChat();


    addChatSystemMessage(
        `Connected to support room for ${orderId}`
    );


    showToast(
        `Tracking order ${orderId}`
    );
}


// =========================================
// SOCKET.IO - JOINED ORDER
// =========================================

socket.on(
    "joinedOrder",
    (data) => {

        console.log(
            "Joined order room:",
            data.orderId
        );
    }
);


// =========================================
// SOCKET.IO - ORDER CREATED
// =========================================

socket.on(
    "orderCreated",
    (order) => {

        showToast(
            `New order created: ${order.id}`
        );


        addAlert(
            `New order created: ${order.id}`
        );


        loadOrders();
        loadProducts();
    }
);


// =========================================
// SOCKET.IO - ORDER STATUS UPDATE
// =========================================

socket.on(
    "orderStatusUpdated",
    (order) => {

        showToast(
            `Order ${order.id} is now ${order.status}`
        );


        addAlert(
            `Order ${order.id} status changed to ${order.status}`
        );


        // Update local order data
        const index =
            ordersData.findIndex(
                item => item.id === order.id
            );


        if (index !== -1) {

            ordersData[index] = order;

        } else {

            ordersData.push(order);

        }


        displayOrders(ordersData);

        updateOrderStats(ordersData);


        // If selected order is updated
        if (
            selectedOrderId === order.id
        ) {

            addChatSystemMessage(
                `Order status updated to ${order.status}`
            );
        }
    }
);


// =========================================
// SOCKET.IO - RECEIVE CHAT
// =========================================

socket.on(
    "receiveMessage",
    (data) => {

        console.log(
            "Received message:",
            data
        );


        // Only display messages
        // for selected room
        if (
            selectedOrderId === data.orderId
        ) {

            addChatMessage(data);
        }
    }
);


// =========================================
// SEND CHAT MESSAGE
// =========================================

function sendChatMessage() {

    const messageInput =
        document.getElementById(
            "chatInput"
        );

    const senderInput =
        document.getElementById(
            "sender"
        );


    const message =
        messageInput.value.trim();


    const sender =
        senderInput.value;


    if (!selectedOrderId) {

        showToast(
            "Please select an order first"
        );

        return;
    }


    if (!message) {

        showToast(
            "Please enter a message"
        );

        return;
    }


    socket.emit(
        "sendMessage",
        {
            orderId: selectedOrderId,
            sender: sender,
            message: message
        }
    );


    messageInput.value = "";
}


// =========================================
// CHAT ENTER KEY
// =========================================

function handleChatKey(event) {

    if (event.key === "Enter") {

        sendChatMessage();
    }
}


// =========================================
// ADD CHAT MESSAGE
// =========================================

function addChatMessage(data) {

    // Remove empty message
    const empty =
        chatMessages.querySelector(
            ".empty-chat"
        );

    if (empty) {
        empty.remove();
    }


    const messageDiv =
        document.createElement(
            "div"
        );


    const isCustomer =
        data.sender === "Customer";


    messageDiv.className =
        `chat-message ${
            isCustomer
                ? "customer"
                : "support"
        }`;


    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "message-bubble";


    bubble.textContent =
        data.message;


    const meta =
        document.createElement(
            "div"
        );

    meta.className =
        "message-meta";


    meta.textContent =
        `${data.sender} • ${formatTime(data.time)}`;


    messageDiv.appendChild(
        bubble
    );

    messageDiv.appendChild(
        meta
    );


    chatMessages.appendChild(
        messageDiv
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


// =========================================
// CHAT SYSTEM MESSAGE
// =========================================

function addChatSystemMessage(
    message
) {

    const empty =
        chatMessages.querySelector(
            ".empty-chat"
        );

    if (empty) {
        empty.remove();
    }


    const div =
        document.createElement(
            "div"
        );


    div.style.textAlign =
        "center";

    div.style.color =
        "#737b8c";

    div.style.fontSize =
        "12px";

    div.style.padding =
        "8px";


    div.textContent =
        message;


    chatMessages.appendChild(
        div
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


// =========================================
// CLEAR CHAT
// =========================================

function clearChat() {

    chatMessages.innerHTML = `
        <div class="empty-chat">
            Start a conversation for this order.
        </div>
    `;
}


// =========================================
// SSE CONNECTION
// =========================================

function connectSSE() {

    const eventSource =
        new EventSource(
            `${API_URL}/events`
        );


    eventSource.onopen = () => {

        sseStatus.innerText =
            "Connected";

        sseStatus.style.background =
            "#e7f8ef";

        sseStatus.style.color =
            "#18a673";
    };


    eventSource.onerror = () => {

        sseStatus.innerText =
            "Disconnected";

        sseStatus.style.background =
            "#ffeaea";

        sseStatus.style.color =
            "#b53636";
    };


    // Connected event
    eventSource.addEventListener(
        "connected",
        (event) => {

            const data =
                JSON.parse(
                    event.data
                );


            addAlert(
                data.message
            );
        }
    );


    // Order created
    eventSource.addEventListener(
        "orderCreated",
        (event) => {

            const data =
                JSON.parse(
                    event.data
                );


            addAlert(
                data.message
            );


            loadOrders();
            loadProducts();
        }
    );


    // Order status
    eventSource.addEventListener(
        "orderStatusUpdated",
        (event) => {

            const data =
                JSON.parse(
                    event.data
                );


            addAlert(
                data.message
            );
        }
    );


    // Order cancelled
    eventSource.addEventListener(
        "orderCancelled",
        (event) => {

            const data =
                JSON.parse(
                    event.data
                );


            addAlert(
                data.message
            );


            loadOrders();
            loadProducts();
        }
    );


    // New chat message
    eventSource.addEventListener(
        "newMessage",
        (event) => {

            const data =
                JSON.parse(
                    event.data
                );


            addAlert(
                data.message
            );
        }
    );
}


// =========================================
// ADD ALERT
// =========================================

function addAlert(message) {

    const empty =
        alertsList.querySelector(
            ".empty-alert"
        );


    if (empty) {
        empty.remove();
    }


    alertCount++;

    alertCountElement.innerText =
        alertCount;


    const alert =
        document.createElement(
            "div"
        );

    alert.className =
        "alert";


    const text =
        document.createElement(
            "div"
        );

    text.textContent =
        message;


    const time =
        document.createElement(
            "span"
        );

    time.className =
        "alert-time";


    time.textContent =
        new Date().toLocaleTimeString();


    alert.appendChild(
        text
    );

    alert.appendChild(
        time
    );


    alertsList.prepend(
        alert
    );
}


// =========================================
// JSON-RPC CANCEL ORDER
// =========================================

async function cancelOrder(
    orderId
) {

    try {

        const response =
            await fetch(
                `${API_URL}/rpc`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        jsonrpc: "2.0",

                        method:
                            "cancelOrder",

                        params: {
                            orderId: orderId
                        },

                        id: Date.now()
                    })
                }
            );


        const data =
            await response.json();


        if (data.error) {

            showToast(
                data.error.message
            );

            return;
        }


        showToast(
            "Order cancelled successfully"
        );


        addAlert(
            `Order ${orderId} cancelled`
        );


        await loadOrders();
        await loadProducts();


    } catch (error) {

        console.error(
            "Cancel order error:",
            error
        );

        showToast(
            "Unable to cancel order"
        );
    }
}


// =========================================
// STATUS CLASS
// =========================================

function getStatusClass(status) {

    const value =
        status.toLowerCase();


    if (value === "pending") {
        return "status-pending";
    }

    if (value === "processing") {
        return "status-processing";
    }

    if (value === "shipped") {
        return "status-shipped";
    }

    if (value === "delivered") {
        return "status-delivered";
    }

    if (value === "cancelled") {
        return "status-cancelled";
    }

    return "status-processing";
}


// =========================================
// TOAST
// =========================================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    toastMessage.innerText =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);
}


// =========================================
// FORMAT TIME
// =========================================

function formatTime(time) {

    if (!time) {
        return "";
    }


    return new Date(
        time
    ).toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// =========================================
// SECURITY HELPER
// =========================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================
// INITIALIZE APP
// =========================================

async function initializeApp() {

    console.log(
        "Initializing OrderTrack..."
    );


    await loadOrders();

    await loadProducts();

    connectSSE();


    console.log(
        "OrderTrack initialized successfully"
    );
}


// =========================================
// START
// =========================================

initializeApp();
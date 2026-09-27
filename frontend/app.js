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

// Quantity chosen for each product (productId -> qty)
let quantities = {};

// Current search / category filter state
let searchTerm = "";
let categoryFilter = "All";


// =========================================
// DOM ELEMENTS
// =========================================

const socketStatus = document.getElementById("socketStatus");
const socketStatusDot = document.getElementById("socketStatusDot");

const totalOrders = document.getElementById("totalOrders");
const processingOrdersEl = document.getElementById("processingOrders");
const shippedOrdersEl = document.getElementById("shippedOrders");
const deliveredOrdersEl = document.getElementById("deliveredOrders");

const ordersList = document.getElementById("ordersList");
const productsList = document.getElementById("productsList");
const productCount = document.getElementById("productCount");
const productSearch = document.getElementById("productSearch");
const categoryFilterSelect = document.getElementById("categoryFilter");
const customerNameInput = document.getElementById("customerName");

const currentRoom = document.getElementById("currentRoom");
const chatMessages = document.getElementById("chatMessages");

const alertsList = document.getElementById("alertsList");
const sseStatus = document.getElementById("sseStatus");
const alertCountElement = document.getElementById("alertCount");

const orderModalOverlay = document.getElementById("orderModalOverlay");


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

        // Make sure every product has a quantity of at least 1 selected
        productsData.forEach((product) => {

            if (!quantities[product.id]) {
                quantities[product.id] = 1;
            }
        });

        populateCategoryFilter(productsData);

        applyProductFilters();

        productCount.innerText = productsData.length;

    } catch (error) {

        console.error(
            "Products error:",
            error
        );

        productsList.innerHTML = `
            <div class="loading">
                Unable to connect to server. Please try again.
            </div>
        `;
    }
}


// =========================================
// CATEGORY FILTER DROPDOWN
// =========================================

function populateCategoryFilter(products) {

    const categories = Array.from(
        new Set(products.map((p) => p.category))
    ).sort();

    const previousValue = categoryFilterSelect.value || "All";

    categoryFilterSelect.innerHTML =
        `<option value="All">All Categories</option>` +
        categories
            .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
            .join("");

    // Restore previous selection if it still exists
    if ([...categoryFilterSelect.options].some((o) => o.value === previousValue)) {
        categoryFilterSelect.value = previousValue;
    }
}


// =========================================
// APPLY SEARCH / CATEGORY FILTERS
// =========================================

function applyProductFilters() {

    searchTerm = productSearch.value.trim().toLowerCase();
    categoryFilter = categoryFilterSelect.value;

    let filtered = productsData;

    if (searchTerm) {
        filtered = filtered.filter((p) =>
            p.name.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter !== "All") {
        filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    displayProducts(filtered);
}


// =========================================
// DISPLAY PRODUCTS
// =========================================

function displayProducts(products) {

    if (!products.length) {

        productsList.innerHTML = `
            <div class="loading">
                No products match your search.
            </div>
        `;

        return;
    }


    productsList.innerHTML =
        products.map(product => {

            const qty = quantities[product.id] || 1;
            const outOfStock = product.stock <= 0;

            const stockClass =
                outOfStock ? "out" : (product.stock <= 5 ? "low" : "");

            const stockLabel =
                outOfStock ? "Out of stock" : `${product.stock} in stock`;

            const footer = outOfStock
                ? `<div class="out-of-stock-badge">Out of Stock</div>`
                : `
                    <div class="qty-control">
                        <button type="button" onclick="changeQuantity('${product.id}', -1)" ${qty <= 1 ? "disabled" : ""}>−</button>
                        <span>${qty}</span>
                        <button type="button" onclick="changeQuantity('${product.id}', 1)" ${qty >= product.stock ? "disabled" : ""}>+</button>
                    </div>
                    <button class="place-order-btn" onclick="placeOrder('${product.id}')">
                        Place Order
                    </button>
                `;

            return `
                <div class="product-card">

                    <div class="product-image-wrap">
                        <img
                            src="${escapeHTML(product.image || '')}"
                            alt="${escapeHTML(product.name)}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='https://placehold.co/500x400/eeedff/6c63ff?text=${encodeURIComponent(product.name)}'"
                        >
                        <span class="product-category-badge">${escapeHTML(product.category)}</span>
                    </div>

                    <div class="product-body">

                        <div class="product-name">
                            ${escapeHTML(product.name)}
                        </div>

                        <div class="product-bottom">

                            <span class="product-price">
                                Rs. ${Number(product.price).toLocaleString()}
                            </span>

                            <span class="product-stock ${stockClass}">
                                ${stockLabel}
                            </span>

                        </div>

                        ${footer}

                    </div>

                </div>
            `;

        }).join("");
}


// =========================================
// QUANTITY CONTROLS
// =========================================

function changeQuantity(productId, delta) {

    const product = productsData.find((p) => p.id === productId);

    if (!product) {
        return;
    }

    const current = quantities[productId] || 1;
    let next = current + delta;

    if (next < 1) {
        next = 1;
    }

    if (next > product.stock) {
        next = product.stock;
    }

    quantities[productId] = next;

    applyProductFilters();
}


// =========================================
// PLACE ORDER
// =========================================

async function placeOrder(productId) {

    const product = productsData.find((p) => p.id === productId);

    if (!product) {
        showToast("Product could not be found.");
        return;
    }

    const quantity = quantities[productId] || 1;

    if (quantity < 1) {
        showToast("Please select a valid quantity.");
        return;
    }

    if (quantity > product.stock) {
        showToast("Not enough stock available.");
        return;
    }

    const customerName =
        (customerNameInput.value || "").trim() || "Guest";


    // Disable the button briefly and show a loading state
    showToast("Placing order...");

    try {

        const response = await fetch(
            `${API_URL}/api/v1/orders`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    customerName,
                    productId,
                    quantity
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            showToast(data.message || "Order could not be created.");
            return;
        }

        const order = data.order;

        // Reset quantity selector for this product back to 1
        quantities[productId] = 1;

        // Refresh product + order data so the UI reflects new stock/order
        await loadProducts();
        await loadOrders();

        openOrderModal(order, product);

    } catch (error) {

        console.error("Place order error:", error);

        showToast("Unable to connect to server. Please try again.");
    }
}


// =========================================
// ORDER SUCCESS MODAL
// =========================================

function openOrderModal(order, product) {

    document.getElementById("modalOrderId").innerText = order.id;
    document.getElementById("modalProduct").innerText = product ? product.name : order.productId;
    document.getElementById("modalQuantity").innerText = order.quantity;
    document.getElementById("modalStatus").innerText = order.status;

    orderModalOverlay.classList.add("show");
}

function closeOrderModal() {

    const orderId = document.getElementById("modalOrderId").innerText;

    orderModalOverlay.classList.remove("show");

    if (orderId && orderId !== "-") {
        selectOrder(orderId);

        const el = document.getElementById(`order-${orderId}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
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
                Unable to connect to server. Please try again.
            </div>
        `;
    }
}


// =========================================
// ORDER TIMELINE
// =========================================

const TIMELINE_STEPS = ["Placed", "Processing", "Shipped", "Delivered"];

function statusToStepIndex(status) {

    const value = (status || "").toLowerCase();

    if (value === "pending" || value === "processing") return 1;
    if (value === "shipped") return 2;
    if (value === "delivered") return 3;

    return 0;
}

function renderTimeline(order) {

    if ((order.status || "").toLowerCase() === "cancelled") {

        return `
            <div class="order-timeline">
                <div class="timeline-step cancelled done">
                    <div class="timeline-dot"></div>
                    <div class="timeline-label">Cancelled</div>
                </div>
            </div>
        `;
    }

    const activeStep = statusToStepIndex(order.status);

    return `
        <div class="order-timeline">
            ${TIMELINE_STEPS.map((label, index) => `
                <div class="timeline-step ${index <= activeStep ? "done" : ""}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-label">${label}</div>
                </div>
            `).join("")}
        </div>
    `;
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
        orders.slice().reverse().map(order => {

            const selected =
                selectedOrderId === order.id
                    ? "selected"
                    : "";

            const product = productsData.find((p) => p.id === order.productId);
            const productName = product ? product.name : order.productId;

            const isCancelled = (order.status || "").toLowerCase() === "cancelled";
            const isDelivered = (order.status || "").toLowerCase() === "delivered";
            const canCancel = !isCancelled && !isDelivered;

            const timeLabel = order.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "";

            return `
                <div
                    id="order-${order.id}"
                    class="order-card ${selected}"
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
                            ${escapeHTML(productName)}
                        </span>

                        <span>
                            Qty: ${order.quantity}
                        </span>

                    </div>

                    ${timeLabel ? `<div class="order-time">Placed: ${escapeHTML(timeLabel)}</div>` : ""}

                    ${renderTimeline(order)}

                    <div class="order-actions">
                        <button class="track-btn" onclick="selectOrder('${order.id}')">
                            💬 Track / Chat
                        </button>
                        <button class="cancel-btn" onclick="cancelOrder('${order.id}')" ${canCancel ? "" : "disabled"}>
                            ✕ Cancel
                        </button>
                    </div>

                </div>
            `;

        }).join("");
}


// =========================================
// UPDATE ORDER STATISTICS
// =========================================

function updateOrderStats(orders) {

    totalOrders.innerText = orders.length;

    const count = (status) =>
        orders.filter((o) => (o.status || "").toLowerCase() === status).length;

    // "Pending" orders are counted alongside "Processing" since they
    // represent orders that have been placed but not yet shipped.
    processingOrdersEl.innerText = count("processing") + count("pending");
    shippedOrdersEl.innerText = count("shipped");
    deliveredOrdersEl.innerText = count("delivered");
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

        // Update local order data
        const exists = ordersData.some((item) => item.id === order.id);

        if (!exists) {

            ordersData.push(order);

            addAlert(
                `New order created: ${order.id}`
            );

            displayOrders(ordersData);
            updateOrderStats(ordersData);
        }
    }
);


// =========================================
// SOCKET.IO - ORDER STATUS UPDATE
// =========================================

socket.on(
    "orderStatusUpdated",
    (order) => {

        showToast(
            `Order ${order.id} status updated to ${order.status}`
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


    // System alert (e.g. new product added)
    eventSource.addEventListener(
        "systemAlert",
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

    if (!confirm(`Cancel order ${orderId}?`)) {
        return;
    }

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
            "Unable to connect to server. Please try again."
        );
    }
}


// =========================================
// STATUS CLASS
// =========================================

function getStatusClass(status) {

    const value =
        (status || "").toLowerCase();


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


    await loadProducts();

    await loadOrders();

    connectSSE();


    console.log(
        "OrderTrack initialized successfully"
    );
}


// =========================================
// START
// =========================================

initializeApp();
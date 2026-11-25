
/* ==========================================
   OMEGA GIFT POINT
   ADMIN ORDER MANAGEMENT
========================================== */

const supabaseClient = window.ogpSupabase;

const $ = (id) => document.getElementById(id);

let allOrders = [];
let selectedOrder = null;
let isSavingStatus = false;
let orderRealtimeChannel = null;

const ORDER_STATUSES = [
    "new",
    "confirmed",
    "processing",
    "ready",
    "shipped",
    "completed",
    "cancelled"
];


/* ==========================================
   1. HELPERS
========================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function statusLabel(status) {
    return String(status || "new")
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}


/* ==========================================
   2. AUTHENTICATION
========================================== */

async function protectOrdersPage() {

    if (!supabaseClient) {
        alert("Supabase connection unavailable.");
        return false;
    }

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return false;
    }

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
        profileError ||
        !profile ||
        !["owner", "staff"].includes(profile.role)
    ) {
        alert("You are not authorized to access this page.");

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return false;
    }

    return true;
}


/* ==========================================
   3. LOAD ORDERS
========================================== */

async function loadOrders() {

    const message = $("ordersMessage");
    const refreshButton = $("refreshBtn");

    if (message) {
        message.textContent = "Loading orders...";
    }

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    const { data, error } = await supabaseClient
        .from("orders")
        .select(`
            id,
            order_number,
            customer_name,
            customer_phone,
            delivery_method,
            delivery_address,
            notes,
            items,
            product_total,
            delivery_charge,
            status,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh";
    }

    if (error) {

        console.error("Order loading error:", error);

        if (message) {
            message.textContent =
                "Unable to load orders. Check your Supabase permissions.";
        }

        return;
    }

    allOrders = data || [];

    updateStatistics();

    renderOrders();
}


/* ==========================================
   4. STATISTICS
========================================== */

function updateStatistics() {

    const total = allOrders.length;

    const newCount = allOrders.filter(
        order => order.status === "new"
    ).length;

    const processingCount = allOrders.filter(
        order => order.status === "processing"
    ).length;

    // Database uses "completed", NOT "delivered"

    const completedCount = allOrders.filter(
        order => order.status === "completed"
    ).length;

    if ($("totalOrders")) {
        $("totalOrders").textContent = total;
    }

    if ($("newOrders")) {
        $("newOrders").textContent = newCount;
    }

    if ($("processingOrders")) {
        $("processingOrders").textContent = processingCount;
    }

    if ($("completedOrders")) {
        $("completedOrders").textContent = completedCount;
    }
}


/* ==========================================
   5. SEARCH AND FILTER
========================================== */

function getFilteredOrders() {

    const search = ($("orderSearch")?.value || "")
        .trim()
        .toLowerCase();

    const status = $("statusFilter")?.value || "all";

    return allOrders.filter(order => {

        const matchesSearch =
            String(order.order_number || "")
                .toLowerCase().includes(search) ||

            String(order.customer_name || "")
                .toLowerCase().includes(search) ||

            String(order.customer_phone || "")
                .includes(search);

        const matchesStatus =
            status === "all" || order.status === status;

        return matchesSearch && matchesStatus;
    });
}


/* ==========================================
   6. RENDER ORDERS
========================================== */

function renderOrders() {

    const filteredOrders = getFilteredOrders();

    const tableBody = $("ordersTableBody");
    const mobileOrders = $("mobileOrders");
    const message = $("ordersMessage");

    if (message) {
        message.textContent = filteredOrders.length
            ? ""
            : "No orders found.";
    }

    // DESKTOP TABLE

    if (tableBody) {

        tableBody.innerHTML = filteredOrders.map(order => `
            <tr>
                <td>
                    <strong class="order-id">
                        ${escapeHTML(order.order_number)}
                    </strong>
                </td>

                <td>
                    <div class="customer-name">
                        ${escapeHTML(order.customer_name)}
                    </div>

                    <div class="customer-phone">
                        ${escapeHTML(order.customer_phone)}
                    </div>
                </td>

                <td>
                    ${escapeHTML(formatDate(order.created_at))}
                </td>

                <td>
                    ${Array.isArray(order.items) ? order.items.length : 0}
                </td>

                <td>
                    ${escapeHTML(formatPrice(order.product_total))}
                </td>

                <td>
                    <span class="status-badge status-${escapeHTML(order.status)}">
                        ${escapeHTML(statusLabel(order.status))}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="view-order-btn"
                        data-order-id="${escapeHTML(order.id)}"
                    >
                        View Details
                    </button>
                </td>
            </tr>
        `).join("");
    }

    // MOBILE CARDS

    if (mobileOrders) {

        mobileOrders.innerHTML = filteredOrders.map(order => `
            <div class="mobile-order-card">

                <div>
                    <strong>
                        ${escapeHTML(order.order_number)}
                    </strong>

                    <span class="status-badge status-${escapeHTML(order.status)}">
                        ${escapeHTML(statusLabel(order.status))}
                    </span>
                </div>

                <p>${escapeHTML(order.customer_name)}</p>

                <p>${escapeHTML(order.customer_phone)}</p>

                <p>
                    Total:
                    ${escapeHTML(formatPrice(order.product_total))}
                </p>

                <small>
                    ${escapeHTML(formatDate(order.created_at))}
                </small>

                <button
                    type="button"
                    class="view-order-btn"
                    data-order-id="${escapeHTML(order.id)}"
                >
                    View Order
                </button>

            </div>
        `).join("");
    }
}


/* ==========================================
   7. OPEN ORDER DETAILS
========================================== */

function openOrderModal(orderId) {

    const order = allOrders.find(
        item => String(item.id) === String(orderId)
    );

    if (!order) {
        console.error("Order not found:", orderId);
        return;
    }

    selectedOrder = order;

    const items = Array.isArray(order.items)
        ? order.items
        : [];

    const itemsHTML = items.map((item, index) => `
        <div class="order-item">

            <strong>
                ${index + 1}. ${escapeHTML(item.name || "Product")}
            </strong>

            <p>Quantity: ${escapeHTML(item.quantity)}</p>

            <p>Variant: ${escapeHTML(item.variant || "—")}</p>

            <p>Price: ${escapeHTML(formatPrice(item.price))}</p>

            <p>Subtotal: ${escapeHTML(formatPrice(item.subtotal))}</p>

            ${item.customText
                ? `<p>Custom text: ${escapeHTML(item.customText)}</p>`
                : ""}

            ${item.photoName
                ? `<p>Selected photo: ${escapeHTML(item.photoName)}</p>`
                : ""}

        </div>
    `).join("");

    const details = $("orderDetails");
    const modal = $("orderModal");

    if (!details || !modal) {
        console.error("Order modal HTML elements are missing.");
        return;
    }

    details.innerHTML = `
        <div class="order-detail-section">

            <h3>Order Information</h3>

            <p>
                <strong>Order Number:</strong>
                ${escapeHTML(order.order_number)}
            </p>

            <p>
                <strong>Placed:</strong>
                ${escapeHTML(formatDate(order.created_at))}
            </p>

        </div>

        <div class="order-detail-section">

            <h3>Customer Details</h3>

            <p>
                <strong>Name:</strong>
                ${escapeHTML(order.customer_name)}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHTML(order.customer_phone)}
            </p>

        </div>

        <div class="order-detail-section">

            <h3>Delivery Details</h3>

            <p>
                <strong>Method:</strong>
                ${escapeHTML(order.delivery_method)}
            </p>

            <p>
                <strong>Address:</strong>
                ${escapeHTML(order.delivery_address || "Shop pickup")}
            </p>

        </div>

        <div class="order-detail-section">

            <h3>Ordered Products</h3>

            ${itemsHTML || "<p>No product details available.</p>"}

        </div>

        <div class="order-detail-section">

            <h3>Payment Summary</h3>

            <p>
                <strong>Product Total:</strong>
                ${escapeHTML(formatPrice(order.product_total))}
            </p>

            <p>
                <strong>Delivery Charge:</strong>
                ${escapeHTML(formatPrice(order.delivery_charge))}
            </p>

            <p>
                <strong>Grand Total:</strong>
                ${escapeHTML(formatPrice(
                    Number(order.product_total || 0) +
                    Number(order.delivery_charge || 0)
                ))}
            </p>

        </div>

        <div class="order-detail-section">

            <h3>Additional Instructions</h3>

            <p>${escapeHTML(order.notes || "None")}</p>

        </div>

        <div class="order-detail-section">

            <h3>Update Order Status</h3>

            <select id="orderStatusSelect" class="status-control">

                ${ORDER_STATUSES.map(status => `
                    <option
                        value="${status}"
                        ${order.status === status ? "selected" : ""}
                    >
                        ${statusLabel(status)}
                    </option>
                `).join("")}

            </select>

            <button
                type="button"
                id="saveOrderStatus"
                class="save-status-btn"
            >
                Save Status
            </button>

        </div>
    `;

    modal.classList.add("show");

    document.body.style.overflow = "hidden";

    $("saveOrderStatus")?.addEventListener(
        "click",
        saveOrderStatus
    );
}


/* ==========================================
   8. SAVE ORDER STATUS
========================================== */

async function saveOrderStatus() {

    if (!selectedOrder || isSavingStatus) return;

    const button = $("saveOrderStatus");

    const newStatus = $("orderStatusSelect")?.value;

    if (!ORDER_STATUSES.includes(newStatus)) {
        alert("Invalid order status.");
        return;
    }

    isSavingStatus = true;

    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {

        const { data, error } = await supabaseClient
            .from("orders")
            .update({
                status: newStatus
            })
            .eq("id", selectedOrder.id)
            .select("id, status")
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Order status was not returned by Supabase.");
        }

        console.log("Order status updated:", data);

        alert(
            "Order status updated to " +
            statusLabel(data.status) +
            " successfully!"
        );

        closeOrderModal();

        await loadOrders();

    } catch (error) {

        console.error(
            "Order status update error:",
            error
        );

        alert(
            "Unable to update order status.\n\n" +
            error.message
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Save Status";
        }

    } finally {

        isSavingStatus = false;

    }
}


/* ==========================================
   9. CLOSE MODAL
========================================== */

function closeOrderModal() {

    $("orderModal")?.classList.remove("show");

    document.body.style.overflow = "";

    selectedOrder = null;
}


/* ==========================================
   10. EVENT LISTENERS
========================================== */

function setupOrderEvents() {

    $("orderSearch")?.addEventListener(
        "input",
        renderOrders
    );

    $("statusFilter")?.addEventListener(
        "change",
        renderOrders
    );

    $("refreshBtn")?.addEventListener(
        "click",
        loadOrders
    );

    // DESKTOP VIEW DETAILS

    $("ordersTableBody")?.addEventListener(
        "click",
        event => {

            const button = event.target.closest(".view-order-btn");

            if (button) {
                openOrderModal(button.dataset.orderId);
            }

        }
    );

    // MOBILE VIEW DETAILS

    $("mobileOrders")?.addEventListener(
        "click",
        event => {

            const button = event.target.closest(".view-order-btn");

            if (button) {
                openOrderModal(button.dataset.orderId);
            }

        }
    );

    $("closeModal")?.addEventListener(
        "click",
        closeOrderModal
    );

    $("modalOverlay")?.addEventListener(
        "click",
        closeOrderModal
    );

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeOrderModal();
        }

    });

    // MOBILE MENU

    $("menuToggle")?.addEventListener(
        "click",
        () => {
            $("sidebar")?.classList.toggle("open");
        }
    );

    // LOGOUT

    $("logoutBtn")?.addEventListener(
        "click",
        async () => {

            await supabaseClient.auth.signOut();

            window.location.href = "login.html";

        }
    );
}


/* ==========================================
   11. LIVE ORDER NOTIFICATIONS
========================================== */

function showOrderNotification(orderNumber) {

    const oldToast = document.querySelector(".ogp-live-toast");

    if (oldToast) {
        oldToast.remove();
    }

    const toast = document.createElement("div");

    toast.className = "ogp-live-toast";

    toast.textContent = orderNumber
        ? `New customer order received: ${orderNumber}`
        : "Your orders have been updated!";

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => toast.remove(), 300);

    }, 5000);
}


function enableOrderRealtime() {

    if (orderRealtimeChannel) return;

    orderRealtimeChannel = supabaseClient
        .channel("omega-admin-orders-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "orders"
            },
            async (payload) => {

                console.log("Live order event:", payload);

                if (payload.eventType === "INSERT") {

                    showOrderNotification(
                        payload.new?.order_number
                    );

                }

                await loadOrders();

            }
        )
        .subscribe(status => {

            console.log("Order Realtime status:", status);

        });
}


/* ==========================================
   12. INITIALIZE
========================================== */

async function initializeOrdersPage() {

    const authorized = await protectOrdersPage();

    if (!authorized) return;

    setupOrderEvents();

    await loadOrders();

    enableOrderRealtime();

    console.log(
        "Omega Gift Point: Order Management Ready!"
    );
}

initializeOrdersPage();

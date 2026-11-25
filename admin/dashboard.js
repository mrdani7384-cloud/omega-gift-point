
/* ==========================================
   OMEGA GIFT POINT
   ADMIN DASHBOARD + BUSINESS ANALYTICS
========================================== */

const supabaseClient = window.ogpSupabase;

const $ = (id) => document.getElementById(id);

let salesChartInstance = null;


/* ==========================================
   1. PROTECT DASHBOARD
========================================== */

async function protectDashboard() {

    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.replace("login.html");
        return null;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (
        profileError ||
        !profile ||
        !["owner", "staff"].includes(profile.role)
    ) {
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return null;
    }

    $("adminEmail").textContent = user.email || "Admin";
    $("adminRole").textContent = profile.role;

    $("accessStatus").textContent =
        "Verified — " + profile.role;

    $("connectionStatus").textContent = "Connected";

    return { user, profile };
}


/* ==========================================
   2. LOAD ORIGINAL DASHBOARD STATISTICS
========================================== */

async function loadDashboardStats() {

    const [
        allProducts,
        activeProducts,
        orders
    ] = await Promise.all([

        supabaseClient
            .from("products")
            .select("id", {
                count: "exact",
                head: true
            }),

        supabaseClient
            .from("products")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("is_active", true),

        supabaseClient
            .from("orders")
            .select("id", {
                count: "exact",
                head: true
            })

    ]);

    if (allProducts.error) {

        $("totalProducts").textContent = "—";
        console.error("Products count:", allProducts.error.message);

    } else {

        $("totalProducts").textContent =
            allProducts.count ?? 0;

    }

    if (activeProducts.error) {

        $("activeProducts").textContent = "—";
        console.error("Active products:", activeProducts.error.message);

    } else {

        $("activeProducts").textContent =
            activeProducts.count ?? 0;

    }

    if (orders.error) {

        $("totalOrders").textContent = "—";
        console.error("Orders count:", orders.error.message);

    } else {

        $("totalOrders").textContent =
            orders.count ?? 0;

    }

}


/* ==========================================
   3. CURRENCY FORMAT
========================================== */

function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

}


/* ==========================================
   4. FETCH ALL ORDERS
========================================== */

async function fetchAllAnalyticsOrders() {

    const allOrders = [];
    const pageSize = 500;

    let offset = 0;

    while (true) {

        const { data, error } = await supabaseClient
            .from("orders")
            .select(`
                order_number,
                status,
                product_total,
                created_at,
                items
            `)
            .order("created_at", {
                ascending: false
            })
            .range(offset, offset + pageSize - 1);

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            break;
        }

        allOrders.push(...data);

        if (data.length < pageSize) {
            break;
        }

        offset += pageSize;

    }

    return allOrders;

}


/* ==========================================
   5. LOAD BUSINESS ANALYTICS
========================================== */

async function loadBusinessAnalytics() {

    const orders = await fetchAllAnalyticsOrders();

    const normalizedOrders = orders.map(order => ({
        ...order,
        status: String(order.status || "").toLowerCase()
    }));


    // Completed and pending order calculations

    const completedOrdersList = normalizedOrders.filter(
        order => order.status === "completed"
    );

    const pendingOrders = normalizedOrders.filter(
        order => !["completed", "cancelled"].includes(order.status)
    );


    // Calculate completed sales revenue

    const totalRevenue = completedOrdersList.reduce(
        (total, order) =>
            total + (Number(order.product_total) || 0),
        0
    );


    // Update analytics cards

    $("totalRevenue").textContent =
        formatCurrency(totalRevenue);

    $("analyticsTotalOrders").textContent =
        normalizedOrders.length;

    $("pendingOrders").textContent =
        pendingOrders.length;

    $("completedOrders").textContent =
        completedOrdersList.length;


    // Other analytics

    renderMonthlySales(completedOrdersList);

    renderBestSellingProducts(normalizedOrders);

    renderRecentOrders(normalizedOrders);

}


/* ==========================================
   6. MONTHLY SALES CHART
========================================== */

function renderMonthlySales(completedOrders) {

    const canvas = $("salesChart");

    if (!canvas || typeof Chart === "undefined") {

        console.error("Chart.js or salesChart canvas not found.");

        return;

    }

    const labels = [];
    const monthlyTotals = [];

    const today = new Date();

    const monthMap = new Map();


    // Prepare the last six months

    for (let i = 5; i >= 0; i--) {

        const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        const key =
            date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0");

        labels.push(
            date.toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            })
        );

        monthMap.set(key, 0);

    }


    // Calculate completed sales by month

    completedOrders.forEach(order => {

        const date = new Date(order.created_at);

        if (Number.isNaN(date.getTime())) return;

        const key =
            date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0");

        if (monthMap.has(key)) {

            monthMap.set(
                key,
                monthMap.get(key) +
                (Number(order.product_total) || 0)
            );

        }

    });


    monthlyTotals.push(...monthMap.values());


    // Destroy old chart before refreshing

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }


    salesChartInstance = new Chart(canvas, {

        type: "bar",

        data: {

            labels,

            datasets: [{

                label: "Completed Sales",

                data: monthlyTotals,

                backgroundColor: "#b73532",

                borderColor: "#d9b77e",

                borderWidth: 1,

                borderRadius: 7,

                maxBarThickness: 45

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            return formatCurrency(context.raw);

                        }

                    }

                }

            },

            scales: {

                x: {

                    ticks: {
                        color: "#b9aaa2"
                    },

                    grid: {
                        display: false
                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {

                        color: "#b9aaa2",

                        callback: function(value) {

                            return "₹" +
                                Number(value).toLocaleString("en-IN");

                        }

                    },

                    grid: {
                        color: "rgba(255,255,255,0.07)"
                    }

                }

            }

        }

    });

}


/* ==========================================
   7. BEST-SELLING PRODUCTS
========================================== */

function renderBestSellingProducts(orders) {

    const container = $("bestSellingProducts");

    container.replaceChildren();

    const productMap = new Map();


    orders.forEach(order => {

        // Cancelled orders should not count as sales

        if (order.status === "cancelled") return;

        const items = Array.isArray(order.items)
            ? order.items
            : [];


        items.forEach(item => {

            const productId = String(
                item.id ?? item.name ?? "unknown"
            );

            const quantity = Number(item.quantity) || 0;

            if (quantity <= 0) return;

            if (!productMap.has(productId)) {

                productMap.set(productId, {
                    name: String(item.name || "Unnamed Product"),
                    quantity: 0
                });

            }

            productMap.get(productId).quantity += quantity;

        });

    });


    const products = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);


    if (products.length === 0) {

        showAnalyticsEmpty(
            container,
            "No product sales available yet."
        );

        return;

    }


    products.forEach(product => {

        const row = document.createElement("div");
        row.className = "best-product-row";

        const info = document.createElement("div");

        const name = document.createElement("div");
        name.className = "best-product-name";
        name.textContent = product.name;

        const sales = document.createElement("div");
        sales.className = "best-product-sales";
        sales.textContent = "Total quantity sold";

        info.append(name, sales);

        const count = document.createElement("div");
        count.className = "best-product-count";
        count.textContent = product.quantity + " sold";

        row.append(info, count);

        container.appendChild(row);

    });

}


/* ==========================================
   8. RECENT ORDERS
========================================== */

function renderRecentOrders(orders) {

    const container = $("recentOrders");

    container.replaceChildren();

    const recentOrders = orders.slice(0, 5);


    if (recentOrders.length === 0) {

        showAnalyticsEmpty(
            container,
            "No orders received yet."
        );

        return;

    }


    recentOrders.forEach(order => {

        const row = document.createElement("div");
        row.className = "recent-order-row";

        const info = document.createElement("div");

        const number = document.createElement("div");
        number.className = "recent-order-number";
        number.textContent =
            order.order_number || "Order";

        const date = document.createElement("div");
        date.className = "recent-order-date";

        const createdDate = new Date(order.created_at);

        date.textContent = Number.isNaN(createdDate.getTime())
            ? "Date unavailable"
            : createdDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });

        info.append(number, date);


        const status = document.createElement("span");
        status.className = "recent-order-status";
        status.textContent = order.status || "unknown";

        row.append(info, status);

        container.appendChild(row);

    });

}


/* ==========================================
   9. EMPTY STATE
========================================== */

function showAnalyticsEmpty(container, message) {

    const empty = document.createElement("div");

    empty.className = "analytics-empty";

    empty.textContent = message;

    container.appendChild(empty);

}


/* ==========================================
   10. LOGOUT
========================================== */

async function logout() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {

        alert("Sign out failed: " + error.message);

        return;

    }

    window.location.replace("login.html");

}


/* ==========================================
   11. DASHBOARD NAVIGATION
========================================== */

function setupDashboardNavigation() {

    const sidebar = $("sidebar");

    const overlay = $("mobileOverlay");


    $("menuToggle").addEventListener("click", () => {

        sidebar.classList.toggle("open");

        overlay.classList.toggle("show");

    });


    overlay.addEventListener("click", () => {

        sidebar.classList.remove("open");

        overlay.classList.remove("show");

    });


    $("logoutButton").addEventListener(
        "click",
        logout
    );


    $("viewStoreButton").addEventListener("click", () => {

        window.open("../index.html", "_blank");

    });


    const openProducts = () => {

        window.location.href = "product-management.html";

    };


    $("addProductButton").addEventListener(
        "click",
        openProducts
    );

    $("manageProductsButton").addEventListener(
        "click",
        openProducts
    );


    $("staffLink").addEventListener("click", (event) => {

        event.preventDefault();

        alert(
            "Staff management will be added in a later step."
        );

    });

}


/* ==========================================
   12. INITIALIZE DASHBOARD
========================================== */

async function initializeDashboard() {

    $("currentDate").textContent =
        new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date());


    setupDashboardNavigation();


    const access = await protectDashboard();

    if (!access) return;


    try {

        await loadDashboardStats();

        await loadBusinessAnalytics();

        console.log(
            "Omega Gift Point: Business Analytics Ready!"
        );

    } catch (error) {

        console.error(
            "Analytics loading error:",
            error
        );

        $("totalRevenue").textContent = "—";
        $("analyticsTotalOrders").textContent = "—";
        $("pendingOrders").textContent = "—";
        $("completedOrders").textContent = "—";

        showAnalyticsEmpty(
            $("bestSellingProducts"),
            "Unable to load product analytics."
        );

        showAnalyticsEmpty(
            $("recentOrders"),
            "Unable to load recent orders."
        );

    }

}


/* ==========================================
   13. START DASHBOARD
========================================== */

initializeDashboard();

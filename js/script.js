
/* ==========================================
   OMEGA GIFT POINT
   PRODUCT CUSTOMIZATION + SHOPPING CART
========================================== */

const WHATSAPP_NUMBER = "917676344792";

/* ==========================================
   1. PRODUCT DATABASE
   Prices are demo prices. Update before launch.
========================================== */

let products = [
    {
        id: 1,
        name: "Customized Photo Mug",
        category: "Mugs",
        price: 249,
        image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=85",
        description: "A beautiful personalized photo mug.",
        tag: "POPULAR",
        variants: ["Standard", "Blue Handle", "Heart Handle"]
    },
    {
        id: 2,
        name: "Customized T-Shirt",
        category: "T-Shirts",
        price: 399,
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=85",
        description: "Wear your favourite memories.",
        tag: "TRENDING",
        variants: ["S", "M", "L", "XL", "XXL"]
    },
    {
        id: 3,
        name: "Personalized Water Bottle",
        category: "Water Bottles",
        price: 349,
        image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=85",
        description: "A bottle customized with your name.",
        tag: "NEW",
        variants: ["Standard", "Large"]
    },
    {
        id: 4,
        name: "Personalized Photo Frame",
        category: "Photo Frames",
        price: 299,
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=85",
        description: "Keep your favourite moments close.",
        tag: "POPULAR",
        variants: ["4 x 6 inch", "5 x 7 inch", "8 x 10 inch"]
    },
    {
        id: 5,
        name: "Premium Acrylic Frame",
        category: "Acrylic Frames",
        price: 499,
        image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=85",
        description: "Elegant personalized acrylic decor.",
        tag: "PREMIUM",
        variants: ["Small", "Medium", "Large"]
    },
    {
        id: 6,
        name: "LED Photo Frame",
        category: "LED Frames",
        price: 699,
        image: "https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=600&q=85",
        description: "Light up your special memories.",
        tag: "SPECIAL",
        variants: ["Standard", "With LED"]
    },
    {
        id: 7,
        name: "Customized Keychain",
        category: "Keychains",
        price: 99,
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=85",
        description: "Carry your memories everywhere.",
        tag: "BUDGET PICK",
        variants: ["Standard", "Double Side"]
    },
    {
        id: 8,
        name: "Customized Mobile Case",
        category: "Mobile Cases",
        price: 299,
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=85",
        description: "Give your phone a personal touch.",
        tag: "TRENDING",
        variants: ["Please confirm phone model"]
    },
    {
        id: 9,
        name: "Personalized Cushion",
        category: "Pillows",
        price: 449,
        image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&q=85",
        description: "A soft gift filled with memories.",
        tag: "POPULAR",
        variants: ["Standard"]
    },
    {
        id: 10,
        name: "Custom Caricature",
        category: "Caricatures",
        price: 599,
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=85",
        description: "A fun personalized artwork.",
        tag: "UNIQUE",
        variants: ["Digital Design", "Printed"]
    },
    {
        id: 11,
        name: "Personalized Photo Album",
        category: "Photo Albums",
        price: 499,
        image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=85",
        description: "Collect your memories in one place.",
        tag: "SPECIAL",
        variants: ["Small", "Medium", "Large"]
    },
    {
        id: 12,
        name: "Magic Mirror Gift",
        category: "Magic Mirrors",
        price: 399,
        image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=85",
        description: "A creative personalized gift.",
        tag: "NEW",
        variants: ["Standard"]
    }
];

/* ==========================================
   2. HELPER FUNCTIONS
========================================== */

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}

function createCartKey(item) {
    return [
        item.id,
        item.variant || "",
        item.customText || "",
        item.photoName || ""
    ].join("::");
}

/* ==========================================
   SUPABASE LIVE PRODUCT LOADER
========================================== */

async function loadProductsFromSupabase() {

    try {

        console.log("Loading products from Supabase...");

        const { data, error } = await window.ogpSupabase
            .from("products")
            .select(`
                id,
                name,
                category,
                price,
                description,
                image_urls,
                variants,
                tag,
                is_active,
                sort_order
            `)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn("No active products found. Using fallback products.");
            return;
        }

        products = data.map(product => ({
            id: Number(product.id),
            name: product.name,
            category: product.category,
            price: Number(product.price),
            image: product.image_urls?.[0] || "",
            description: product.description || "",
            tag: product.tag || "",
            variants: product.variants || []
        }));

        console.log("Supabase products loaded:", products.length);

        // Refresh shop and cart with database data
        updateCategory(selectedCategory);
        renderCart();

    } catch (error) {

        console.error("Could not load Supabase products:", error.message);

        console.warn("Using existing local product data.");

    }
}


/* ==========================================
   SUPABASE REALTIME - LIVE PRODUCT SYNC
========================================== */

function enableProductRealtime() {
    if (!window.ogpSupabase) {
        console.error("Supabase client not available.");
        return;
    }

    window.ogpSupabase
        .channel("omega-products-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "products"
            },
            async (payload) => {
                console.log("Product change detected:", payload);

                await loadProductsFromSupabase();

                console.log("Customer website products refreshed!");
            }
        )
        .subscribe((status) => {
            console.log("Product Realtime status:", status);
        });
}

enableProductRealtime();


/* ==========================================
   3. MOBILE NAVIGATION
========================================== */

const menuToggle = byId("menuToggle");
const navigation = byId("navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navigation.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navigation.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.textContent = "☰";
        });
    });
}

/* ==========================================
   4. SHOP FILTERS AND SEARCH
========================================== */

const productGrid = byId("productGrid");
const noProducts = byId("noProducts");
const productSearch = byId("productSearch");
const categoryFilter = byId("categoryFilter");
const shopFilters = $(".shop-filters");
const sortProducts = byId("sortProducts");

let selectedCategory = "all";

const categoryGroups = {
    mugs: ["Mugs"],
    tshirts: ["T-Shirts"],
    bottles: ["Water Bottles"],
    frames: ["Photo Frames", "Acrylic Frames", "LED Frames"],
    keychains: ["Keychains"],
    other: [
        "Mobile Cases",
        "Pillows",
        "Caricatures",
        "Photo Albums",
        "Magic Mirrors"
    ]
};

function updateCategory(value) {
    const valid = ["all", ...Object.keys(categoryGroups)];

    selectedCategory = valid.includes(value) ? value : "all";

    if (categoryFilter) {
        categoryFilter.value = selectedCategory;
    }

    if (shopFilters) {
        shopFilters.querySelectorAll(".filter-btn").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.filter === selectedCategory
            );
        });
    }

    renderProducts();
}

function renderProducts() {
    if (!productGrid) return;

    const searchTerm = productSearch
        ? productSearch.value.toLowerCase().trim()
        : "";

    let filtered = products.filter(product => {
        const groups = Object.keys(categoryGroups).filter(group =>
            categoryGroups[group].includes(product.category)
        );

        const matchesCategory =
            selectedCategory === "all" ||
            groups.includes(selectedCategory);

        const matchesSearch = [
            product.name,
            product.category,
            product.description
        ].join(" ").toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    const sort = sortProducts?.value || "default";

    if (["low", "price-low-high"].includes(sort)) {
        filtered.sort((a, b) => a.price - b.price);
    } else if (["high", "price-high-low"].includes(sort)) {
        filtered.sort((a, b) => b.price - a.price);
    } else if (["name", "name-a-z"].includes(sort)) {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (noProducts) {
        noProducts.hidden = filtered.length !== 0;
    }

    productGrid.innerHTML = filtered.map(product => `
        <article class="product-card" data-category="${escapeHTML(product.category)}">
            <div class="product-image">
                <img
                    src="${escapeHTML(product.image)}"
                    alt="${escapeHTML(product.name)}"
                    loading="lazy"
                >
                <span class="product-tag">${escapeHTML(product.tag)}</span>

                <button
                    class="quick-add"
                    type="button"
                    data-customize="${product.id}"
                    aria-label="Customize ${escapeHTML(product.name)}"
                >+</button>
            </div>

            <div class="product-info">
                <span class="product-category">${escapeHTML(product.category)}</span>
                <h3>${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(product.description)}</p>

                <div class="product-bottom">
                    <strong>${formatPrice(product.price)}</strong>
                    <button
                        class="add-cart-btn"
                        type="button"
                        data-customize="${product.id}"
                    >CUSTOMIZE</button>
                </div>
            </div>
        </article>
    `).join("");
}

if (productSearch) {
    productSearch.addEventListener("input", renderProducts);
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
        updateCategory(categoryFilter.value);
    });
}

if (shopFilters) {
    shopFilters.querySelectorAll(".filter-btn").forEach(button => {
        button.addEventListener("click", () => {
            updateCategory(button.dataset.filter);
        });
    });
}

if (sortProducts) {
    sortProducts.addEventListener("change", renderProducts);
}

/* ==========================================
   5. CATEGORY CARD CONNECTION
========================================== */

const categoryCardGroups = {
    "Mugs": "mugs",
    "T-Shirts": "tshirts",
    "Water Bottles": "bottles",
    "Photo Frames": "frames",
    "Acrylic Frames": "frames",
    "LED Frames": "frames",
    "Keychains": "keychains",
    "Magic Mirrors": "other",
    "Mobile Cases": "other",
    "Pillows": "other",
    "Caricatures": "other",
    "Photo Albums": "other"
};

document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
        const heading = card.querySelector("h3");
        if (!heading) return;

        const group = categoryCardGroups[heading.textContent.trim()];

        if (group) {
            updateCategory(group);
        }
    });
});

/* ==========================================
   6. CUSTOMIZATION MODAL
========================================== */

const customizeModal = byId("customizeModal");
const customizeOverlay = byId("customizeOverlay");
const closeCustomize = byId("closeCustomize");

const customizeImage = byId("customizeImage");
const customizeName = byId("customizeName");
const customizeDescription = byId("customizeDescription");
const customizePrice = byId("customizePrice");
const customizeVariant = byId("customizeVariant");
const customizeText = byId("customizeText");
const customizePhoto = byId("customizePhoto");
const customizePreview = byId("customizePreview");
const customizeQuantity = byId("customizeQuantity");
const addCustomizedProduct = byId("addCustomizedProduct");

let selectedProduct = null;
let selectedPhotoName = "";
let previewURL = null;

function openCustomize(productId) {
    selectedProduct = products.find(product => product.id === Number(productId));

    if (!selectedProduct || !customizeModal) return;

    if (customizeImage) {
        customizeImage.src = selectedProduct.image;
        customizeImage.alt = selectedProduct.name;
    }

    if (customizeName) {
        customizeName.textContent = selectedProduct.name;
    }

    if (customizeDescription) {
        customizeDescription.textContent = selectedProduct.description;
    }

    if (customizePrice) {
        customizePrice.textContent = formatPrice(selectedProduct.price);
    }

    if (customizeVariant) {
        customizeVariant.innerHTML = selectedProduct.variants
            .map(variant => `<option value="${escapeHTML(variant)}">${escapeHTML(variant)}</option>`)
            .join("");
    }

    if (customizeText) customizeText.value = "";
    if (customizePhoto) customizePhoto.value = "";
    if (customizeQuantity) customizeQuantity.value = "1";

    selectedPhotoName = "";

    if (customizePreview) {
        customizePreview.innerHTML = "";
    }

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    customizeModal.classList.add("active");
    customizeModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeCustomizeModal() {
    if (!customizeModal) return;

    customizeModal.classList.remove("active");
    customizeModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }
}

if (productGrid) {
    productGrid.addEventListener("click", event => {
        const button = event.target.closest("[data-customize]");
        if (!button) return;

        openCustomize(button.dataset.customize);
    });
}

if (closeCustomize) {
    closeCustomize.addEventListener("click", closeCustomizeModal);
}

if (customizeOverlay) {
    customizeOverlay.addEventListener("click", closeCustomizeModal);
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeCustomizeModal();
        closeCartPanel();
    }
});

/* PHOTO UPLOAD - WITHOUT PREVIEW */

if (customizePhoto) {
    customizePhoto.addEventListener("change", () => {
        const file = customizePhoto.files?.[0];

        selectedPhotoName = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            customizePhoto.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Please choose an image smaller than 5 MB.");
            customizePhoto.value = "";
            return;
        }

        selectedPhotoName = file.name;
    });
}

/* ==========================================
   7. CART STORAGE
========================================== */

let cart = [];

try {
    const saved = JSON.parse(localStorage.getItem("omegaCart") || "[]");

    if (Array.isArray(saved)) {
        cart = saved
            .filter(item =>
                products.some(product => product.id === Number(item.id)) &&
                Number.isInteger(Number(item.quantity)) &&
                Number(item.quantity) > 0
            )
            .map(item => ({
                id: Number(item.id),
                quantity: Number(item.quantity),
                variant: String(item.variant || "Standard"),
                customText: String(item.customText || ""),
                photoName: String(item.photoName || "")
            }));
    }
} catch (error) {
    cart = [];
}

function saveCart() {
    try {
        localStorage.setItem("omegaCart", JSON.stringify(cart));
    } catch (error) {
        alert("Your cart could not be saved in this browser.");
        console.error(error);
    }

    renderCart();
}

/* ==========================================
   8. ADD CUSTOMIZED PRODUCT TO CART
========================================== */

if (addCustomizedProduct) {
    addCustomizedProduct.addEventListener("click", () => {
        if (!selectedProduct) return;

        const quantity = Number(customizeQuantity?.value || 1);

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            alert("Please choose a quantity between 1 and 20.");
            return;
        }

        const item = {
            id: selectedProduct.id,
            quantity,
            variant: customizeVariant?.value || "Standard",
            customText: customizeText?.value.trim() || "",
            photoName: selectedPhotoName
        };

        const key = createCartKey(item);

        const existing = cart.find(
            cartItem => createCartKey(cartItem) === key
        );

        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push(item);
        }

        saveCart();
        closeCustomizeModal();
        openCartPanel();
    });
}

/* ==========================================
   9. CART DISPLAY
========================================== */

function renderCart() {
    const cartCount = $(".cart-count");
    const cartItemsElement = byId("cartItems");
    const cartTotal = byId("cartTotal");

    const totalQuantity = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const totalPrice = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    if (cartCount) cartCount.textContent = totalQuantity;
    if (cartTotal) cartTotal.textContent = formatPrice(totalPrice);

    if (!cartItemsElement) return;

    if (cart.length === 0) {
        cartItemsElement.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    cartItemsElement.innerHTML = cart.map((item, index) => {
        const product = products.find(p => p.id === item.id);
        if (!product) return "";

        return `
            <div class="cart-item">
                <div class="cart-item-details">
                    <h4>${escapeHTML(product.name)}</h4>
                    <p>${formatPrice(product.price)} × ${item.quantity}</p>
                    <p>Variation: ${escapeHTML(item.variant)}</p>
                    ${item.customText ? `<p>Text: ${escapeHTML(item.customText)}</p>` : ""}
                    ${item.photoName ? `<p>Photo: ${escapeHTML(item.photoName)}</p>` : ""}
                </div>

                <div class="cart-controls">
                    <button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Decrease quantity">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-cart-action="increase" data-index="${index}" aria-label="Increase quantity">+</button>
                    <button type="button" data-cart-action="remove" data-index="${index}" aria-label="Remove item">✕</button>
                </div>
            </div>
        `;
    }).join("");
}

/* ==========================================
   10. CART QUANTITY CONTROLS
========================================== */

const cartItemsElement = byId("cartItems");

if (cartItemsElement) {
    cartItemsElement.addEventListener("click", event => {
        const button = event.target.closest("[data-cart-action]");
        if (!button) return;

        const index = Number(button.dataset.index);
        const item = cart[index];

        if (!item) return;

        const action = button.dataset.cartAction;

        if (action === "increase") item.quantity++;
        if (action === "decrease") item.quantity--;

        if (action === "remove" || item.quantity <= 0) {
            cart.splice(index, 1);
        }

        saveCart();
    });
}

/* ==========================================
   11. CART OPEN AND CLOSE
========================================== */

const cartPanel = byId("cartPanel");
const closeCartButton = byId("closeCart");
const cartLink = $('.header-icons a[aria-label="Cart"]');

function openCartPanel() {
    if (cartPanel) {
        cartPanel.classList.add("cart-open");
        document.body.classList.add("cart-visible");
    }
}

function closeCartPanel() {
    if (cartPanel) {
        cartPanel.classList.remove("cart-open");
        document.body.classList.remove("cart-visible");
    }
}

if (cartLink) {
    cartLink.addEventListener("click", event => {
        event.preventDefault();
        openCartPanel();
    });
}

if (closeCartButton) {
    closeCartButton.addEventListener("click", closeCartPanel);
}

/* ==========================================
   12. CUSTOMER CHECKOUT + WHATSAPP ORDER
========================================== */

const checkoutModal = byId("checkoutModal");
const checkoutBtn = byId("checkoutBtn");
const checkoutOverlay = byId("checkoutOverlay");
const closeCheckout = byId("closeCheckout");
const checkoutForm = byId("checkoutForm");

const deliveryMethod = byId("deliveryMethod");
const deliveryAddress = byId("deliveryAddress");
const deliveryAddressGroup = byId("deliveryAddressGroup");
const pickupMessage = byId("pickupMessage");

const customerName = byId("customerName");
const customerPhone = byId("customerPhone");
const orderNotes = byId("orderNotes");

const checkoutOrderItems = byId("checkoutOrderItems");
const checkoutProductTotal = byId("checkoutProductTotal");

function getCartTotal() {
    return cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
}

function renderCheckoutSummary() {
    if (!checkoutOrderItems || !checkoutProductTotal) return;

    checkoutOrderItems.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);

        if (!product) return "";

        return `
            <div class="checkout-order-line">
                <span>
                    ${escapeHTML(product.name)}
                    × ${item.quantity}
                    <br>
                    <small>${escapeHTML(item.variant)}</small>
                </span>
                <strong>${formatPrice(product.price * item.quantity)}</strong>
            </div>
        `;
    }).join("");

    checkoutProductTotal.textContent = formatPrice(getCartTotal());
}

function updateDeliveryFields() {
    if (!deliveryMethod) return;

    const isDelivery = deliveryMethod.value === "delivery";

    if (deliveryAddressGroup) {
        deliveryAddressGroup.hidden = !isDelivery;
    }

    if (deliveryAddress) {
        deliveryAddress.required = isDelivery;

        if (!isDelivery) {
            deliveryAddress.value = "";
        }
    }

    if (pickupMessage) {
        pickupMessage.hidden = isDelivery;
    }
}

function openCheckoutModal() {
    if (!checkoutModal) {
        alert("Checkout is not available. Please check your checkout HTML.");
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    renderCheckoutSummary();
    updateDeliveryFields();

    closeCartPanel();

    checkoutModal.classList.add("active");
    checkoutModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("checkout-open");
}

function closeCheckoutModal() {
    if (!checkoutModal) return;

    checkoutModal.classList.remove("active");
    checkoutModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("checkout-open");
}

if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openCheckoutModal);
}

if (closeCheckout) {
    closeCheckout.addEventListener("click", closeCheckoutModal);
}

if (checkoutOverlay) {
    checkoutOverlay.addEventListener("click", closeCheckoutModal);
}

if (deliveryMethod) {
    deliveryMethod.addEventListener("change", updateDeliveryFields);
}

/* SUBMIT ORDER TO WHATSAPP */


if (checkoutForm) {
    checkoutForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (cart.length === 0) {
            alert("Your cart is empty!");
            closeCheckoutModal();
            return;
        }

        if (!/^91\d{10}$/.test(WHATSAPP_NUMBER)) {
            alert("Please check the Omega Gift Point WhatsApp number in script.js.");
            return;
        }

        const name = customerName.value.trim();
        const phone = customerPhone.value.trim();
        const method = deliveryMethod.value;
        const address = deliveryAddress.value.trim();
        const notes = orderNotes.value.trim();

        if (!name || !/^[6-9]\d{9}$/.test(phone)) {
            alert("Please enter your name and a valid 10-digit Indian mobile number.");
            return;
        }

        if (method === "delivery" && !address) {
            alert("Please enter your complete delivery address.");
            deliveryAddress.focus();
            return;
        }

        // Open a blank tab during the user action to avoid popup blocking.
        const whatsappWindow = window.open("about:blank", "_blank");

        const checkoutBtn = byId("checkoutBtn");

        if (checkoutBtn) checkoutBtn.disabled = true;

        try {
            // Prepare cart information for secure database validation.
            const orderItems = cart.map(item => ({
                id: Number(item.id),
                quantity: Number(item.quantity),
                variant: item.variant || "",
                customText: item.customText || "",
                photoName: item.photoName || ""
            }));

            // Save order using the secure Supabase function.
            const { data: savedOrder, error: saveError } =
                await window.ogpSupabase.rpc("submit_ogp_order", {
                    p_customer_name: name,
                    p_customer_phone: phone,
                    p_delivery_method: method,
                    p_delivery_address: method === "delivery" ? address : "",
                    p_notes: notes,
                    p_items: orderItems
                });

            if (saveError) {
                console.error("Order saving failed:", saveError);
                throw new Error(saveError.message);
            }

            if (!savedOrder || !savedOrder.success) {
                throw new Error("Order could not be confirmed by the database.");
            }

            const orderId = savedOrder.order_number;

            let total = 0;

            let message =
                "NEW ORDER REQUEST - OMEGA GIFT POINT\n\n" +
                "Order ID: " + orderId + "\n\n" +
                "CUSTOMER DETAILS\n" +
                "Name: " + name + "\n" +
                "WhatsApp: +91 " + phone + "\n\n";

            message += "DELIVERY DETAILS\n";

            if (method === "delivery") {
                message += "Method: Home Delivery\n";
                message += "Address: " + address + "\n\n";
            } else {
                message += "Method: Shop Pickup\n";
                message += "Please confirm pickup location and collection time.\n\n";
            }

            message += "ORDER ITEMS\n";

            cart.forEach((item, index) => {
                const product = products.find(p => p.id === item.id);

                if (!product) return;

                const subtotal = product.price * item.quantity;
                total += subtotal;

                message += "\n" + (index + 1) + ". " + product.name + "\n";
                message += "Variant: " + item.variant + "\n";
                message += "Quantity: " + item.quantity + "\n";
                message += "Subtotal: " + formatPrice(subtotal) + "\n";

                if (item.customText) {
                    message += "Custom Text: " + item.customText + "\n";
                }

                if (item.photoName) {
                    message += "Selected Photo: " + item.photoName + "\n";
                }
            });

            // Use the database-calculated total.
            total = Number(savedOrder.product_total);

            message += "\nPRODUCT TOTAL: " + formatPrice(total) + "\n";
            message += "Delivery charges: To be confirmed\n";

            if (notes) {
                message += "\nAdditional Instructions: " + notes + "\n";
            }

            if (cart.some(item => item.photoName)) {
                message +=
                    "\nI will send my original customization photo(s) separately in this WhatsApp chat.\n";
            }

            message += "\nPlease confirm my order and the next steps. Thank you!";

            const whatsappURL =
                "https://wa.me/" +
                WHATSAPP_NUMBER +
                "?text=" +
                encodeURIComponent(message);

            if (whatsappWindow && !whatsappWindow.closed) {
                whatsappWindow.location.href = whatsappURL;
            } else {
                window.location.href = whatsappURL;
            }

            console.log("Order saved successfully:", orderId);

            closeCheckoutModal();

            // Keep cart saved until the order is confirmed.

        } catch (error) {
            console.error("Checkout error:", error);

            if (whatsappWindow && !whatsappWindow.closed) {
                whatsappWindow.close();
            }

            alert(
                "We couldn't save your order. Please try again.\n\n" +
                error.message
            );

        } finally {
            if (checkoutBtn) checkoutBtn.disabled = false;
        }
    });
}



/* ==========================================
   13. NEWSLETTER DEMO
========================================== */

const newsletterForm = byId("newsletterForm");

if (newsletterForm) {
    newsletterForm.addEventListener("submit", event => {
        event.preventDefault();

        alert("Thank you for your interest in Omega Gift Point!");
        newsletterForm.reset();
    });
}

/* ==========================================
   14. IMAGE FALLBACK
========================================== */

document.addEventListener("error", event => {
    if (event.target.tagName === "IMG") {
        event.target.style.background = "#F5E4DA";
        event.target.style.objectFit = "contain";
        event.target.alt = "Image coming soon";
    }
}, true);

/* ==========================================
   15. ACTIVE NAVIGATION
========================================== */

const navLinks = document.querySelectorAll(".navigation a");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        navLinks.forEach(item => item.classList.remove("active"));
        link.classList.add("active");
    });
});

/* ==========================================
   16. INITIALIZE
========================================== */

updateCategory("all");
renderCart();

// Load live products from Supabase
loadProductsFromSupabase();

console.log("OMEGA GIFT POINT READY!");


const supabaseClient = window.ogpSupabase;

const $ = (id) => document.getElementById(id);

let productList = [];
let currentImageUrls = [];

function showPageMessage(message, type = "") {
    $("pageMessage").textContent = message;
    $("pageMessage").className = `message ${type}`;
}

function showFormMessage(message, type = "") {
    $("formMessage").textContent = message;
    $("formMessage").className = `message ${type}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatPrice(value) {
    return "₹" + Number(value).toLocaleString("en-IN");
}

async function protectPage() {
    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.replace("login.html");
        return false;
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
        return false;
    }

    return true;
}

async function loadProducts() {
    showPageMessage("Loading products...");

    const { data, error } = await supabaseClient
        .from("products")
        .select("id, name, category, price, description, image_urls, variants, tag, is_active, sort_order")
        .order("sort_order", { ascending: true });

    if (error) {
        showPageMessage("Could not load products: " + error.message, "error");
        return;
    }

    productList = data || [];
    renderProducts();
    showPageMessage(`${productList.length} products loaded.`, "success");
}

function renderProducts() {
    const search = $("searchProducts").value.trim().toLowerCase();
    const status = $("statusFilter").value;

    const filtered = productList.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(search) ||
            product.category.toLowerCase().includes(search);

        const matchesStatus =
            status === "all" ||
            (status === "active" && product.is_active) ||
            (status === "inactive" && !product.is_active);

        return matchesSearch && matchesStatus;
    });

    const tbody = $("productsTableBody");

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty">No products found.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map((product) => {
        const image = product.image_urls?.[0] || "";

        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <img
                            src="${escapeHTML(image)}"
                            alt=""
                            onerror="this.style.visibility='hidden'"
                        >
                        <strong>${escapeHTML(product.name)}</strong>
                    </div>
                </td>

                <td>${escapeHTML(product.category)}</td>
                <td>${formatPrice(product.price)}</td>

                <td>
                    <span class="status ${product.is_active ? "active" : "inactive"}">
                        ${product.is_active ? "Active" : "Inactive"}
                    </span>
                </td>

                <td>
                    <div class="row-actions">
                        <button data-action="edit" data-id="${product.id}">
                            Edit
                        </button>

                        <button data-action="toggle" data-id="${product.id}">
                            ${product.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button class="delete-button" data-action="delete" data-id="${product.id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function openProductModal(product = null) {
    $("productForm").reset();
    $("formMessage").textContent = "";
    $("productId").value = product ? product.id : "";
    currentImageUrls = product?.image_urls || [];

    $("modalTitle").textContent = product ? "Edit Product" : "Add Product";
    $("saveProductButton").textContent = product ? "Update Product" : "Save Product";

    $("productName").value = product?.name || "";
    $("productCategory").value = product?.category || "";
    $("productPrice").value = product?.price ?? "";
    $("productDescription").value = product?.description || "";
    $("productVariants").value = (product?.variants || []).join(", ");
    $("productTag").value = product?.tag || "";
    $("productActive").checked = product ? Boolean(product.is_active) : true;

    const imageArea = $("currentImageArea");
    const currentImage = $("currentImage");

    if (currentImageUrls.length > 0) {
        currentImage.src = currentImageUrls[0];
        imageArea.hidden = false;
    } else {
        currentImage.src = "";
        imageArea.hidden = true;
    }

    $("productModal").classList.add("show");
}

function closeProductModal() {
    $("productModal").classList.remove("show");
}

async function uploadProductImage(file) {
    if (!file) return null;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Please select a JPG, PNG or WebP image.");
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5 MB.");
    }

    const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
            ? "webp"
            : "jpg";

    const filePath = `products/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseClient.storage
        .from("product-images")
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) throw error;

    const { data } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(filePath);

    return data.publicUrl;
}

async function saveProduct(event) {
    event.preventDefault();

    const saveButton = $("saveProductButton");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const id = $("productId").value;

        const name = $("productName").value.trim();
        const category = $("productCategory").value;
        const price = Number($("productPrice").value);
        const description = $("productDescription").value.trim();
        const variants = $("productVariants").value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
        const tag = $("productTag").value.trim();
        const is_active = $("productActive").checked;
        const file = $("productImage").files[0];

        if (!name || !category || !Number.isFinite(price) || price <= 0) {
            throw new Error("Please enter a valid name, category and price.");
        }

        let imageUrls = [...currentImageUrls];

        if (file) {
            showFormMessage("Uploading image...");
            const uploadedUrl = await uploadProductImage(file);
            imageUrls = [uploadedUrl];
        }

        const productData = {
            name,
            category,
            price,
            description,
            variants,
            tag,
            is_active,
            image_urls: imageUrls
        };

        if (id) {
            const { error } = await supabaseClient
                .from("products")
                .update(productData)
                .eq("id", Number(id));

            if (error) throw error;

            showFormMessage("Product updated successfully!", "success");
        } else {
            const nextSortOrder = productList.reduce(
                (max, item) => Math.max(max, Number(item.sort_order) || 0),
                0
            ) + 1;

            const { error } = await supabaseClient
                .from("products")
                .insert({
                    ...productData,
                    sort_order: nextSortOrder
                });

            if (error) throw error;

            showFormMessage("Product added successfully!", "success");
        }

        await loadProducts();

        setTimeout(closeProductModal, 500);

    } catch (error) {
        showFormMessage(error.message || "Something went wrong.", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = $("productId").value
            ? "Update Product"
            : "Save Product";
    }
}

async function toggleProduct(id) {
    const product = productList.find(item => String(item.id) === String(id));
    if (!product) return;

    const nextStatus = !product.is_active;
    const action = nextStatus ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${action} "${product.name}"?`)) {
        return;
    }

    const { error } = await supabaseClient
        .from("products")
        .update({ is_active: nextStatus })
        .eq("id", product.id);

    if (error) {
        showPageMessage("Could not update status: " + error.message, "error");
        return;
    }

    showPageMessage("Product status updated.", "success");
    await loadProducts();
}

async function deleteProduct(id) {
    const product = productList.find(item => String(item.id) === String(id));
    if (!product) return;

    if (!confirm(`Delete "${product.name}" permanently? This cannot be undone.`)) {
        return;
    }

    const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", product.id);

    if (error) {
        showPageMessage("Could not delete product: " + error.message, "error");
        return;
    }

    showPageMessage("Product deleted successfully.", "success");
    await loadProducts();
}

function setupEvents() {
    $("addProductButton").addEventListener("click", () => {
        openProductModal();
    });

    $("closeModal").addEventListener("click", closeProductModal);
    $("cancelButton").addEventListener("click", closeProductModal);

    $("productModal").addEventListener("click", (event) => {
        if (event.target === $("productModal")) {
            closeProductModal();
        }
    });

    $("productForm").addEventListener("submit", saveProduct);

    $("searchProducts").addEventListener("input", renderProducts);
    $("statusFilter").addEventListener("change", renderProducts);

    $("productsTableBody").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const { action, id } = button.dataset;

        if (action === "edit") {
            const product = productList.find(item => String(item.id) === String(id));
            if (product) openProductModal(product);
        }

        if (action === "toggle") toggleProduct(id);
        if (action === "delete") deleteProduct(id);
    });

    $("logoutButton").addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            showPageMessage(error.message, "error");
            return;
        }

        window.location.replace("login.html");
    });
}

async function initializeProductManagement() {
    const authorized = await protectPage();
    if (!authorized) return;

    setupEvents();
    await loadProducts();
}

initializeProductManagement();

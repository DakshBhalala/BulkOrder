/**
 * TechDirect Demo Supplier Store — Client-side logic
 * Simulates a real supplier e-commerce site for Playwright automation.
 */

const PRODUCTS = [
    { id: "TD-001", name: "Apple iPhone 15 Midnight 128GB", price: 799.99, sku: "APL-IP15-BK-128", inStock: true },
    { id: "TD-002", name: "Apple iPhone 15 Pro Max 256GB", price: 1199.99, sku: "APL-IP15PM-256", inStock: true },
    { id: "TD-003", name: "Apple AirPods Pro Gen 2", price: 249.99, sku: "APL-APP2", inStock: true },
    { id: "TD-004", name: "Samsung Galaxy S24 Ultra 256GB", price: 1299.99, sku: "SAM-GS24U-256", inStock: true },
    { id: "TD-005", name: "Samsung Galaxy Tab S9 128GB", price: 849.99, sku: "SAM-GTS9-128", inStock: true },
    { id: "TD-006", name: "Google Pixel 9 Pro 128GB", price: 999.99, sku: "GGL-PX9P-128", inStock: true },
    { id: "TD-007", name: "Sony WH-1000XM5 Headphones", price: 349.99, sku: "SNY-WH1KXM5", inStock: true },
    { id: "TD-008", name: "Apple MacBook Air M3 256GB", price: 1099.99, sku: "APL-MBA-M3-256", inStock: true },
    { id: "TD-009", name: "Apple iPad Pro 11 M4 256GB", price: 1099.99, sku: "APL-IPP11-M4", inStock: true },
    { id: "TD-010", name: "Apple Watch Ultra 2", price: 799.99, sku: "APL-AWU2", inStock: true },
    { id: "TD-011", name: "Samsung Galaxy Buds3 Pro", price: 249.99, sku: "SAM-GB3P", inStock: true },
    { id: "TD-012", name: "Dell XPS 15 Laptop", price: 1499.99, sku: "DEL-XPS15", inStock: true },
    { id: "TD-013", name: "Apple AirTag 4 Pack", price: 99.99, sku: "APL-AT4P", inStock: true },
    { id: "TD-014", name: "Nintendo Switch OLED", price: 349.99, sku: "NIN-SWOLED", inStock: true },
    { id: "TD-015", name: "Bose QuietComfort Ultra Earbuds", price: 299.99, sku: "BOSE-QCUE", inStock: true },
    { id: "TD-016", name: "Sony PlayStation 5 Slim", price: 449.99, sku: "SNY-PS5S", inStock: true },
    { id: "TD-017", name: "Microsoft Surface Pro 10", price: 1199.99, sku: "MS-SP10", inStock: true },
    { id: "TD-018", name: "Logitech MX Master 3S Mouse", price: 99.99, sku: "LGT-MXM3S", inStock: true },
    { id: "TD-019", name: "Apple Magic Keyboard", price: 199.99, sku: "APL-MK", inStock: true },
    { id: "TD-020", name: "Samsung Galaxy Watch 6 Classic", price: 399.99, sku: "SAM-GW6C", inStock: true },
];

let cart = [];

// ─── Navigation ─────────────────────────────────────────────────

function showPage(page) {
    document.querySelectorAll("main").forEach(m => m.style.display = "none");
    document.getElementById(`${page}-page`).style.display = "block";
    document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
}

document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", (e) => {
        e.preventDefault();
        const page = a.dataset.page;
        showPage(page);
        if (page === "cart") renderCart();
    });
});

// ─── Products ───────────────────────────────────────────────────

function renderProducts(products) {
    const grid = document.getElementById("products-grid");
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted);">No products found.</p>';
        return;
    }

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.productId = p.id;
        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="price">$${p.price.toFixed(2)}</div>
            <div class="sku">SKU: ${p.sku}</div>
            <div class="stock">✓ In Stock</div>
            <button class="add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
        `;
        grid.appendChild(card);
    });

    // Bind add-to-cart
    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const product = PRODUCTS.find(p => p.id === btn.dataset.id);
            if (product) addToCart(product);
        });
    });
}

// Show all products initially
renderProducts(PRODUCTS);

// ─── Search ─────────────────────────────────────────────────────

function searchProducts(query) {
    const q = query.toLowerCase().trim();
    if (!q) return PRODUCTS;
    return PRODUCTS.filter(p => p.name.toLowerCase().includes(q));
}

document.getElementById("search-btn").addEventListener("click", () => {
    const query = document.getElementById("search-input").value;
    renderProducts(searchProducts(query));
});

document.getElementById("search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        renderProducts(searchProducts(e.target.value));
    }
});

// ─── Cart ───────────────────────────────────────────────────────

function addToCart(product) {
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    document.getElementById("cart-count").textContent = cart.reduce((s, c) => s + c.qty, 0);
}

function renderCart() {
    const items = document.getElementById("cart-items");
    const actions = document.getElementById("cart-actions");
    const empty = document.getElementById("cart-empty");

    items.innerHTML = "";

    if (cart.length === 0) {
        empty.style.display = "block";
        actions.style.display = "none";
        return;
    }

    empty.style.display = "none";
    actions.style.display = "flex";

    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        const el = document.createElement("div");
        el.className = "cart-item";
        el.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <span class="sku">Qty: ${item.qty}</span>
            </div>
            <div class="price">$${(item.price * item.qty).toFixed(2)}</div>
        `;
        items.appendChild(el);
    });

    document.getElementById("cart-total").textContent = total.toFixed(2);
}

// ─── Checkout ───────────────────────────────────────────────────

document.getElementById("checkout-btn").addEventListener("click", () => {
    if (cart.length === 0) return;
    // Set qty from cart total
    document.getElementById("order-qty").value = cart.reduce((s, c) => s + c.qty, 0);
    showPage("checkout");
});

document.getElementById("checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();

    // Generate order ID and tracking
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    const tracking = "TRK-" + Math.floor(100001 + Math.random() * 899999);
    const days = Math.floor(2 + Math.random() * 8);

    document.getElementById("conf-order-id").textContent = orderId;
    document.getElementById("conf-tracking").textContent = tracking;
    document.getElementById("conf-delivery").textContent = `${days} business days`;

    // Clear cart
    cart = [];
    document.getElementById("cart-count").textContent = "0";

    showPage("confirmation");
});

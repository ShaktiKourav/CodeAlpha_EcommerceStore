
const $ = (selector) => document.querySelector(selector);

const productGrid = $("#productGrid");
const productMessage = $("#productMessage");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");
const cartCount = $("#cartCount");
const cartItems = $("#cartItems");
const cartTotal = $("#cartTotal");
const authModal = $("#authModal");
const authForm = $("#authForm");

let products = [];
let cart = JSON.parse(localStorage.getItem("shopease-cart") || "[]");
let token = localStorage.getItem("shopease-token") || "";
let currentUser = JSON.parse(localStorage.getItem("shopease-user") || "null");
let authMode = "login";
let detailProduct = null;
let toastTimer;

const iconFallbacks = {
  laptop: "💻",
  "wireless headphones": "🎧",
  "smart watch": "⌚",
  "mechanical keyboard": "⌨️",
  "bluetooth speaker": "🔊",
  "phone stand": "📱"
};

function money(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function safeText(value) {
  return String(value ?? "");
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    if (response.status === 401 && token) clearAuth(false);
    throw new Error(payload.message || "Something went wrong. Please try again.");
  }

  return payload;
}

async function loadProducts() {
  productMessage.textContent = "Loading products…";

  try {
    products = await api("/api/products");
    populateCategories();
    displayProducts();
    renderCart();
    productMessage.textContent = `${products.length} products available`;
  } catch (error) {
    productMessage.textContent = error.message;
  }
}

function populateCategories() {
  const selected = categoryFilter.value;
  const categories = [...new Set(products.map((product) => product.category))].sort();

  categoryFilter.innerHTML = '<option value="">All categories</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  categoryFilter.value = categories.includes(selected) ? selected : "";
}

function filteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value.toLowerCase();

  return products.filter((product) => {
    const matchesQuery =
      `${product.name} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(query);

    return matchesQuery &&
      (!category || product.category.toLowerCase() === category);
  });
}

// Check whether this product is already in the cart.
function getCartItem(productId) {
  return cart.find((item) => Number(item.id) === Number(productId));
}

function displayProducts() {
  productGrid.replaceChildren();
  const items = filteredProducts();

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No products match your search. Try another keyword.";
    productGrid.appendChild(empty);
    return;
  }

  items.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const art = document.createElement("div");
    art.className = `product-art tone-${index % 6}`;
    art.tabIndex = 0;
    art.setAttribute("role", "button");
    art.setAttribute("aria-label", `View details for ${product.name}`);

    const emoji = document.createElement("span");
    emoji.className = "product-emoji";
    emoji.textContent =
      product.emoji || iconFallbacks[product.name.toLowerCase()] || "🛍️";

    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = product.stock > 0 ? "IN STOCK" : "SOLD OUT";

    art.append(emoji, tag);
    art.addEventListener("click", () => openProduct(product));

    art.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProduct(product);
      }
    });

    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category;

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;
    name.tabIndex = 0;
    name.addEventListener("click", () => openProduct(product));

    name.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openProduct(product);
    });

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description;

    const bottom = document.createElement("div");
    bottom.className = "product-bottom";

    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = money(product.price);

    const add = document.createElement("button");
    add.className = "add-button";

    // Display the current cart status on every product card.
    updateAddButton(add, product);

    add.addEventListener("click", () => {
      const existing = getCartItem(product.id);

      if (existing) {
        showToast(`${product.name} is already in your cart.`);
        return;
      }

      addToCart(product.id);
    });

    bottom.append(price, add);
    info.append(category, name, description, bottom);
    card.append(art, info);
    productGrid.appendChild(card);
  });
}

// Update the button label based on cart contents.
function updateAddButton(button, product) {
  const item = getCartItem(product.id);

  if (product.stock <= 0) {
    button.textContent = "Out of stock";
    button.disabled = true;
    button.classList.remove("added-to-cart");
    button.setAttribute("aria-label", `${product.name} is out of stock`);
  } else if (item) {
    button.textContent = `✓ Added to Cart (${item.quantity})`;
    button.disabled = false;
    button.classList.add("added-to-cart");
    button.setAttribute(
      "aria-label",
      `${product.name} is in your cart, quantity ${item.quantity}`
    );
  } else {
    button.textContent = "＋ Add to cart";
    button.disabled = false;
    button.classList.remove("added-to-cart");
    button.setAttribute("aria-label", `Add ${product.name} to cart`);
  }
}

function refreshCartButtons() {
  document.querySelectorAll(".add-button").forEach((button) => {
    const card = button.closest(".product-card");
    if (!card) return;

    const name = card.querySelector(".product-name")?.textContent;
    const product = products.find((item) => item.name === name);

    if (product) updateAddButton(button, product);
  });

  // Keep the product details modal button in sync as well.
  if (detailProduct && !$("#productModal").hidden) {
    const detailButton = $("#detailAdd");
    const item = getCartItem(detailProduct.id);

    if (detailProduct.stock <= 0) {
      detailButton.textContent = "Out of stock";
      detailButton.disabled = true;
    } else if (item) {
      detailButton.textContent = `✓ Added to Cart (${item.quantity})`;
      detailButton.disabled = false;
    } else {
      detailButton.textContent = "＋ Add to cart";
      detailButton.disabled = false;
    }
  }
}

function saveCart() {
  localStorage.setItem("shopease-cart", JSON.stringify(cart));
}

function addToCart(productId) {
  const product = products.find(
    (item) => Number(item.id) === Number(productId)
  );

  if (!product) return;

  const existing = getCartItem(productId);

  // Do not add the same product repeatedly from its product card.
  if (existing) {
    showToast(`${product.name} is already in your cart.`);
    return;
  }

  if (product.stock < 1) {
    showToast("This product is out of stock.");
    return;
  }

  cart.push({ id: product.id, quantity: 1 });

  saveCart();
  renderCart();
  refreshCartButtons();
  showToast(`${product.name} added to your cart.`);
}

function updateQuantity(productId, change) {
  const item = getCartItem(productId);
  const product = products.find(
    (entry) => Number(entry.id) === Number(productId)
  );

  if (!item || !product) return;

  const next = item.quantity + change;

  if (next < 1) {
    cart = cart.filter(
      (entry) => Number(entry.id) !== Number(productId)
    );
  } else if (next > product.stock) {
    showToast("No more stock is available for this product.");
    return;
  } else {
    item.quantity = next;
  }

  saveCart();
  renderCart();
  refreshCartButtons();
}

function renderCart() {
  cart = cart.filter((item) =>
    products.some((product) => Number(product.id) === Number(item.id))
  );

  saveCart();

  const totalQuantity = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  let total = 0;
  cartCount.textContent = totalQuantity;
  cartItems.replaceChildren();

  if (!cart.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your cart is empty. Add something you like!";
    cartItems.appendChild(empty);
  } else {
    cart.forEach((item) => {
      const product = products.find(
        (entry) => Number(entry.id) === Number(item.id)
      );

      if (!product) return;

      total += product.price * item.quantity;

      const row = document.createElement("div");
      row.className = "cart-row";

      const name = document.createElement("span");
      name.className = "cart-row-name";
      name.textContent = product.name;

      const price = document.createElement("span");
      price.className = "cart-row-price";
      price.textContent = money(product.price * item.quantity);

      const controls = document.createElement("div");
      controls.className = "quantity-control";

      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.setAttribute("aria-label", `Remove one ${product.name}`);
      minus.addEventListener("click", () =>
        updateQuantity(product.id, -1)
      );

      const quantity = document.createElement("span");
      quantity.textContent = item.quantity;

      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.setAttribute("aria-label", `Add one ${product.name}`);
      plus.disabled = item.quantity >= product.stock;
      plus.addEventListener("click", () =>
        updateQuantity(product.id, 1)
      );

      controls.append(minus, quantity, plus);

      const remove = document.createElement("button");
      remove.className = "remove-button";
      remove.textContent = "Remove";

      remove.addEventListener("click", () => {
        cart = cart.filter(
          (entry) => Number(entry.id) !== Number(product.id)
        );

        saveCart();
        renderCart();
        refreshCartButtons();
        showToast(`${product.name} removed from your cart.`);
      });

      row.append(name, price, controls, remove);
      cartItems.appendChild(row);
    });
  }

  cartTotal.textContent = money(total);
  $("#checkoutButton").disabled = cart.length === 0;

  refreshCartButtons();
}

function openProduct(product) {
  detailProduct = product;

  $("#detailIcon").textContent = product.emoji || "🛍️";
  $("#detailCategory").textContent = product.category;
  $("#detailName").textContent = product.name;
  $("#detailDescription").textContent = product.description;
  $("#detailPrice").textContent = money(product.price);

  const item = getCartItem(product.id);
  const button = $("#detailAdd");

  if (product.stock <= 0) {
    button.textContent = "Out of stock";
    button.disabled = true;
  } else if (item) {
    button.textContent = `✓ Added to Cart (${item.quantity})`;
    button.disabled = false;
  } else {
    button.textContent = "＋ Add to cart";
    button.disabled = false;
  }

  $("#productModal").hidden = false;
}

function setAuthMode(mode) {
  authMode = mode;

  const registering = mode === "register";

  $("#authTitle").textContent = registering
    ? "Create your account"
    : "Welcome back";

  $("#authIntro").textContent = registering
    ? "Create an account to place and track demo orders."
    : "Log in to continue shopping.";

  $("#nameField").hidden = !registering;
  $("#authName").required = registering;

  $("#authPassword").autocomplete = registering
    ? "new-password"
    : "current-password";

  $("#authSubmit").textContent = registering
    ? "Create account"
    : "Log in";

  $("#loginTab").classList.toggle("active", !registering);
  $("#registerTab").classList.toggle("active", registering);
  $("#authMessage").textContent = "";
}

function openAuth(mode = "login") {
  setAuthMode(mode);
  authForm.reset();
  authModal.hidden = false;
}

function clearAuth(showMessage = true) {
  token = "";
  currentUser = null;

  localStorage.removeItem("shopease-token");
  localStorage.removeItem("shopease-user");

  updateHeader();

  if (showMessage) showToast("You have been logged out.");
}

function updateHeader() {
  $("#authButton").textContent = currentUser
    ? `Hi, ${currentUser.name.split(" ")[0]}`
    : "Log in";

  $("#ordersButton").hidden = !currentUser;
}

async function submitAuth(event) {
  event.preventDefault();

  const message = $("#authMessage");
  const submit = $("#authSubmit");

  message.textContent = "";
  submit.disabled = true;

  try {
    const payload = {
      email: $("#authEmail").value.trim(),
      password: $("#authPassword").value
    };

    if (authMode === "register") {
      payload.name = $("#authName").value.trim();
    }

    const result = await api(
      `/api/auth/${authMode === "register" ? "register" : "login"}`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    token = result.token;
    currentUser = result.user;

    localStorage.setItem("shopease-token", token);
    localStorage.setItem("shopease-user", JSON.stringify(currentUser));

    authModal.hidden = true;
    updateHeader();
    showToast(result.message);

    if (cart.length) {
      showToast("You can now place your demo order.");
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function checkout() {
  if (!cart.length) {
    return showToast("Your cart is empty.");
  }

  if (!currentUser || !token) {
    openAuth("login");
    $("#authMessage").textContent =
      "Log in or create an account before checkout.";
    return;
  }

  const button = $("#checkoutButton");
  button.disabled = true;
  button.textContent = "Placing order…";

  try {
    const result = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items: cart })
    });

    cart = [];
    saveCart();

    await loadProducts();
    renderCart();

    showToast(`Order placed! Order ID: ${result.order.id}`);

    await loadOrders();

    $("#ordersSection").hidden = false;
    $("#ordersSection").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showToast(error.message);
    await loadProducts();
  } finally {
    button.disabled = cart.length === 0;
    button.innerHTML =
      'Place demo order <span aria-hidden="true">→</span>';
  }
}

async function loadOrders() {
  if (!currentUser) return;

  try {
    const orders = await api("/api/orders");
    const list = $("#ordersList");

    list.replaceChildren();

    if (!orders.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "You have not placed any orders yet.";
      list.appendChild(empty);
      return;
    }

    [...orders].reverse().forEach((order) => {
      const card = document.createElement("article");
      card.className = "order-card";

      const header = document.createElement("header");

      const id = document.createElement("span");
      id.textContent = order.id;

      const total = document.createElement("strong");
      total.textContent = money(order.total);

      header.append(id, total);

      const detail = document.createElement("p");
      detail.textContent =
        `${new Date(order.createdAt).toLocaleString()} · ` +
        order.items.map((item) =>
          `${item.name} × ${item.quantity}`
        ).join(", ");

      const status = document.createElement("p");
      status.textContent = `Status: ${order.status}`;

      card.append(header, detail, status);
      list.appendChild(card);
    });
  } catch (error) {
    showToast(error.message);
  }
}

$("#authButton").addEventListener("click", () =>
  currentUser ? clearAuth() : openAuth("login")
);

$("#loginTab").addEventListener("click", () => setAuthMode("login"));
$("#registerTab").addEventListener("click", () => setAuthMode("register"));

authForm.addEventListener("submit", submitAuth);
$("#checkoutButton").addEventListener("click", checkout);

$("#cartButton").addEventListener("click", () =>
  $("#cartSection").scrollIntoView({ behavior: "smooth" })
);

$("#ordersButton").addEventListener("click", async () => {
  $("#ordersSection").hidden = false;
  await loadOrders();
  $("#ordersSection").scrollIntoView({ behavior: "smooth" });
});

$("#detailAdd").addEventListener("click", () => {
  if (detailProduct) {
    const item = getCartItem(detailProduct.id);

    if (item) {
      showToast(`${detailProduct.name} is already in your cart.`);
    } else {
      addToCart(detailProduct.id);
    }
  }

  $("#productModal").hidden = true;
});

searchInput.addEventListener("input", displayProducts);
categoryFilter.addEventListener("change", displayProducts);

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    $(`#${button.dataset.close}`).hidden = true;
  });
});

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.hidden = true;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop").forEach((modal) => {
      modal.hidden = true;
    });
  }
});

updateHeader();
loadProducts();

const byId = (id) => document.getElementById(id);

const responseOutput = byId("response-output");
const productsContainer = byId("products");

function showResponse(value) {
    responseOutput.textContent =
        typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2);
}

function showError(error) {
    console.error(error);
    showResponse(`ERROR: ${error.message}`);
}

function basicAuthHeaders() {
    const username = byId("api-username").value.trim();
    const password = byId("api-password").value;

    if (!username && !password) {
        return {};
    }

    return {
        Authorization: `Basic ${btoa(`${username}:${password}`)}`
    };
}

async function apiRequest(path, options = {}) {
    const response = await fetch(path, options);
    const text = await response.text();

    let body = text;

    if (text) {
        try {
            body = JSON.parse(text);
        } catch (_) {
            body = text;
        }
    }

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}\n` +
            `${typeof body === "string"
                ? body
                : JSON.stringify(body, null, 2)}`
        );
    }

    return body;
}

function productArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.products)) {
        return data.products;
    }

    if (Array.isArray(data?.content)) {
        return data.content;
    }

    return data ? [data] : [];
}

function renderProducts(data) {
    const products = productArray(data);
    productsContainer.innerHTML = "";

    if (products.length === 0) {
        productsContainer.innerHTML =
            "<p>No products were returned by the API.</p>";
        return;
    }

    products.forEach((product, index) => {
        const card = document.createElement("article");
        card.className = "product-card";

        const title =
            product.name ??
            product.productName ??
            product.title ??
            `Product ${index + 1}`;

        const heading = document.createElement("h3");
        heading.textContent = String(title);
        card.appendChild(heading);

        const details = document.createElement("dl");

        Object.entries(product).forEach(([key, value]) => {
            const term = document.createElement("dt");
            term.textContent = key;

            const description = document.createElement("dd");
            description.textContent =
                typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);

            details.appendChild(term);
            details.appendChild(description);
        });

        card.appendChild(details);
        productsContainer.appendChild(card);
    });
}

async function loadProducts(category = "") {
    try {
        showResponse("Loading products...");

        const path = category
            ? `/api/products/v1/productList/${encodeURIComponent(category)}`
            : "/api/products/v1/productList";

        const data = await apiRequest(path);
        renderProducts(data);
        showResponse(data);
    } catch (error) {
        showError(error);
    }
}

byId("load-products-button").addEventListener(
    "click",
    () => loadProducts()
);

byId("filter-products-button").addEventListener(
    "click",
    () => {
        const category = byId("category").value.trim();

        if (!category) {
            showResponse("Enter a category first.");
            return;
        }

        loadProducts(category);
    }
);

byId("clear-filter-button").addEventListener(
    "click",
    () => {
        byId("category").value = "";
        loadProducts();
    }
);

byId("add-product-button").addEventListener(
    "click",
    async () => {
        try {
            const product = JSON.parse(
                byId("product-json").value
            );

            const data = await apiRequest(
                "/api/products/v1/addProduct",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(product)
                }
            );

            showResponse(data);
            await loadProducts();
        } catch (error) {
            showError(error);
        }
    }
);

byId("update-product-button").addEventListener(
    "click",
    async () => {
        try {
            const product = JSON.parse(
                byId("product-json").value
            );

            const data = await apiRequest(
                "/api/products/v1/productUpdate",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(product)
                }
            );

            showResponse(data);
            await loadProducts();
        } catch (error) {
            showError(error);
        }
    }
);

byId("delete-product-button").addEventListener(
    "click",
    async () => {
        try {
            const id = byId("delete-product-id").value.trim();

            if (!id) {
                throw new Error("Enter a Product ID.");
            }

            const data = await apiRequest(
                `/api/products/v1/product/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            showResponse(data);
            await loadProducts();
        } catch (error) {
            showError(error);
        }
    }
);

byId("find-user-button").addEventListener(
    "click",
    async () => {
        try {
            const email = byId("find-email").value.trim();

            if (!email) {
                throw new Error("Enter a user email.");
            }

            const data = await apiRequest(
                `/api/users/user/find?email=${encodeURIComponent(email)}`,
                {
                    headers: {
                        ...basicAuthHeaders()
                    }
                }
            );

            showResponse(data);
        } catch (error) {
            showError(error);
        }
    }
);

byId("register-user-button").addEventListener(
    "click",
    async () => {
        try {
            const user = JSON.parse(
                byId("user-json").value
            );

            const data = await apiRequest(
                "/api/users/user/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...basicAuthHeaders()
                    },
                    body: JSON.stringify(user)
                }
            );

            showResponse(data);
        } catch (error) {
            showError(error);
        }
    }
);

loadProducts();
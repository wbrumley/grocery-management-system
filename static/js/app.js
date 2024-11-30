const API_URL = "http://127.0.0.1:5000/api";

// Utility: Fetch JSON from an API endpoint
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    console.error(`Error: ${response.statusText}`);
    return null;
  }
  return response.json();
}

// 1. View Products
async function fetchProducts() {
  const response = await fetch('http://127.0.0.1:5000/api/products');
  const products = await response.json();

  const productList = document.getElementById('product-list');
  productList.innerHTML = products.map(product => `
    <div class="product">
      <h4>${product.name} ($${product.price})</h4>
      <p>${product.description}</p>
      <label for="quantity-${product.id}">Quantity:</label>
      <input type="number" id="quantity-${product.id}" value="1" min="1">
      <button onclick="addToCart(${product.id})">Add to Cart</button>
    </div>
  `).join('');
}

async function fetchOrders() {
  try {
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const orders = await response.json();
    displayOrders(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    document.getElementById('order-list').innerHTML = '<p>Error loading orders.</p>';
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return; // Exit if the user cancels the confirmation
  }

  try {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Product deleted successfully');
    fetchProducts(); // Refresh the product list after deletion
  } catch (error) {
    console.error('Error deleting product:', error);
  }
}

// 2. View Inventory
async function fetchInventory() {
  const response = await fetch('http://127.0.0.1:5000/api/inventory');
  const inventory = await response.json();

  console.log('Fetched inventory:', inventory); // Debugging log

  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = inventory.map(item => `
    <div class="inventory-item">
      <p><strong>${item.name}</strong> - $${item.price}</p>
      <p>Stock: 
        <input type="number" id="stock-${item.product_id}" value="${item.stock_level}" min="0">
        <button onclick="updateStock(${item.product_id})">Update Stock</button>
      </p>
    </div>
  `).join('');
}

// 3. Edit inventory
async function updateStock(productId) {
  console.log('Updating stock for product ID:', productId); // Debugging log

  if (!productId) {
    console.error('Product ID is undefined');
    return;
  }

  const stockInput = document.getElementById(`stock-${productId}`);
  if (!stockInput) {
    console.error('Stock input element not found for product ID:', productId);
    return;
  }

  const newStock = parseInt(stockInput.value, 10);
  console.log('New stock value:', newStock); // Debugging log

  if (isNaN(newStock) || newStock < 0) {
    alert('Invalid stock level');
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/inventory/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_level: newStock }),
    });

    console.log('Response status:', response.status); // Debugging log

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Stock updated successfully');
    fetchInventory(); // Refresh the inventory list
  } catch (error) {
    console.error('Error updating stock:', error);
  }
}

async function addToCart(productId) {
  const customerId = document.getElementById('customerId').value; // Get selected customer ID
  const quantityInput = document.getElementById(`quantity-${productId}`); // Get quantity input
  const quantity = parseInt(quantityInput.value, 10); // Convert to integer

  if (!customerId) {
    alert('Please select a customer before adding to cart.');
    return;
  }

  if (!quantity || quantity <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert(`Added ${quantity} of product to cart successfully`);
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
}

async function deleteCartItem(customerId, productId) {
  if (!confirm('Are you sure you want to delete this item from the cart?')) {
    return; // Exit if the user cancels
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/cart/${customerId}/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Item deleted successfully');
    fetchCart(customerId); // Refresh the cart
  } catch (error) {
    console.error('Error deleting cart item:', error);
  }
}

// Fetch and populate the customer dropdown
async function fetchCustomers() {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/customers');
    const customers = await response.json();

    const customerDropdown = document.getElementById('customerId');
    const customerList = document.getElementById('customer-list');

    if (!Array.isArray(customers) || customers.length === 0) {
      customerDropdown.innerHTML = '<option value="">No customers available</option>';
      customerList.innerHTML = '<p>No customers to display.</p>';
      return;
    }

    // Populate the dropdown
    customerDropdown.innerHTML = customers.map(customer => `
      <option value="${customer.id}">${customer.name} (ID: ${customer.id})</option>
    `).join('');

    // Populate the customer list with delete buttons
    customerList.innerHTML = customers.map(customer => `
      <div class="customer-item">
        <p><strong>${customer.name}</strong> (Email: ${customer.email})</p>  <!-- Ensure 'email' is accessed here -->
        <button onclick="deleteCustomer(${customer.id})">Delete</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching customers:', error);
    document.getElementById('customer-list').innerHTML = '<p>Error loading customers.</p>';
  }
}

async function deleteCustomer(customerId) {
  if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
    return; // Exit if the user cancels
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/customers/${customerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Customer deleted successfully');
    fetchCustomers(); // Refresh the customer list
  } catch (error) {
    console.error('Error deleting customer:', error);
  }
}

// Update the cart when a customer is selected
async function updateCart() {
  const customerId = document.getElementById('customerId').value; // Get the selected customer ID
  if (!customerId) {
    console.error('No customer selected.');
    document.getElementById('cart-list').innerHTML = '<p>Please log in to view your cart.</p>';
    return;
  }

  console.log('Selected Customer ID:', customerId); // Debugging log
  fetchCart(customerId);
}

// 3. Add/Edit Cart
async function fetchCart(customerId) {
  console.log('Fetching cart for customer ID:', customerId); // Debugging log

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/cart/${customerId}`);
    const cart = await response.json();

    const cartList = document.getElementById('cart-list');
    if (cart.message === "Cart is empty") {
      cartList.innerHTML = '<p>Your cart is empty.</p>';
      return;
    }

    cartList.innerHTML = cart.map(item => `
      <div class="cart-item">
        <p><strong>${item.name}</strong> - $${item.price} x ${item.quantity}</p>
        <button onclick="deleteCartItem(${customerId}, ${item.product_id})">Delete</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching cart:', error);
    document.getElementById('cart-list').innerHTML = '<p>Error loading cart.</p>';
  }
}

async function createOrder() {
  const customerId = document.getElementById('customerId').value; // Get the selected customer ID

  if (!customerId) {
    alert('Please select a customer to create an order.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    const result = await response.json();
    alert(`Order created successfully. Order ID: ${result.order_id}`);
    fetchCart(customerId); // Refresh the cart (it should now be empty)
  } catch (error) {
    console.error('Error creating order:', error);
    alert('An error occurred while creating the order.');
  }
}

// Fetch all orders
async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();

    const productList = document.getElementById('product-list');
    productList.innerHTML = products.map(product => `
      <div class="product">
        <h4>${product.name} ($${parseFloat(product.price).toFixed(2)})</h4>
        <p>${product.description}</p>
        <label for="quantity-${product.id}">Quantity:</label>
        <input type="number" id="quantity-${product.id}" value="1" min="1">
        <button onclick="addToCart(${product.id})">Add to Cart</button>
        <button onclick="deleteProduct(${product.id})">Delete</button> <!-- Add this line -->
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching products:', error);
    document.getElementById('product-list').innerHTML = '<p>Error loading products.</p>';
  }
}



// Fetch orders for the selected customer
async function fetchOrdersForCustomer() {
  const customerId = document.getElementById('customerId').value;

  if (!customerId) {
    alert('Please select a customer to view their orders.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders?customer_id=${customerId}`);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status} - ${response.statusText}`);
    }
    const orders = await response.json();

    if (orders.length === 0) {
      document.getElementById('order-list').innerHTML = '<p>No orders found for this customer.</p>';
      return;
    }

    displayOrders(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    document.getElementById('order-list').innerHTML = `<p>${error.message}</p>`;
  }
}

// Helper function to display orders
function displayOrders(orders) {
  const orderList = document.getElementById('order-list');

  if (!Array.isArray(orders) || orders.length === 0) {
    orderList.innerHTML = '<p>No orders found.</p>';
    return;
  }

  orderList.innerHTML = orders.map(order => `
    <div class="order">
      <h3>Order ID: ${order.order_id}</h3>
      ${order.customer_name ? `<p>Customer: ${order.customer_name} (ID: ${order.customer_id})</p>` : ''}
      <p>Total Amount: $${Number(order.total_amount).toFixed(2)}</p>
      <p>Status: <span id="order-status-${order.order_id}">${order.status}</span></p>
      <p>Created At: ${new Date(order.created_at).toLocaleString()}</p>
      <h4>Items:</h4>
      <ul>
        ${order.items.map(item => `
          <li>${item.product_name} - $${item.price.toFixed(2)} x ${item.quantity}</li>
        `).join('')}
      </ul>
      <button onclick="deleteOrder(${order.order_id})">Delete Order</button>
      <button onclick="changeOrderStatus(${order.order_id}, '${order.status}')">
        ${order.status === 'Pending' ? 'Mark as Complete' : 'Revert to Pending'}
      </button>
    </div>
  `).join('');
}


async function changeOrderStatus(orderId, currentStatus) {
  const newStatus = currentStatus === 'Pending' ? 'Complete' : 'Pending';

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert(`Order status updated to ${newStatus}`);
    document.getElementById(`order-status-${orderId}`).textContent = newStatus; // Update status on the page
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('An error occurred while updating the order status.');
  }
}


async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    return; // Exit if the user cancels the confirmation
  }

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Order deleted successfully');
    fetchOrders(); // Refresh the orders list
  } catch (error) {
    console.error('Error deleting order:', error);
  }
}

// Product Form: Add Product
document.getElementById('productForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('productName').value;
  const price = parseFloat(document.getElementById('productPrice').value); // Parse price as a float
  const description = document.getElementById('productDescription').value;

  if (isNaN(price) || price < 0) {
    alert('Invalid price. Please enter a positive number.');
    return;
  }

  const newProduct = { name, price, description };

  try {
    const response = await fetch('http://127.0.0.1:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    console.log('Product added successfully');
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error:', error);
  }
});

// Customer Form: Add Customer
document.getElementById('customerForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('customerName').value;
  const email = document.getElementById('customerEmail').value;
  const address = document.getElementById('customerAddress').value;

  try {
    const response = await fetch('http://127.0.0.1:5000/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, address }),
    });

    if (response.status === 409) {
      const error = await response.json();
      alert(error.error); // Show duplicate email error
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`);
      return;
    }

    alert('Customer created successfully');
  } catch (error) {
    console.error('Error creating customer:', error);
  }
});

document.getElementById('customerId').addEventListener('change', function () {
  const customerId = this.value;
  console.log('Selected Customer ID:', customerId); // Debugging log
  if (customerId) {
    fetchCart(customerId);
  } else {
    document.getElementById('cart-list').innerHTML = '<p>Please select a customer to view their cart.</p>';
  }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  fetchInventory();
  fetchCustomers();
  const customerId = localStorage.getItem('customer_id');
  if (!customerId) {
    console.error('Customer ID is undefined. Please ensure the user is logged in.');
    document.getElementById('cart-list').innerHTML = '<p>Please log in to view your cart.</p>';
    return;
  }
  fetchCart(customerId);
});

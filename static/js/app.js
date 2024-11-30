// Define the base API URL for all API requests
const API_URL = "http://127.0.0.1:5000/api";

/* ---------------------------- Utility Functions ----------------------------- */

// Utility function: Fetch JSON data from an API endpoint
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options); // Perform API call with optional parameters
  if (!response.ok) {
    console.error(`Error: ${response.statusText}`); // Log any errors from the API call
    return null; // Return null to signify failure
  }
  return response.json(); // Parse and return JSON data
}

/* ---------------------------- Product Management ----------------------------- */

// Fetch and display all products from the server
async function fetchProducts() {
  try {
    const response = await fetch(`${API_URL}/products`); // Call the products endpoint
    const products = await response.json(); // Parse the JSON response

    const productList = document.getElementById('product-list'); // Target the product list container
    // Populate the container with product data
    productList.innerHTML = products.map(product => `
      <div class="product">
        <h4>${product.name} ($${parseFloat(product.price).toFixed(2)})</h4>
        <p>${product.description}</p>
        <label for="quantity-${product.id}">Quantity:</label>
        <input type="number" id="quantity-${product.id}" value="1" min="1">
        <button onclick="addToCart(${product.id})">Add to Cart</button>
        <button onclick="deleteProduct(${product.id})">Delete</button>
      </div>
    `).join(''); // Join all product HTML strings and inject into the container
  } catch (error) {
    console.error('Error fetching products:', error); // Log any errors
    document.getElementById('product-list').innerHTML = '<p>Error loading products.</p>';
  }
}

// Delete a product by its ID
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return; // Exit if user cancels confirmation
  }

  try {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE', // Use DELETE method to remove the product
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify the user if deletion fails
      return;
    }

    alert('Product deleted successfully'); // Notify user of successful deletion
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error deleting product:', error); // Log any errors
  }
}

// Add a new product using the product form
document.getElementById('productForm').addEventListener('submit', async function(event) {
  event.preventDefault(); // Prevent default form submission behavior

  // Collect product data from form inputs
  const name = document.getElementById('productName').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const description = document.getElementById('productDescription').value;

  if (isNaN(price) || price < 0) {
    alert('Invalid price. Please enter a positive number.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST', // Use POST method to add a new product
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, description }), // Send product data as JSON
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify the user if an error occurs
      return;
    }

    alert('Product added successfully'); // Notify user of success
    fetchProducts(); // Refresh the product list
  } catch (error) {
    console.error('Error adding product:', error); // Log any errors
  }
});

/* ---------------------------- Inventory Management ----------------------------- */

// Fetch and display inventory items
async function fetchInventory() {
  try {
    const response = await fetch(`${API_URL}/inventory`); // Call the inventory endpoint
    const inventory = await response.json(); // Parse the JSON response

    const inventoryList = document.getElementById('inventory-list'); // Target the inventory list container
    // Populate the container with inventory data
    inventoryList.innerHTML = inventory.map(item => `
      <div class="inventory-item">
        <p><strong>${item.name}</strong> - $${parseFloat(item.price).toFixed(2)}</p>
        <p>Stock: 
          <input type="number" id="stock-${item.product_id}" value="${item.stock_level}" min="0">
          <button onclick="updateStock(${item.product_id})">Update Stock</button>
        </p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching inventory:', error); // Log any errors
    document.getElementById('inventory-list').innerHTML = '<p>Error loading inventory.</p>';
  }
}

// Update the stock level for a specific product
async function updateStock(productId) {
  const stockInput = document.getElementById(`stock-${productId}`); // Target the stock input field
  const newStock = parseInt(stockInput.value, 10); // Parse input value as an integer

  if (isNaN(newStock) || newStock < 0) {
    alert('Invalid stock level. Please enter a non-negative number.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/inventory/${productId}`, {
      method: 'PUT', // Use PUT method to update stock
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_level: newStock }), // Send new stock level as JSON
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify the user if an error occurs
      return;
    }

    alert('Stock updated successfully'); // Notify user of success
    fetchInventory(); // Refresh the inventory list
  } catch (error) {
    console.error('Error updating stock:', error); // Log any errors
  }
}

/* ---------------------------- Cart Management ----------------------------- */

// Fetch and display the cart for a specific customer
async function fetchCart(customerId) {
  console.log('Fetching cart for customer ID:', customerId); // Debugging log

  try {
    const response = await fetch(`${API_URL}/cart/${customerId}`); // Fetch cart data from the API
    const cart = await response.json(); // Parse the response as JSON

    const cartList = document.getElementById('cart-list'); // Target the cart list container
    if (cart.message === "Cart is empty") {
      cartList.innerHTML = '<p>Your cart is empty.</p>'; // Handle empty cart case
      return;
    }

    // Populate the cart list with cart items
    cartList.innerHTML = cart.map(item => `
      <div class="cart-item">
        <p><strong>${item.name}</strong> - $${item.price} x ${item.quantity}</p>
        <button onclick="deleteCartItem(${customerId}, ${item.product_id})">Delete</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching cart:', error); // Log any errors
    document.getElementById('cart-list').innerHTML = '<p>Error loading cart.</p>';
  }
}

// Add a product to the cart for a specific customer
async function addToCart(productId) {
  const customerId = document.getElementById('customerId').value; // Get selected customer ID
  const quantityInput = document.getElementById(`quantity-${productId}`); // Get the quantity input for the product
  const quantity = parseInt(quantityInput.value, 10); // Convert the quantity to an integer

  // Validate customer and quantity inputs
  if (!customerId) {
    alert('Please select a customer before adding to cart.');
    return;
  }
  if (!quantity || quantity <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }

  try {
    // Send the add-to-cart request to the API
    const response = await fetch(`${API_URL}/cart`, {
      method: 'POST', // Use POST method to add the product to the cart
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity }), // Send cart data as JSON
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user of any errors
      return;
    }

    alert(`Added ${quantity} of product to cart successfully`); // Notify user of success
    fetchCart(customerId); // Refresh the cart for the customer
  } catch (error) {
    console.error('Error adding to cart:', error); // Log any errors
  }
}

// Delete an item from the cart for a specific customer
async function deleteCartItem(customerId, productId) {
  if (!confirm('Are you sure you want to delete this item from the cart?')) {
    return; // Exit if user cancels confirmation
  }

  try {
    // Send the delete request to the API
    const response = await fetch(`${API_URL}/cart/${customerId}/${productId}`, {
      method: 'DELETE', // Use DELETE method to remove the item from the cart
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user if deletion fails
      return;
    }

    alert('Item deleted successfully'); // Notify user of success
    fetchCart(customerId); // Refresh the cart for the customer
  } catch (error) {
    console.error('Error deleting cart item:', error); // Log any errors
  }
}

// Update the cart display when a customer is selected
document.getElementById('customerId').addEventListener('change', function () {
  const customerId = this.value; // Get the selected customer ID from the dropdown
  console.log('Selected Customer ID:', customerId); // Debugging log

  if (customerId) {
    localStorage.setItem('customer_id', customerId); // Save the selected customer ID to localStorage
    fetchCart(customerId); // Fetch and display the cart for the selected customer
  } else {
    document.getElementById('cart-list').innerHTML = '<p>Please select a customer to view your cart.</p>';
  }
});

/* ---------------------------- Customer Management ----------------------------- */

// Fetch and display all customers
async function fetchCustomers() {
  try {
    const response = await fetch(`${API_URL}/customers`); // Call the customers endpoint
    const customers = await response.json(); // Parse the JSON response

    const customerDropdown = document.getElementById('customerId'); // Target customer dropdown
    const customerList = document.getElementById('customer-list'); // Target customer list container

    if (!Array.isArray(customers) || customers.length === 0) {
      customerDropdown.innerHTML = '<option value="">No customers available</option>';
      customerList.innerHTML = '<p>No customers to display.</p>';
      return;
    }

    customerDropdown.innerHTML = customers.map(customer => `
      <option value="${customer.id}">${customer.name} (ID: ${customer.id})</option>
    `).join('');

    customerList.innerHTML = customers.map(customer => `
      <div class="customer-item">
        <p><strong>${customer.name}</strong> (Email: ${customer.email})</p>
        <button onclick="deleteCustomer(${customer.id})">Delete</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching customers:', error); // Log any errors
    document.getElementById('customer-list').innerHTML = '<p>Error loading customers.</p>';
  }
}
// Add a new customer using the customer form
document.getElementById('customerForm').addEventListener('submit', async function(event) {
  event.preventDefault(); // Prevent default form submission behavior

  // Collect customer data from form inputs
  const name = document.getElementById('customerName').value;
  const email = document.getElementById('customerEmail').value;
  const address = document.getElementById('customerAddress').value;

  try {
    const response = await fetch(`${API_URL}/customers`, {
      method: 'POST', // Use POST method to add a new customer
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, address }), // Send customer data as JSON
    });

    if (response.status === 409) {
      const error = await response.json();
      alert(error.error); // Notify user if there's a duplicate email error
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user of any other errors
      return;
    }

    alert('Customer created successfully'); // Notify user of success
    fetchCustomers(); // Refresh the customer list
  } catch (error) {
    console.error('Error creating customer:', error); // Log any errors
  }
});

// Delete a customer by their ID
async function deleteCustomer(customerId) {
  if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
    return; // Exit if user cancels confirmation
  }

  try {
    const response = await fetch(`${API_URL}/customers/${customerId}`, {
      method: 'DELETE', // Use DELETE method to remove the customer
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user if deletion fails
      return;
    }

    alert('Customer deleted successfully'); // Notify user of successful deletion
    fetchCustomers(); // Refresh the customer list
  } catch (error) {
    console.error('Error deleting customer:', error); // Log any errors
  }
}

/* ---------------------------- Order Management ----------------------------- */

// Fetch and display orders for all customers or a specific customer
async function fetchOrders(customerId = null) {
  try {
    // If a customer ID is provided, fetch orders for that customer only
    const url = customerId ? `${API_URL}/orders?customer_id=${customerId}` : `${API_URL}/orders`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`); // Throw error for failed requests
    }

    const orders = await response.json(); // Parse the JSON response
    displayOrders(orders); // Use helper function to display orders
  } catch (error) {
    console.error('Error fetching orders:', error); // Log any errors
    document.getElementById('order-list').innerHTML = '<p>Error loading orders.</p>';
  }
}

// Fetch and display orders for the selected customer
async function fetchOrdersForCustomer() {
  // Retrieve the selected customer ID from the dropdown
  const customerId = document.getElementById('customerId').value;

  // Check if a customer ID is selected
  if (!customerId) {
    alert('Please select a customer to view their orders.');
    return; // Exit if no customer is selected
  }

  try {
    // Make a GET request to fetch orders for the specific customer
    const response = await fetch(`${API_URL}/orders?customer_id=${customerId}`);

    // Check if the API request was successful
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`); // Throw an error if response is not OK
    }

    // Parse the JSON response
    const orders = await response.json();

    // Handle the case where no orders are found for the customer
    if (orders.length === 0) {
      document.getElementById('order-list').innerHTML = '<p>No orders found for this customer.</p>';
      return; // Exit after displaying the message
    }

    // Use the helper function to display the orders on the page
    displayOrders(orders);
  } catch (error) {
    // Log and display errors during the API request
    console.error('Error fetching customer orders:', error);
    document.getElementById('order-list').innerHTML = `<p>Error loading orders: ${error.message}</p>`;
  }
}

// Helper function to render orders on the page
function displayOrders(orders) {
  // Get the container for displaying the list of orders
  const orderList = document.getElementById('order-list');

  // Check if the orders array is empty or invalid
  if (!Array.isArray(orders) || orders.length === 0) {
    orderList.innerHTML = '<p>No orders found.</p>'; // Display a message if no orders are found
    return; // Exit after displaying the message
  }

  // Map through the orders array and generate HTML for each order
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
      <!-- Button to delete the order -->
      <button onclick="deleteOrder(${order.order_id})">Delete Order</button>
      <!-- Button to toggle order status -->
      <button onclick="changeOrderStatus(${order.order_id}, '${order.status}')">
        ${order.status === 'Pending' ? 'Mark as Complete' : 'Revert to Pending'}
      </button>
    </div>
  `).join(''); // Combine all HTML into a single string
}

// Change the status of an order (Pending <-> Complete)
async function changeOrderStatus(orderId, currentStatus) {
  const newStatus = currentStatus === 'Pending' ? 'Complete' : 'Pending'; // Toggle the status

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT', // Use PUT method to update order status
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }), // Send the new status as JSON
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user of any errors
      return;
    }

    alert(`Order status updated to ${newStatus}`); // Notify user of success
    document.getElementById(`order-status-${orderId}`).textContent = newStatus; // Update status on the page
  } catch (error) {
    console.error('Error updating order status:', error); // Log any errors
    alert('An error occurred while updating the order status.');
  }
}

// Delete an order by its ID
async function deleteOrder(orderId) {
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    return; // Exit if user cancels confirmation
  }

  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE', // Use DELETE method to remove the order
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user if deletion fails
      return;
    }

    alert('Order deleted successfully'); // Notify user of success
    fetchOrders(); // Refresh the orders list
  } catch (error) {
    console.error('Error deleting order:', error); // Log any errors
  }
}

// Create a new order for a specific customer
async function createOrder() {
  const customerId = document.getElementById('customerId').value; // Get the selected customer ID

  if (!customerId) {
    alert('Please select a customer to create an order.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST', // Use POST method to create a new order
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId }), // Send customer ID as JSON
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error}`); // Notify user of any errors
      return;
    }

    const result = await response.json();
    alert(`Order created successfully. Order ID: ${result.order_id}`); // Notify user of success
    fetchCart(customerId); // Refresh the cart (it should now be empty)
  } catch (error) {
    console.error('Error creating order:', error); // Log any errors
    alert('An error occurred while creating the order.');
  }
}

/* ---------------------------- Initialization ----------------------------- */

// Initialize the application on page load
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts(); // Load products
  fetchInventory(); // Load inventory
  fetchCustomers(); // Load customers into dropdown

  // Retrieve the last selected customer ID from localStorage
  const customerId = localStorage.getItem('customer_id');
  console.log('Loaded Customer ID from storage:', customerId); // Debugging log

  if (customerId) {
    document.getElementById('customerId').value = customerId; // Set dropdown to saved customer ID
    fetchCart(customerId); // Fetch and display the cart for the saved customer
  } else {
    document.getElementById('cart-list').innerHTML = '<p>Please select a customer to view your cart.</p>';
  }
});
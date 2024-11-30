from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import pymysql.cursors

app = Flask(__name__)
CORS(app)

# MySQL connection function
def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="root",  # Replace with your MySQL username
        password="Mazatlan1!",  # Replace with your MySQL password
        database="grocery_db"  # Replace with your database name
    )

# View all products
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products)

@app.route('/api/products', methods=['POST'])
def add_product():
    product_data = request.get_json()
    name = product_data.get('name')
    price = product_data.get('price')  # Ensure the price can handle decimal input
    description = product_data.get('description')

    if not name or price is None or not description:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        price = float(price)  # Convert price to float
        if price < 0:
            return jsonify({"error": "Price must be a positive number"}), 400
    except ValueError:
        return jsonify({"error": "Invalid price format"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO products (name, price, description) VALUES (%s, %s, %s)",
        (name, price, description)
    )
    product_id = cursor.lastrowid

    # Initialize the stock level for the new product in the inventory table
    cursor.execute(
        "INSERT INTO inventory (product_id, stock_level) VALUES (%s, %s)",
        (product_id, 0)  # Default stock level is 0
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Product added successfully", "product_id": product_id}), 201

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Debug: Log product_id being deleted
        print(f"Attempting to delete product with ID: {product_id}")

        # Delete associated rows in related tables (if applicable)
        cursor.execute("DELETE FROM inventory WHERE product_id = %s", (product_id,))
        print("Deleted from inventory")

        cursor.execute("DELETE FROM cart WHERE product_id = %s", (product_id,))
        print("Deleted from cart")

        # Delete the product
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        print("Deleted from products")

        conn.commit()

        if cursor.rowcount == 0:
            print("Product not found")
            return jsonify({"error": "Product not found"}), 404

    except Exception as e:
        print(f"Error while deleting product: {e}")  # Debug the error
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Product deleted successfully"}), 200


# View inventory
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)  # Use DictCursor for dictionary-like rows
    cursor.execute("""
        SELECT p.id AS product_id, p.name, p.price, i.stock_level
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
    """)
    inventory = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(inventory)


# Add inventory
@app.route('/api/inventory/<int:product_id>', methods=['PUT'])
def update_inventory(product_id):
    stock_level = request.get_json().get('stock_level')
    if stock_level is None:
        return jsonify({"error": "Missing stock level"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE inventory SET stock_level = %s WHERE product_id = %s",
        (stock_level, product_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Inventory updated successfully"})

# Edit inventory
@app.route('/api/inventory/<int:product_id>', methods=['PUT'])
def update_inventory_stock(product_id):
    stock_data = request.get_json()
    stock_level = stock_data.get('stock_level')

    print(f"Received request to update stock for product ID {product_id} with stock level {stock_level}")  # Debugging log

    if stock_level is None or stock_level < 0:
        return jsonify({"error": "Invalid stock level"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE inventory SET stock_level = %s WHERE product_id = %s",
        (stock_level, product_id)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Stock updated successfully"}), 200

# View or edit cart
@app.route('/api/cart/<int:customer_id>', methods=['GET'])
def view_cart(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    # Fetch cart items for the given customer
    cursor.execute("""
        SELECT c.id AS cart_id, p.id AS product_id, p.name, p.price, c.quantity
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = %s
    """, (customer_id,))
    cart_items = cursor.fetchall()

    # Debugging log to check the fetched data
    print("Cart Items:", cart_items)

    # Handle edge case: If the cart is empty, return an appropriate message
    if not cart_items:
        cursor.close()
        conn.close()
        return jsonify({"message": "Cart is empty"}), 200

    cursor.close()
    conn.close()

    # Return the fetched cart items
    return jsonify(cart_items)

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    customer_id = data.get('customer_id')
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)  # Default quantity is 1 if not provided

    if not customer_id or not product_id or quantity <= 0:
        return jsonify({"error": "Invalid customer ID, product ID, or quantity"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    try:
        # Validate stock availability
        cursor.execute("""
            SELECT stock_level FROM inventory WHERE product_id = %s
        """, (product_id,))
        stock_row = cursor.fetchone()

        if not stock_row:
            return jsonify({"error": "Product not found in inventory"}), 404

        available_stock = stock_row['stock_level']
        if quantity > available_stock:
            return jsonify({"error": f"Only {available_stock} units of this product are available"}), 400

        # Check if the product already exists in the cart for the customer
        cursor.execute("""
            SELECT quantity FROM cart WHERE customer_id = %s AND product_id = %s
        """, (customer_id, product_id))
        existing_item = cursor.fetchone()

        if existing_item:
            # Update the quantity if the product already exists in the cart
            cursor.execute("""
                UPDATE cart SET quantity = quantity + %s 
                WHERE customer_id = %s AND product_id = %s
            """, (quantity, customer_id, product_id))
        else:
            # Add a new item to the cart
            cursor.execute("""
                INSERT INTO cart (customer_id, product_id, quantity) 
                VALUES (%s, %s, %s)
            """, (customer_id, product_id, quantity))

        # Deduct the quantity from the inventory stock
        cursor.execute("""
            UPDATE inventory SET stock_level = stock_level - %s WHERE product_id = %s
        """, (quantity, product_id))

        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": f"Added {quantity} of product {product_id} to cart"}), 200

# View customers
@app.route('/api/customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    cursor.execute("SELECT id, name, email FROM customers")  # Ensure 'email' is included
    customers = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(customers)


# Add/Edit customer
@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    address = data.get('address')

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO customers (name, email, address) VALUES (%s, %s, %s)",
            (name, email, address)
        )
        conn.commit()
    except pymysql.err.IntegrityError as e:
        if "Duplicate entry" in str(e):
            return jsonify({"error": f"Email '{email}' is already in use"}), 409
        else:
            raise e  # Re-raise other unexpected errors
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Customer created successfully"}), 201

@app.route('/api/cart/<int:customer_id>/<int:product_id>', methods=['DELETE'])
def delete_cart_item(customer_id, product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Delete the item from the cart
        cursor.execute("""
            DELETE FROM cart
            WHERE customer_id = %s AND product_id = %s
        """, (customer_id, product_id))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Item not found in cart"}), 404

    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Item deleted successfully"}), 200

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    address = data.get('address')

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "UPDATE customers SET name = %s, email = %s, address = %s WHERE id = %s",
            (name, email, address, customer_id)
        )
        conn.commit()
    except pymysql.err.IntegrityError as e:
        if "Duplicate entry" in str(e):
            return jsonify({"error": f"Email '{email}' is already in use"}), 409
        else:
            raise e  # Re-raise other unexpected errors
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Customer updated successfully"}), 200

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.get_json()
    new_status = data.get('status')

    if not new_status:
        return jsonify({"error": "Status is required"}), 400

    if new_status not in ["Pending", "Complete"]:
        return jsonify({"error": "Invalid status"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Update the order's status
        cursor.execute("""
            UPDATE orders
            SET status = %s
            WHERE id = %s
        """, (new_status, order_id))

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Order not found"}), 404
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": f"Order status updated to {new_status}"}), 200

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Delete related rows in the cart table
        cursor.execute("DELETE FROM cart WHERE customer_id = %s", (customer_id,))
        conn.commit()

        # Delete the customer
        cursor.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Customer not found"}), 404

    except Exception as e:
        conn.rollback()  # Rollback in case of an error
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Customer deleted successfully"}), 200

@app.route('/api/orders', methods=['GET'])
def get_orders():
    customer_id = request.args.get('customer_id')  # Optional customer ID filter

    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    # Fetch orders with or without a customer filter
    if customer_id:
        cursor.execute("""
            SELECT o.id AS order_id, o.total_amount, o.status, o.created_at, 
                   oi.product_id, oi.quantity, oi.price, p.name AS product_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.customer_id = %s
            ORDER BY o.created_at DESC
        """, (customer_id,))
    else:
        cursor.execute("""
            SELECT o.id AS order_id, o.customer_id, c.name AS customer_name, 
                   o.total_amount, o.status, o.created_at, 
                   oi.product_id, oi.quantity, oi.price, p.name AS product_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            ORDER BY o.created_at DESC
        """)

    orders = cursor.fetchall()
    cursor.close()
    conn.close()

    # Group orders by order_id
    grouped_orders = {}
    for order in orders:
        order_id = order['order_id']
        if order_id not in grouped_orders:
            grouped_orders[order_id] = {
                "order_id": order_id,
                "customer_id": order.get("customer_id"),
                "customer_name": order.get("customer_name"),
                "total_amount": float(order["total_amount"]),  # Ensure total_amount is a float
                "status": order["status"],
                "created_at": order["created_at"],
                "items": []
            }
        grouped_orders[order_id]["items"].append({
            "product_id": order["product_id"],
            "product_name": order["product_name"],
            "quantity": order["quantity"],
            "price": float(order["price"])  # Ensure price is a float
        })

    # Convert grouped orders to a list and return as JSON
    return jsonify(list(grouped_orders.values()))

# Process orders
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    customer_id = data.get('customer_id')

    if not customer_id:
        return jsonify({"error": "Customer ID is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)

    # Fetch the cart items for the customer
    cursor.execute("""
        SELECT c.product_id, c.quantity, p.price
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = %s
    """, (customer_id,))
    cart_items = cursor.fetchall()

    if not cart_items:
        return jsonify({"error": "Cart is empty"}), 400

    # Calculate the total amount
    total_amount = sum(item['price'] * item['quantity'] for item in cart_items)

    # Create a new order
    cursor.execute("""
        INSERT INTO orders (customer_id, total_amount, status) 
        VALUES (%s, %s, 'Pending')
    """, (customer_id, total_amount))
    order_id = cursor.lastrowid

    # Add items to the order_items table
    for item in cart_items:
        cursor.execute("""
            INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES (%s, %s, %s, %s)
        """, (order_id, item['product_id'], item['quantity'], item['price']))

    # Clear the cart for the customer
    cursor.execute("DELETE FROM cart WHERE customer_id = %s", (customer_id,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Order created successfully", "order_id": order_id}), 201

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Delete related rows in the order_items table
        cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
        conn.commit()

        # Delete the order itself
        cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({"message": "Order deleted successfully"}), 200


if __name__ == '__main__':
    app.run(debug=True)

"""
Seed data generator — populates the database with sample data on first launch.
"""
import os
import csv
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app import models, crud

CUSTOMER_NAMES = [
    "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson",
    "Jessica Martinez", "Chris Anderson", "Ashley Thomas", "Daniel Garcia", "Amanda Rodriguez",
    "Matthew Lee", "Stephanie Walker", "Andrew Hall", "Nicole Allen", "Joshua Young",
    "Megan King", "Ryan Wright", "Rachel Lopez", "Justin Hill", "Lauren Scott",
]

PRODUCT_VARIANTS = [
    "iPhone 15 Black 128GB",
    "iPhone 15 Pro Max Silver 256GB",
    "AirPods Pro 2",
    "Galaxy S24 Ultra Titanium 256GB",
    "Galaxy Tab S9 Gray 128GB",
    "Pixel 9 Pro Obsidian 128GB",
    "Sony WH-1000XM5 Black",
    "MacBook Air M3 Space Gray 256GB",
    "iPad Pro 11 M4 Space Black 256GB",
    "Apple Watch Ultra 2",
    "Galaxy Buds3 Pro Silver",
    "Dell XPS 15 Laptop Intel",
    "AirTag 4 Pack",
    "Nintendo Switch OLED White",
    "Bose QuietComfort Ultra Earbuds Black",
    "PlayStation 5 Slim Console",
    "Surface Pro 10 Platinum",
    "Logitech MX Master 3S Graphite",
    "Apple Magic Keyboard White",
    "Galaxy Watch 6 Classic Black",
]

SUPPLIER_A_PRODUCTS = [
    ("Apple iPhone 15 Midnight 128GB", "APL-IP15-BK-128", 799.99),
    ("Apple iPhone 15 Pro Max 256GB", "APL-IP15PM-256", 1199.99),
    ("Apple AirPods Pro Gen 2", "APL-APP2", 249.99),
    ("Google Pixel 9 Pro 128GB", "GGL-PX9P-128", 999.99),
    ("Sony WH-1000XM5 Headphones", "SNY-WH1KXM5", 349.99),
    ("Apple MacBook Air M3 256GB", "APL-MBA-M3-256", 1099.99),
    ("Apple iPad Pro 11 M4 256GB", "APL-IPP11-M4", 1099.99),
    ("Apple Watch Ultra 2", "APL-AWU2", 799.99),
    ("Apple AirTag 4 Pack", "APL-AT4P", 99.99),
    ("Apple Magic Keyboard", "APL-MK", 199.99),
]

SUPPLIER_B_PRODUCTS = [
    ("Samsung Galaxy S24 Ultra 256GB", "SAM-GS24U-256", 1299.99),
    ("Samsung Galaxy Tab S9 128GB", "SAM-GTS9-128", 849.99),
    ("Samsung Galaxy Buds3 Pro", "SAM-GB3P", 249.99),
    ("Dell XPS 15 Laptop", "DEL-XPS15", 1499.99),
    ("Nintendo Switch OLED", "NIN-SWOLED", 349.99),
    ("Bose QuietComfort Ultra Earbuds", "BOSE-QCUE", 299.99),
    ("Sony PlayStation 5 Slim", "SNY-PS5S", 449.99),
    ("Microsoft Surface Pro 10", "MS-SP10", 1199.99),
    ("Logitech MX Master 3S Mouse", "LGT-MXM3S", 99.99),
    ("Samsung Galaxy Watch 6 Classic", "SAM-GW6C", 399.99),
]

STATUS_DISTRIBUTION = [
    (models.OrderStatus.IMPORTED, 10),
    (models.OrderStatus.MATCHED, 8),
    (models.OrderStatus.QUEUED, 5),
    (models.OrderStatus.PROCESSING, 3),
    (models.OrderStatus.ORDERED, 4),
    (models.OrderStatus.TRACKING_ASSIGNED, 5),
    (models.OrderStatus.COMPLETED, 12),
    (models.OrderStatus.FAILED, 3),
]


def seed_database(db: Session):
    """Seed the database with demo data if empty."""
    if crud.count_orders(db) > 0:
        return  # Already seeded

    # Create suppliers
    supplier_a = db.query(models.Supplier).filter(models.Supplier.code == "supplier_a").first()
    supplier_b = db.query(models.Supplier).filter(models.Supplier.code == "supplier_b").first()
    
    if not supplier_a:
        supplier_a = crud.create_supplier(
            db, name="TechDirect", code="supplier_a",
            website_url="http://localhost:8000/supplier-site/"
        )
        supplier_b = crud.create_supplier(
            db, name="GadgetWorld", code="supplier_b",
            website_url="http://localhost:8000/supplier-site/"
        )

        # Create products
        products_a = []
        for name, sku, price in SUPPLIER_A_PRODUCTS:
            p = crud.create_product(db, supplier_a.id, name, sku, price)
            products_a.append(p)

        products_b = []
        for name, sku, price in SUPPLIER_B_PRODUCTS:
            p = crud.create_product(db, supplier_b.id, name, sku, price)
            products_b.append(p)
    else:
        products_a = db.query(models.Product).filter(models.Product.supplier_id == supplier_a.id).all()
        products_b = db.query(models.Product).filter(models.Product.supplier_id == supplier_b.id).all()

    all_products = products_a + products_b

    # Create 50 sample orders with status distribution
    order_num = 1001
    orders_to_create = []

    for status, count in STATUS_DISTRIBUTION:
        for _ in range(count):
            orders_to_create.append((str(order_num), status))
            order_num += 1

    random.shuffle(orders_to_create)

    for order_id, target_status in orders_to_create:
        product_name = random.choice(PRODUCT_VARIANTS)
        customer = random.choice(CUSTOMER_NAMES)
        quantity = random.randint(1, 5)

        order = crud.create_order(db, order_id, product_name, quantity, customer)

        # Advance through statuses as needed
        if target_status == models.OrderStatus.IMPORTED:
            continue

        # Match the order
        matched_product = random.choice(all_products)
        supplier = supplier_a if matched_product in products_a else supplier_b
        score = round(random.uniform(65, 98), 1)
        crud.update_order_matching(
            db, order.id,
            matched_product.id, matched_product.name,
            score, supplier.id
        )

        if target_status == models.OrderStatus.MATCHED:
            continue

        crud.update_order_status(db, order.id, models.OrderStatus.QUEUED, "Queued for processing")
        if target_status == models.OrderStatus.QUEUED:
            continue

        crud.update_order_status(db, order.id, models.OrderStatus.PROCESSING, "Automation started")
        if target_status == models.OrderStatus.PROCESSING:
            continue

        crud.update_order_status(db, order.id, models.OrderStatus.ORDERED, "Order placed via automation")
        if target_status == models.OrderStatus.ORDERED:
            continue

        # Assign tracking
        order_ref = f"ORD-{random.randint(100000, 999999)}"
        tracking = f"TRK-{random.randint(100001, 999999)}"
        crud.update_order_tracking(db, order.id, order_ref, tracking)

        if target_status == models.OrderStatus.TRACKING_ASSIGNED:
            continue

        if target_status == models.OrderStatus.COMPLETED:
            crud.update_order_status(db, order.id, models.OrderStatus.COMPLETED, "Order completed")
        elif target_status == models.OrderStatus.FAILED:
            crud.update_order_status(db, order.id, models.OrderStatus.FAILED, "Automation failed (demo)")

    # Generate sample CSV
    _generate_sample_csv()


def _generate_sample_csv():
    """Generate a sample CSV for upload testing."""
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, "sample_orders.csv")

    rows = []
    for i in range(2001, 2011):
        rows.append({
            "order_id": str(i),
            "product_name": random.choice(PRODUCT_VARIANTS),
            "quantity": random.randint(1, 3),
            "customer_name": random.choice(CUSTOMER_NAMES),
        })

    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["order_id", "product_name", "quantity", "customer_name"])
        writer.writeheader()
        writer.writerows(rows)

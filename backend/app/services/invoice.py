import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from datetime import datetime

def generate_invoice_pdf(order_id: str, amount: str, platform: str, product: str, customer_email: str) -> io.BytesIO:
    """Generates a styled PDF invoice for an order and returns a BytesIO buffer."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=2))
    
    Story = []
    
    # Header
    header_style = styles["Heading1"]
    header_style.textColor = colors.HexColor("#4F46E5") # Indigo
    Story.append(Paragraph("BulkOrder Invoice", header_style))
    Story.append(Paragraph(f"Invoice Number: INV-{order_id}", styles["Normal"]))
    Story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", styles["Normal"]))
    Story.append(Spacer(1, 24))
    
    # Customer Details
    Story.append(Paragraph("<b>Billed To:</b>", styles["Normal"]))
    Story.append(Paragraph(f"{customer_email}", styles["Normal"]))
    Story.append(Paragraph(f"Platform: {platform}", styles["Normal"]))
    Story.append(Spacer(1, 24))
    
    # Order Table
    data = [
        ["Item Details", "Order ID", "Total"],
        [Paragraph(product, styles["Normal"]), order_id, amount]
    ]
    
    table = Table(data, colWidths=[250, 100, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    
    Story.append(table)
    Story.append(Spacer(1, 36))
    
    # Footer
    Story.append(Paragraph("Thank you for using BulkOrder Automation Platform.", styles["Normal"]))
    Story.append(Paragraph("This is an auto-generated invoice.", styles["Italic"]))
    
    doc.build(Story)
    buffer.seek(0)
    return buffer

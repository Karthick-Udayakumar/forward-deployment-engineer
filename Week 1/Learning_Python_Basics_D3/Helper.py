def determine_approval(invoice_amount):
    if(invoice_amount > 1000):
        return "Manager approval required"
    elif invoice_amount > 500:
        return "Supervisor approval required"
    else:
        return "Standard approval required"

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  items: [{
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  status: { type: String, default: "Confirmed (demo)" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);


const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  emoji: { type: String, default: "🛍️" },
  description: { type: String, default: "" },
  stock: { type: Number, required: true, min: 0 }
});

module.exports = mongoose.model("Product", productSchema);

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Product = require("./models/Product");

async function importProducts() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI missing in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const filePath = path.join(
      __dirname,
      "data",
      "products.json"
    );

    const products = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("No products found in products.json");
    }

    const operations = products.map((product) => ({
      updateOne: {
        filter: { id: product.id },
        update: { $set: product },
        upsert: true
      }
    }));

    const result = await Product.bulkWrite(operations);

    console.log("Products import completed!");
    console.log("Products in source file:", products.length);
    console.log("Inserted:", result.upsertedCount);
    console.log("Updated:", result.modifiedCount);

  } catch (error) {
    console.error("Import failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

importProducts();
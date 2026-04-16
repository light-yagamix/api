/**
 * Script: Add New Services to the System
 *
 * This script adds the following services:
 *   - Construction Laborer (Construction → Residential Construction)
 *   - Mason (Construction → Residential Construction)
 *   - Carpenter (Construction → Residential Construction)
 *   - Sanitation Worker (Cleaning → Indoor Cleaning)
 *   - Convenience Store (NEW: Retail & Commercial → Shop Services)
 *   - Pharmacy (Retail & Commercial → Shop Services)
 *   - Food Vendor (Retail & Commercial → Shop Services)
 *   - Butcher (Retail & Commercial → Shop Services)
 *
 * It checks for existing categories and subcategories before creating new ones,
 * then updates both services.json files (web/lib & api/backend/assistant).
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Models
const CategoryModel = require("../backend/category/model");
const SubCategoryModel = require("../backend/sub-category/model");
const ServiceModel = require("../backend/service/model");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/work";

// ─── Service Definitions ────────────────────────────────────────────────────

const NEW_SERVICES = [
  // --- Construction services ---
  {
    name: "Construction Laborer",
    description:
      "Our Construction Laborer Services provide hardworking, dependable, and experienced laborers for residential, commercial, and industrial construction projects. From site preparation and material handling to concrete pouring and demolition cleanup, our laborers are trained to support every phase of your construction process safely and efficiently.",
    price_type: "hourly",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day (4 hours)", price: 2000 },
      { label: "Full day (8 hours)", price: 3500 },
      { label: "Weekly (6 days)", price: 18000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: ["Construction", "Laborer", "Labor", "Worker", "Building"],
    addons: [],
    service_count: 0,
    // Mapping hints (not stored in DB)
    _categoryName: "Construction",
    _subCategoryName: "Residential Construction",
  },
  {
    name: "Mason",
    description:
      "Our Mason Services provide skilled and experienced masons for block laying, brick work, plastering, and all types of structural masonry. Whether you're building a new home, adding an extension, or repairing existing structures, our professional masons deliver precision, durability, and quality craftsmanship every time.",
    price_type: "hourly",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day (4 hours)", price: 2500 },
      { label: "Full day (8 hours)", price: 4500 },
      { label: "Weekly (6 days)", price: 24000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: [
      "Mason",
      "Masonry",
      "Brick",
      "Block",
      "Construction",
      "Plastering",
    ],
    addons: [],
    service_count: 0,
    _categoryName: "Construction",
    _subCategoryName: "Residential Construction",
  },
  {
    name: "Carpenter",
    description:
      "Our Carpenter Services provide skilled woodworking professionals for furniture making, door and window fitting, cabinet installation, roofing frameworks, and all types of structural and decorative woodwork. Whether it's a new build, renovation, or custom furniture project, our experienced carpenters bring precision, creativity, and reliability to every job.",
    price_type: "hourly",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day (4 hours)", price: 2500 },
      { label: "Full day (8 hours)", price: 4500 },
      { label: "Custom furniture project (estimate)", price: 8000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: [
      "Carpenter",
      "Carpentry",
      "Wood",
      "Furniture",
      "Cabinet",
      "Construction",
    ],
    addons: [],
    service_count: 0,
    _categoryName: "Construction",
    _subCategoryName: "Residential Construction",
  },

  // --- Cleaning services ---
  {
    name: "Sanitation Worker",
    description:
      "Our Sanitation Worker Services provide trained and reliable personnel for street cleaning, lane sweeping, waste collection, and general public area sanitation. Ideal for residential communities, commercial complexes, construction sites, and municipal areas, our sanitation workers ensure clean, hygienic, and safe surroundings at all times.",
    price_type: "hourly",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day (4 hours)", price: 1500 },
      { label: "Full day (8 hours)", price: 2500 },
      { label: "Weekly (6 days)", price: 12000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: [
      "Sanitation",
      "Cleaning",
      "Street",
      "Sweeping",
      "Waste",
      "Municipal",
    ],
    addons: [],
    service_count: 0,
    _categoryName: "Cleaning",
    _subCategoryName: "Indoor Cleaning",
  },

  // --- Retail & Commercial services (NEW category + subcategory) ---
  {
    name: "Convenience Store",
    description:
      "Our Convenience Store Services connect you with reliable and well-stocked convenience store operators for residential complexes, office buildings, events, and temporary setups. From daily essentials and snacks to beverages and household items, our vendors provide a quick, accessible, and hassle-free shopping experience right where you need it.",
    price_type: "fixed",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day setup (4 hours)", price: 3000 },
      { label: "Full day setup (8 hours)", price: 5000 },
      { label: "Weekly contract (6 days)", price: 25000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: [
      "Convenience",
      "Store",
      "Shop",
      "Retail",
      "Essentials",
      "Vendor",
    ],
    addons: [],
    service_count: 0,
    _categoryName: "Retail & Commercial",
    _subCategoryName: "Shop Services",
    _newCategory: {
      name: "Retail & Commercial",
      description:
        "Retail and commercial services including shop operations, food vending, pharmacy, and daily convenience services for residential and commercial areas.",
      status: "active",
      isFeatured: true,
    },
    _newSubCategory: {
      name: "Shop Services",
      description:
        "Shop-based services including convenience stores, pharmacies, food vendors, and specialty retail operations.",
      status: "active",
      isFeatured: true,
    },
  },
  {
    name: "Pharmacy",
    description:
      "Our Pharmacy Services provide licensed and certified pharmacists and pharmacy assistants for on-site medication dispensing, health consultations, and pharmaceutical support. Ideal for community health events, corporate wellness programs, residential complexes, and temporary medical camps, our pharmacy professionals ensure safe, accurate, and accessible medication services.",
    price_type: "fixed",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day service (4 hours)", price: 3500 },
      { label: "Full day service (8 hours)", price: 6000 },
      { label: "Weekly contract (6 days)", price: 30000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: [
      "Pharmacy",
      "Medicine",
      "Drug",
      "Health",
      "Pharmacist",
      "Medical",
    ],
    addons: [],
    service_count: 0,
    _categoryName: "Retail & Commercial",
    _subCategoryName: "Shop Services",
  },
  {
    name: "Food Vendor",
    description:
      "Our Food Vendor Services provide experienced and hygiene-certified food vendors for events, construction sites, residential communities, and commercial areas. From street food favorites to fresh meals and snacks, our vendors bring delicious, affordable, and freshly prepared food right to your location.",
    price_type: "fixed",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day service (4 hours)", price: 2500 },
      { label: "Full day service (8 hours)", price: 4000 },
      { label: "Weekly contract (6 days)", price: 20000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: ["Food", "Vendor", "Catering", "Meal", "Street Food", "Cooking"],
    addons: [],
    service_count: 0,
    _categoryName: "Retail & Commercial",
    _subCategoryName: "Shop Services",
  },
  {
    name: "Butcher",
    description:
      "Our Butcher Services provide skilled and hygiene-certified butchers for meat processing, cutting, and preparation. Whether you need fresh cuts for a family gathering, bulk meat processing for events, or daily supply for restaurants and households, our experienced butchers deliver quality, precision, and freshness every time.",
    price_type: "fixed",
    service_type: "tradesman_based",
    prices: [
      { label: "Half day service (4 hours)", price: 2000 },
      { label: "Full day service (8 hours)", price: 3500 },
      { label: "Event/bulk processing", price: 5000 },
    ],
    duration: 8,
    status: "active",
    visit_type: "inPerson",
    isFeatured: true,
    requires_advance_payment: false,
    advance_payment_percentage: 0,
    keywords: ["Butcher", "Meat", "Cutting", "Food", "Processing"],
    addons: [],
    service_count: 0,
    _categoryName: "Retail & Commercial",
    _subCategoryName: "Shop Services",
  },
];

// ─── Main Script ────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // ── Step 1: Resolve categories ──────────────────────────────────────
    console.log("📂 Step 1: Resolving categories...");
    const categoryCache = {}; // name -> { _id, name }

    for (const svc of NEW_SERVICES) {
      const catName = svc._categoryName;
      if (categoryCache[catName]) continue;

      let category = await CategoryModel.findOne({ name: catName }).lean();
      if (category) {
        console.log(
          `  ✅ Category "${catName}" already exists (${category._id})`,
        );
      } else {
        // Create new category
        const catData = svc._newCategory || {
          name: catName,
          description: `${catName} services`,
          status: "active",
          isFeatured: true,
        };
        category = await CategoryModel.create(catData);
        console.log(`  🆕 Created category "${catName}" (${category._id})`);
      }
      categoryCache[catName] = category;
    }

    // ── Step 2: Resolve subcategories ───────────────────────────────────
    console.log("\n📁 Step 2: Resolving subcategories...");
    const subCategoryCache = {}; // "catName/subName" -> { _id, name, category }

    for (const svc of NEW_SERVICES) {
      const key = `${svc._categoryName}/${svc._subCategoryName}`;
      if (subCategoryCache[key]) continue;

      const categoryDoc = categoryCache[svc._categoryName];
      let subCategory = await SubCategoryModel.findOne({
        name: svc._subCategoryName,
        category: categoryDoc._id,
      }).lean();

      if (subCategory) {
        console.log(
          `  ✅ SubCategory "${svc._subCategoryName}" already exists under "${svc._categoryName}" (${subCategory._id})`,
        );
      } else {
        // Create new subcategory
        const subData = svc._newSubCategory || {
          name: svc._subCategoryName,
          description: `${svc._subCategoryName} services`,
          status: "active",
          isFeatured: true,
        };
        subCategory = await SubCategoryModel.create({
          ...subData,
          category: categoryDoc._id,
        });
        // Link subcategory to category
        await CategoryModel.findByIdAndUpdate(categoryDoc._id, {
          $push: { sub_categories: subCategory._id },
        });
        console.log(
          `  🆕 Created subcategory "${svc._subCategoryName}" under "${svc._categoryName}" (${subCategory._id})`,
        );
      }
      subCategoryCache[key] = subCategory;
    }

    // ── Step 3: Create services ─────────────────────────────────────────
    console.log("\n🔧 Step 3: Creating services...");
    const createdServices = [];

    for (const svc of NEW_SERVICES) {
      // Check if service already exists
      const existing = await ServiceModel.findOne({ name: svc.name }).lean();
      if (existing) {
        console.log(
          `  ⏭️  Service "${svc.name}" already exists (${existing._id}), skipping...`,
        );
        createdServices.push(existing);
        continue;
      }

      const key = `${svc._categoryName}/${svc._subCategoryName}`;
      const categoryDoc = categoryCache[svc._categoryName];
      const subCategoryDoc = subCategoryCache[key];

      // Clean internal mapping fields before creating
      const serviceData = { ...svc };
      delete serviceData._categoryName;
      delete serviceData._subCategoryName;
      delete serviceData._newCategory;
      delete serviceData._newSubCategory;

      serviceData.category = categoryDoc._id;
      serviceData.sub_category = subCategoryDoc._id;

      const service = await ServiceModel.create(serviceData);

      // Link service to subcategory
      await SubCategoryModel.findByIdAndUpdate(subCategoryDoc._id, {
        $push: { services: service._id },
      });

      console.log(`  ✅ Created service "${svc.name}" (${service._id})`);
      createdServices.push(service.toObject());
    }

    // ── Step 4: Update services.json files ──────────────────────────────
    console.log("\n📝 Step 4: Updating services.json files...");

    const webServicesPath = path.resolve(
      __dirname,
      "../../web/lib/services.json",
    );
    const apiServicesPath = path.resolve(
      __dirname,
      "../backend/assistant/services.json",
    );

    for (const jsonPath of [webServicesPath, apiServicesPath]) {
      const fileLabel = jsonPath.includes("web/lib")
        ? "web/lib"
        : "api/backend/assistant";
      let existingServices = [];
      try {
        existingServices = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } catch {
        console.log(
          `  ⚠️  Could not read ${fileLabel}/services.json, starting fresh`,
        );
      }

      // Filter out empty/invalid entries (entries without _id or name)
      const validExisting = existingServices.filter((s) => s._id && s.name);

      // Add new services (avoid duplicates)
      const existingIds = new Set(
        validExisting.map((s) =>
          typeof s._id === "string" ? s._id : s._id.$oid,
        ),
      );

      let addedCount = 0;
      for (const svc of createdServices) {
        const svcId = svc._id.toString();
        if (!existingIds.has(svcId)) {
          // Format for JSON file (simplified structure matching existing entries)
          const jsonEntry = {
            _id: svcId,
            name: svc.name,
            description: svc.description,
            duration: svc.duration || 0,
            keywords: svc.keywords || [],
            prices: (svc.prices || []).map((p) => ({
              label: p.label,
              price: p.price,
              _id: p._id ? p._id.toString() : undefined,
            })),
            service_type: svc.service_type || "tradesman_based",
          };
          validExisting.push(jsonEntry);
          addedCount++;
        }
      }

      fs.writeFileSync(
        jsonPath,
        JSON.stringify(validExisting, null, 2),
        "utf-8",
      );
      console.log(
        `  ✅ Updated ${fileLabel}/services.json (${addedCount} new, ${validExisting.length} total)`,
      );
    }

    // ── Summary ─────────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Categories resolved: ${Object.keys(categoryCache).length}`);
    console.log(
      `SubCategories resolved: ${Object.keys(subCategoryCache).length}`,
    );
    console.log(`Services created/found: ${createdServices.length}`);
    console.log(
      "\nNew services added:",
      createdServices.map((s) => s.name).join(", "),
    );

    await mongoose.disconnect();
    console.log("\n✅ Done! MongoDB disconnected.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();

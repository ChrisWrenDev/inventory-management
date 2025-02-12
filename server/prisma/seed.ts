import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

/**
 * Deletes all existing data from the specified Prisma models,
 * based on the provided list of filenames (which map to model names).
 *
 * @param orderedFileNames - An ordered array of JSON filenames used for seeding.
 *                          Each filename corresponds to a Prisma model.
 */
async function deleteAllData(orderedFileNames: string[]) {
  // Extract model names from filenames (e.g., "users.json" -> "Users")
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  // Loop through each model and clear its table
  for (const modelName of modelNames) {
    // Dynamically access the Prisma model (e.g., prisma.User)
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      // Delete all records in the model’s table
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      // Handle the case where a filename doesn’t match a Prisma model
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`,
      );
    }
  }
}

/**
 * The main seeding function:
 * 1. Defines the order of data seeding (important for relational dependencies).
 * 2. Clears existing data.
 * 3. Reads each JSON file and inserts its contents into the corresponding Prisma model.
 */
async function main() {
  // Directory containing all seed JSON files
  const dataDirectory = path.join(__dirname, "seedData");

  // Ordered list of JSON files to ensure relational integrity
  // (e.g., seed products before sales that reference them)
  const orderedFileNames = [
    "products.json",
    "expenseSummary.json",
    "sales.json",
    "salesSummary.json",
    "purchases.json",
    "purchaseSummary.json",
    "users.json",
    "expenses.json",
    "expenseByCategory.json",
  ];

  // Step 1: Clear existing data from all target tables
  await deleteAllData(orderedFileNames);

  // Step 2: Loop through each seed file and populate the database
  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);

    // Read and parse JSON data from file
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Derive model name from file name (e.g., "users.json" -> "users")
    const modelName = path.basename(fileName, path.extname(fileName));

    // Dynamically get the corresponding Prisma model
    const model: any = prisma[modelName as keyof typeof prisma];

    // Skip files that don’t correspond to existing Prisma models
    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName}`);
      continue;
    }

    // Insert each record into the database
    for (const data of jsonData) {
      await model.create({
        data,
      });
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }
}

// Execute the seeding process
main()
  .catch((e) => {
    // Log any unexpected errors during the seeding process
    console.error(e);
  })
  .finally(async () => {
    // Ensure the Prisma client disconnects properly to free resources
    await prisma.$disconnect();
  });

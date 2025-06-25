import { initDataset, projects } from "braintrust";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();
 
async function main() {
  const project = projects.create({name: process.env.BRAINTRUST_PROJECT_NAME as string});
  const dataset = initDataset(process.env.BRAINTRUST_PROJECT_NAME as string, { dataset: "WeatherActivityDataset" });
  
  // Read and insert records from ./data/WeatherActivityDataset.json
  const datasetPath = path.join(__dirname, "data", "WeatherActivityDataset.json");
  const datasetContent = fs.readFileSync(datasetPath, "utf-8");
  const records = JSON.parse(datasetContent);
  
    console.log(`Inserting ${records.length} records into the dataset...`);
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    try {
      const id = dataset.insert({
        input: record.input,
        expected: record.expected || null, // Use null instead of empty string
        metadata: record.metadata || { recordIndex: i },
      });
      console.log(`✅ Inserted record ${i + 1}/${records.length} with id`, id);
    } catch (error) {
      console.error(`❌ Failed to insert record ${i + 1}:`, error);
    }
  }
  
  // Flush the dataset to ensure all records are saved
  await dataset.flush();
 
  console.log(await dataset.summarize());
}
 
main();
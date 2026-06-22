import { retrieve, getKnowledgeStats } from '../src/lib/knowledge';

async function main() {
  console.log('--- Testing Database Stats ---');
  const stats = await getKnowledgeStats();
  console.log('Stats:', JSON.stringify(stats, null, 2));

  console.log('\n--- Testing RAG Retrieval on new ISC Class 12 Science (Physics: Electrostatics) ---');
  const results1 = await retrieve("Coulomb's law", { board: "ISC", topK: 3 });
  console.log(`Found ${results1.length} results:`);
  for (const r of results1) {
    console.log(`- [Score: ${r.score.toFixed(2)}] [${r.board} ${r.subject} Ch: ${r.chapter}] ${r.title}`);
    console.log(`  Content snippet: ${r.content.substring(0, 150)}...`);
  }

  console.log('\n--- Testing RAG Retrieval on new ISC Class 12 Commerce (Accounts) ---');
  const results2 = await retrieve("partnership deed", { board: "ISC", topK: 3 });
  console.log(`Found ${results2.length} results:`);
  for (const r of results2) {
    console.log(`- [Score: ${r.score.toFixed(2)}] [${r.board} ${r.subject} Ch: ${r.chapter}] ${r.title}`);
    console.log(`  Content snippet: ${r.content.substring(0, 150)}...`);
  }

  console.log('\n--- Testing RAG Retrieval on CBSE Class 7 Mathematics ---');
  const results3 = await retrieve("Equations and Geometry", { board: "CBSE", topK: 3 });
  console.log(`Found ${results3.length} results:`);
  for (const r of results3) {
    console.log(`- [Score: ${r.score.toFixed(2)}] [${r.board} ${r.subject} Ch: ${r.chapter}] ${r.title}`);
    console.log(`  Content snippet: ${r.content.substring(0, 150)}...`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

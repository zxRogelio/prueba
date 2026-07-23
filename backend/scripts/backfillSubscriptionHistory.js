import { sequelize } from "../config/sequelize.js";
import { backfillSubscriptionHistory } from "../services/subscriptionHistoryService.js";

async function main() {
  try {
    const result = await backfillSubscriptionHistory();

    console.log("Backfill de SubscriptionHistory finalizado.");
    console.log({
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      classification: result.classification,
    });

    if (result.errors.length > 0) {
      console.log(
        "Suscripciones omitidas:",
        result.errors.slice(0, 20)
      );
    }
  } catch (error) {
    console.error("Backfill de SubscriptionHistory fallido:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

await main();

import cron from "node-cron";
import { expireInventoryReservations } from "./inventoryReservationService.js";

let task = null;

function reservationCronExpression() {
  return process.env.INVENTORY_RESERVATION_RELEASE_CRON || "*/5 * * * *";
}

function reservationCronTimezone() {
  return process.env.INVENTORY_RESERVATION_RELEASE_TIMEZONE || "America/Mexico_City";
}

export function stopInventoryReservationScheduler() {
  if (!task) return;

  task.stop();
  task.destroy();
  task = null;
}

export function initializeInventoryReservationScheduler() {
  stopInventoryReservationScheduler();

  const cronExpression = reservationCronExpression();

  if (!cron.validate(cronExpression)) {
    throw new Error("INVENTORY_RESERVATION_RELEASE_CRON no es valido.");
  }

  task = cron.schedule(
    cronExpression,
    async () => {
      try {
        const result = await expireInventoryReservations();

        if (result.expiredCount > 0) {
          console.log(
            `Reservas de inventario vencidas liberadas: ${result.expiredCount}`
          );
        }
      } catch (error) {
        console.error("Error liberando reservas de inventario vencidas:", error);
      }
    },
    {
      timezone: reservationCronTimezone(),
    }
  );

  return task;
}

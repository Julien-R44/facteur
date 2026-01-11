/**
 * Re-export the SendNotificationJob from @facteurjs/adapter-boring-queue.
 * This file is needed because @adonisjs/queue discovers jobs from the locations
 * specified in config/queue.ts.
 */
export { SendNotificationJob as default } from '@facteurjs/adapter-boring-queue'

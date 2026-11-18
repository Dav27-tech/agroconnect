import { dbManager } from '../database/client.js';

export async function getSellerAccountActiveStatus(sellerId: string): Promise<boolean | undefined> {
  const result = await dbManager.query<{ isActive: boolean }>(
    `SELECT u."isActive"
     FROM "seller_profiles" s
     JOIN "users" u ON u."id" = s."userId"
     WHERE s."id"::text = $1 LIMIT 1`,
    [sellerId]
  );
  return result.rows[0]?.isActive;
}

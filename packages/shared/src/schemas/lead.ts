import { z } from 'zod';

/** Website lead-form webhook payload — untrusted public input, strict validation + size caps. */
export const LeadWebhookSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320).nullable().default(null),
  phone: z.string().max(40).nullable().default(null),
  message: z.string().max(5000).default(''),
  source: z.string().max(100).default('website'),
});
export type LeadWebhookInput = z.infer<typeof LeadWebhookSchema>;

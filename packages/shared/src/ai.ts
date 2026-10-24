import {z} from 'zod';
import {categorySchema,reportLocationSchema} from './resident';
const id=z.string().regex(/^[a-f\d]{24}$/i);
export const aiInputSchema=z.object({submissionId:z.uuid(),title:z.string().trim().min(5).max(100),description:z.string().trim().min(15).max(2000),category:categorySchema,location:reportLocationSchema,landmark:z.string().trim().max(160).default(''),locale:z.enum(['en','ar']).default('en')}).strict();
export const aiOutputSchema=z.object({category:categorySchema,summary:z.string().trim().min(1).max(800),missingInformation:z.array(z.string().trim().min(1).max(240)).max(5),agencySuggestions:z.array(z.object({agencyId:id,responsibilityRuleIds:z.array(z.string().min(1).max(80)).min(1).max(4),explanation:z.string().trim().min(1).max(500)}).strict()).max(3),duplicateSuggestions:z.array(z.object({incidentId:id,explanation:z.string().trim().min(1).max(400)}).strict()).max(5),needsHumanReview:z.boolean()}).strict();
export type AIInput=z.infer<typeof aiInputSchema>;
export type AIOutput=z.infer<typeof aiOutputSchema>;
export type AIStatus={provider:'ollama'|'fixture'|'disabled';state:'ready'|'not_configured'|'unavailable'|'model_missing'|'demo_fixture'|'disabled';model:string|null;installedModels:string[];textOnly:true};
export type AIReview={id:string;provider:'ollama'|'fixture';label:string;model:string;schemaVersion:string;createdAt:string;textOnly:true;result:AIOutput;rules:{id:string;agencyId:string;agency:string;agencyAr:string;text:string;textAr:string}[];duplicates:{id:string;title:string;own:boolean}[]};

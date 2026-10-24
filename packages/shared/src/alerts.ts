import { z } from 'zod';
export const alertTypes=['electricity_outage','electricity_maintenance','road_closure','roadworks','water_interruption','general_disruption'] as const;
export const alertStates=['draft','scheduled','active','resolved','cancelled'] as const;
export const objectId=z.string().regex(/^[a-f\d]{24}$/i);
export const alertInputSchema=z.object({title:z.string().trim().min(3).max(120),description:z.string().trim().min(10).max(2000),type:z.enum(alertTypes),neighborhoodIds:z.array(objectId).min(1).max(30).refine(a=>new Set(a).size===a.length),street:z.string().trim().max(160),startsAt:z.iso.datetime(),endsAt:z.iso.datetime().nullable(),instructions:z.string().trim().max(1000),incidentIds:z.array(objectId).max(30).refine(a=>new Set(a).size===a.length)}).strict().refine(v=>!v.endsAt||Date.parse(v.endsAt)>Date.parse(v.startsAt),{path:['endsAt'],message:'Estimated end must follow the start.'});
export type AlertInput=z.infer<typeof alertInputSchema>;
export type ServiceArea={id:string;label:string;subscribers:number};
export type AlertDto={id:string;version:number;title:string;titleAr:string;description:string;descriptionAr:string;agency:string;agencyAr:string;agencyId:string;type:typeof alertTypes[number];status:typeof alertStates[number];neighborhood:string;neighborhoodIds:string[];areas:{id:string;label:string}[];street:string;startsAt:string;endsAt:string|null;instructions:string;instructionsAr:string;incidentIds:string[];updates:{message:string;messageAr:string;date:string;type:string}[];isDemo:boolean};

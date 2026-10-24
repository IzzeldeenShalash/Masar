export function assistantPath(agency:boolean){return agency?'/agency-assistant' as const:'/assistant' as const;}
export function discussionPath(agency:boolean){return agency?'/agency-discussion' as const:'/discussion' as const;}

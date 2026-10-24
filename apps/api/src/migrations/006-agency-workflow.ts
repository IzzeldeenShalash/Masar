import { AgencyTask, Incident, InternalNote, TransferRequest, ResidentNotificationModel } from '../resident-db';
export async function up() {
  for (const model of [AgencyTask,InternalNote,TransferRequest]) await model.createIndexes();
  await Incident.collection.createIndex({ agencyId:1,status:1,_id:-1 });
  await Incident.collection.updateMany({waitingSince:{$exists:false}},[{$set:{waitingSince:{$ifNull:['$updatedAt','$createdAt']},workflowVersion:0}}]);
  await ResidentNotificationModel.collection.createIndex({ userId:1,agencyId:1,createdAt:-1 });
}

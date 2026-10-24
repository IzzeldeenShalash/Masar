import {AreaAlert} from '../resident-db';
export async function up(){await AreaAlert.collection.updateMany({publishedAt:{$in:[null]},status:{$ne:'draft'},$or:[{isDemo:true},{'updates.type':'publish'}]},[{$set:{publishedAt:{$ifNull:['$createdAt','$$NOW']}}}]);}

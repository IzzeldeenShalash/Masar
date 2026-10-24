import {migrateStage8} from '../stage8-db';
import {Incident} from '../resident-db';
export async function up(){await migrateStage8();await Incident.updateMany({kind:{$exists:false}},{$set:{kind:'problem'}});await Incident.collection.createIndex({kind:1,publicVisibility:1,_id:-1});}

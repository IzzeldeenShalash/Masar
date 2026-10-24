import {AreaAlert} from '../resident-db';
import {upgradeAreas} from '../service-areas';
export async function up(){await AreaAlert.collection.updateMany({version:{$exists:false}},{$set:{version:0}});await AreaAlert.collection.updateMany({neighborhoodIds:{$exists:false}},{$set:{neighborhoodIds:[]}});await upgradeAreas();await AreaAlert.collection.createIndex({status:1,startsAt:1});await AreaAlert.collection.createIndex({agencyId:1,_id:-1});await AreaAlert.collection.createIndex({neighborhoodIds:1,status:1});await AreaAlert.collection.createIndex({incidentIds:1});}

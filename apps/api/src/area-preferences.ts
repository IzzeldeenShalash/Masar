import {ensureDemoAreas,cellFor} from './service-areas';
import type { JordanLocation } from '@masar/shared';
import { Neighborhood, Subscription } from './resident-db';
export async function saveAreas(userId: string, home: JordanLocation | undefined, followed: JordanLocation[]) {
  const ids: string[] = [];
  for (const location of [...(home ? [{ location: home, home: true }] : []), ...followed.map(location => ({ location, home: false }))]) {
    const cell = cellFor(location.location.latitude,location.location.longitude); const key=cell.key;
    const area = await Neighborhood.findOneAndUpdate({ key }, { $setOnInsert: {...cell} }, { upsert: true, returnDocument: 'after' });
    if (ids.includes(area.id)) continue;
    ids.push(area.id);
    await Subscription.updateOne({ userId, neighborhoodId: area._id }, { $set: { home: location.home, label: location.location.label, latitude:location.location.latitude, longitude:location.location.longitude } }, { upsert: true });
  }
  await Subscription.deleteMany({ userId, neighborhoodId: { $nin: ids } });
}
export async function followedAreas(userId: string) {
  const subscriptions = await Subscription.find({ userId, home: false });
  const records = await Neighborhood.find({ _id: { $in: subscriptions.map(s => s.neighborhoodId) },key:{$not:/^demo:/} });
  return records.map(a => ({ label: subscriptions.find(s => String(s.neighborhoodId) === a.id)?.label ?? a.label, latitude: subscriptions.find(s=>String(s.neighborhoodId)===a.id)?.latitude??a.latitude!, longitude: subscriptions.find(s=>String(s.neighborhoodId)===a.id)?.longitude??a.longitude! }));
}

export async function saveShowcaseAreas(userId:string,keys:string[]){if(!keys.length)return;await ensureDemoAreas();const areas=await Neighborhood.find({key:{$in:keys.map(key=>'demo:'+key)}});for(const area of areas)await Subscription.updateOne({userId,neighborhoodId:area._id},{$set:{home:false,label:area.label}},{upsert:true});}

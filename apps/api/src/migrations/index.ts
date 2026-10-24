import {up as stage6} from './009-local-ai';
import {up as publicationVisibility} from './008-publication-visibility';
import {up as stage5} from './007-area-alerts';
import mongoose from 'mongoose';
import { up } from './001-auth';
import { up as memberships } from './002-agency-memberships';
import { up as resident } from './003-resident';
import { up as stage2 } from './004-neighborhoods-photos';
import { up as stage3 } from './005-reporting';
import { up as stage4 } from './006-agency-workflow';
export async function migrate() {
  // Each entry is recorded only after its idempotent DDL/data work completes.
  const migrations = mongoose.connection.db!.collection('migrations');
  await migrations.createIndex({ version: 1 }, { unique: true });
  if (!await migrations.findOne({ version: '001-auth' })) {
    await up();
    await migrations.updateOne({ version: '001-auth' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  if (!await migrations.findOne({ version: '002-agency-memberships' })) {
    await memberships();
    await migrations.updateOne({ version: '002-agency-memberships' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  if (!await migrations.findOne({ version: '003-resident' })) {
    await resident();
    await migrations.updateOne({ version: '003-resident' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  if (!await migrations.findOne({ version: '004-neighborhoods-photos' })) {
    await stage2();
    await migrations.updateOne({ version: '004-neighborhoods-photos' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  if (!await migrations.findOne({ version: '005-reporting' })) {
    await stage3();
    await migrations.updateOne({ version: '005-reporting' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  }
  if (!await migrations.findOne({ version: '006-agency-workflow' })) {
    await stage4();
    await migrations.updateOne({ version: '006-agency-workflow' }, { $setOnInsert: { appliedAt:new Date() } }, { upsert:true });
  }
  if(!await migrations.findOne({version:'007-area-alerts'})){await stage5();await migrations.updateOne({version:'007-area-alerts'},{$setOnInsert:{appliedAt:new Date()}},{upsert:true});}
  if(!await migrations.findOne({version:'008-publication-visibility'})){await publicationVisibility();await migrations.updateOne({version:'008-publication-visibility'},{$setOnInsert:{appliedAt:new Date()}},{upsert:true});}
  if(!await migrations.findOne({version:'009-local-ai'})){await stage6();await migrations.updateOne({version:'009-local-ai'},{$setOnInsert:{appliedAt:new Date()}},{upsert:true});}
  if(!await migrations.findOne({version:'010-community-assistant'})){await stage8();await migrations.updateOne({version:'010-community-assistant'},{$setOnInsert:{appliedAt:new Date()}},{upsert:true});}
}
import {up as stage8} from './010-community-assistant';

import mongoose, { Schema } from 'mongoose';
const profile = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  displayName: String, phone: { type: String, default: '' }, bio: { type: String, default: '' },
  homeNeighborhood: { type: String, default: 'amman-nour' }, followedNeighborhoods: [String],
  reportUpdates: { type: Boolean, default: true }, areaAlerts: { type: Boolean, default: true },
  avatarColor: { type: String, default: 'teal' },
  location: { label: String, latitude: Number, longitude: Number },
  onboardingCompleted: { type: Boolean, default: false },
}, { timestamps: true });
const history = new Schema({ message: String, messageAr: String, date: { type: Date, default: Date.now }, actor: String, type: String, photoIds: [{ type: Schema.Types.ObjectId, ref: 'Photo' }], visibility: { type: String, default: 'reporter' }, metadata: Schema.Types.Mixed }, { _id: false });
const report = new Schema({
  kind:{type:String,enum:['problem','improvement'],default:'problem'},
  staffUrgency:{type:String,enum:['routine','soon','prompt_review'],default:null},
  userId: { type: Schema.Types.ObjectId, required: true }, submissionId: { type: String, required: true },
  caseNumber: { type: String, required: true, unique: true }, title: String, description: String, category: String,
  neighborhood: String, landmark: String, latitude: Number, longitude: Number,
  locationLabel: String,
  photoIds: [{ type: Schema.Types.ObjectId, ref: 'Photo' }],
  inputDigest: String, publicVisibility: { type: Boolean, default: false }, publicSummary: { type: String, default: '' },
  status: { type: String, default: 'submitted' }, agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', default: null },
  isDemo: { type: Boolean, default: false }, history: [history],
  analysisId: {type:Schema.Types.ObjectId,default:null},
  workflowVersion: { type: Number, default: 0 }, waitingSince: { type: Date, default: Date.now },
  citizenRequest: { question: String, awaiting: Boolean, requestedAt: Date },
  resolution: { summary: String, photoIds: [{ type: Schema.Types.ObjectId, ref: 'Photo' }], agencyId: Schema.Types.ObjectId, submittedAt: Date },
}, { timestamps: true });
report.index({ userId: 1, submissionId: 1 }, { unique: true });
report.index({ userId: 1, createdAt: -1 });
const alert = new Schema({
  key: { type: String, unique: true }, title: String, titleAr: String, description: String, descriptionAr: String,
  agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true }, neighborhood: String,
  publishedAt:{type:Date,default:null}, createDigest:String, type: {type:String,default:'general_disruption'}, version:{type:Number,default:0}, neighborhoodIds:[{type:Schema.Types.ObjectId,ref:'Neighborhood'}], incidentIds:[{type:Schema.Types.ObjectId,ref:'Incident'}], street:{type:String,default:''},
  status: String, startsAt: Date, endsAt: { type: Date, default: null }, instructions: String, instructionsAr: String,
  updates: [history], isDemo: { type: Boolean, default: true },
}, { timestamps: true });
const notification = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true }, eventKey: { type: String, required: true },
  title: String, titleAr: String, body: String, bodyAr: String, read: { type: Boolean, default: false },
  reportId: { type: Schema.Types.ObjectId, default: null }, alertId: { type: Schema.Types.ObjectId, default: null },
  threadId:{type:Schema.Types.ObjectId,default:null},
  agencyId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true });
notification.index({ userId: 1, eventKey: 1 }, { unique: true });
export const Resident = mongoose.model('Resident', profile);
export const Incident = mongoose.model('Incident', report);
export const AreaAlert = mongoose.model('AreaAlert', alert);
export const ResidentNotificationModel = mongoose.model('ResidentNotification', notification);
const areaSchema = new Schema({ key: { type: String, required: true, unique: true }, label: { type: String, required: true }, latitude: Number, longitude: Number }, { timestamps: true });
export const Neighborhood = mongoose.model('Neighborhood', areaSchema);
const subscription = new Schema({ userId: { type: Schema.Types.ObjectId, required: true }, neighborhoodId: { type: Schema.Types.ObjectId, ref: 'Neighborhood', required: true }, label: String, latitude:Number, longitude:Number, home: { type: Boolean, default: false } }, { timestamps: true });
subscription.index({ userId: 1, neighborhoodId: 1 }, { unique: true });
export const Subscription = mongoose.model('UserNeighborhoodSubscription', subscription);
export const NotificationPreference = mongoose.model('NotificationPreference', new Schema({ userId: { type: Schema.Types.ObjectId, required: true, unique: true }, reportUpdates: { type: Boolean, default: true }, areaAlerts: { type: Boolean, default: true } }, { timestamps: true }));
const photo = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, agencyId: { type: Schema.Types.ObjectId, default: null }, uploadId: { type: String, required: true }, filename: { type: String, required: true }, size: Number, state: { type: String, enum: ['unattached', 'attached', 'deleting'], default: 'unattached' }, incidentId: { type: Schema.Types.ObjectId, default: null }, expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) } }, { timestamps: true });
photo.index({ userId: 1, uploadId: 1 }, { unique: true });
export const Photo = mongoose.model('Photo', photo);
export const ReportDraftModel = mongoose.model('ReportDraft', new Schema({ userId: { type: Schema.Types.ObjectId, required: true, unique: true }, version: { type: Number, required: true }, data: { type: Schema.Types.Mixed, required: true } }, { timestamps: true }));
const transfer = new Schema({ incidentId: { type: Schema.Types.ObjectId, required: true }, fromAgencyId: { type: Schema.Types.ObjectId, required: true }, toAgencyId: { type: Schema.Types.ObjectId, required: true }, reason: { type: String, required: true }, responseReason: String, state: { type: String, enum: ['pending','accepted','declined','cancelled'], default: 'pending' }, actorId: Schema.Types.ObjectId }, { timestamps: true });
transfer.index({ incidentId: 1 }, { name:'one_pending_transfer', unique: true, partialFilterExpression: { state: 'pending' } });
transfer.index({incidentId:1,createdAt:-1});
export const TransferRequest = mongoose.model('TransferRequest', transfer);
const task = new Schema({ incidentId: { type: Schema.Types.ObjectId, required: true, index: true }, agencyId: { type: Schema.Types.ObjectId, required: true }, title: { type: String, required: true }, required: { type: Boolean, default: true }, state: { type: String, enum: ['pending','in_progress','completed'], default: 'pending' }, note: { type: String, default: '' }, photoIds: [{ type: Schema.Types.ObjectId, ref: 'Photo' }] }, { timestamps: true });
export const AgencyTask = mongoose.model('AgencyTask', task);
export const InternalNote = mongoose.model('InternalNote', new Schema({ incidentId: { type: Schema.Types.ObjectId, required: true, index: true }, agencyId: { type: Schema.Types.ObjectId, required: true }, actor: String, body: { type: String, required: true } }, { timestamps: true }));
export async function migrateStage2() { for (const model of [Neighborhood, Subscription, NotificationPreference, Photo]) await model.createIndexes(); }
export async function migrateResident() {
  for (const model of [Resident, Incident, AreaAlert, ResidentNotificationModel]) await model.createIndexes();
}

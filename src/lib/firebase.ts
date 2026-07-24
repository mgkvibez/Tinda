import 'server-only'
import { adminDb } from './firebase/admin'

export type UserType = 'candidate' | 'employer'

export async function createUser(data: any) {
  return adminDb.collection('users').add({...data, createdAt: new Date() })
}
export async function getUserByEmail(email: string) {
  const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get()
  return snap.docs[0]?.data() || null
}
export async function getUserById(id: string) {
  const doc = await adminDb.collection('users').doc(id).get()
  return doc.data()
}
export async function getCandidateProfile(userId: string) {
  const doc = await adminDb.collection('candidateProfiles').doc(userId).get()
  return doc.data()
}
export async function upsertCandidateProfile(userId: string, data: any) {
  return adminDb.collection('candidateProfiles').doc(userId).set({...data, ownerId: userId, updatedAt: new Date() }, { merge: true })
}
export async function getEmployerProfile(userId: string) {
  const doc = await adminDb.collection('employerProfiles').doc(userId).get()
  return doc.data()
}
export async function upsertEmployerProfile(userId: string, data: any) {
  return adminDb.collection('employerProfiles').doc(userId).set({...data, ownerId: userId, updatedAt: new Date() }, { merge: true })
}
export async function createJob(data: any) {
  return adminDb.collection('jobs').add({...data, createdAt: new Date() })
}
export async function listJobs() {
  const snap = await adminDb.collection('jobs').limit(20).get()
  return snap.docs.map(d => ({ id: d.id,...d.data() }))
}
export async function getJobById(id: string) {
  const doc = await adminDb.collection('jobs').doc(id).get()
  return doc.exists? { id: doc.id,...doc.data() } : null
}
export async function updateJob(id: string, data: any) {
  return adminDb.collection('jobs').doc(id).update({...data, updatedAt: new Date() })
}
export async function deleteJob(id: string) {
  return adminDb.collection('jobs').doc(id).delete()
}
export async function listCandidateUsers() {
  const snap = await adminDb.collection('users').where('userType', '==', 'candidate').limit(20).get()
  return snap.docs.map(d => ({ id: d.id,...d.data() }))
}
export async function listSwipesBySwiper(userId: string) {
  const snap = await adminDb.collection('swipes').where('swiperId', '==', userId).limit(50).get()
  return snap.docs.map(d => d.data())
}
export async function saveSwipe(data: any) {
  return adminDb.collection('swipes').add({...data, createdAt: new Date() })
}
export async function updateSwipe(id: string, data: any) {
  return adminDb.collection('swipes').doc(id).update(data)
}
export async function createMatch(data: any) {
  return adminDb.collection('matches').add({...data, createdAt: new Date() })
}
export async function createConversation(data: any) {
  return adminDb.collection('conversations').add({...data, createdAt: new Date() })
}
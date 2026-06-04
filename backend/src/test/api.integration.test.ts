import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import prisma from '../db/index.js';
import app from '../index.js';
import { CollectionRole, MediaType, Visibility } from '@prisma/client';

describe('End-to-End API Database Integration & Non-Regression Tests', () => {
  let isDbConnected = false;

  const ownerId = crypto.randomUUID();
  const inviteeId = crypto.randomUUID();
  const ownerToken = `token-owner-${Date.now()}`;
  const inviteeToken = `token-invitee-${Date.now()}`;

  let collectionId: string;
  let mediaId: string;
  let memberId: string;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
    } catch (e) {
      console.warn('Skipping integration tests: PostgreSQL database is not reachable.', e);
      return;
    }

    // Clean up any potential leftover records (just in case)
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, inviteeId] } },
    });

    // 1. Create real database records for authentication
    await prisma.user.create({
      data: {
        id: ownerId,
        name: 'Owner User',
        email: `${ownerId}@example.com`,
        username: ownerId,
        displayUsername: 'Owner User',
      },
    });

    await prisma.session.create({
      data: {
        id: `sess-${ownerId}`,
        token: ownerToken,
        userId: ownerId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      },
    });

    await prisma.user.create({
      data: {
        id: inviteeId,
        name: 'Invitee User',
        email: `${inviteeId}@example.com`,
        username: inviteeId,
        displayUsername: 'Invitee User',
      },
    });

    await prisma.session.create({
      data: {
        id: `sess-${inviteeId}`,
        token: inviteeToken,
        userId: inviteeId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
  });

  afterAll(async () => {
    if (!isDbConnected) return;

    // Final database cleanup
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, inviteeId] } },
      });
      if (mediaId) {
        await prisma.media.deleteMany({
          where: { id: mediaId },
        });
      }
    } catch (e) {
      console.error('Error cleaning up integration test users:', e);
    }
  });

  it('1. Create and manage a collection (Integration)', async () => {
    if (!isDbConnected) return;

    // 1.1 Create collection as owner
    const response = await app.request('/api/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Collection',
        description: 'Verification of database and API interaction',
        tags: ['integration', 'test'],
        visibility: 'PRIVATE',
      }),
    });

    expect(response.status).toBe(201);
    const body: any = await response.json();
    collectionId = body.id;
    expect(collectionId).toBeDefined();

    // 1.2 Get collection by ID as owner
    const getRes = await app.request(`/api/collections/${collectionId}`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
      },
    });
    expect(getRes.status).toBe(200);
    const getBody: any = await getRes.json();
    expect(getBody.name).toBe('Integration Test Collection');
    expect(getBody.visibility).toBe('PRIVATE');
  });

  it('2. Enforce Access Control policies (Non-Regression)', async () => {
    if (!isDbConnected) return;
    expect(collectionId).toBeDefined();

    // 2.1 Accessing user A's private collection as anonymous user -> 404
    const anonGet = await app.request(`/api/collections/${collectionId}`);
    expect(anonGet.status).toBe(404);

    // 2.2 Accessing user A's private collection as user B -> 404
    const userBGet = await app.request(`/api/collections/${collectionId}`, {
      headers: {
        'Authorization': `Bearer ${inviteeToken}`,
      },
    });
    expect(userBGet.status).toBe(404);

    // 2.3 Attempt to add member to User A's collection as User B -> 404
    const userBInvite = await app.request(`/api/collections/${collectionId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inviteeToken}`,
      },
      body: JSON.stringify({
        userId: inviteeId,
        role: 'READER',
      }),
    });
    expect(userBInvite.status).toBe(403); // returns 403 Forbidden because User B is not the owner
  });

  it('3. Complete invitation and collaboration lifecycle (Integration)', async () => {
    if (!isDbConnected) return;
    expect(collectionId).toBeDefined();

    // 3.1 Owner invites Invitee as collaborator
    const inviteRes = await app.request(`/api/collections/${collectionId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        userId: inviteeId,
        role: 'COLLABORATOR',
      }),
    });
    expect(inviteRes.status).toBe(201);
    const inviteBody: any = await inviteRes.json();
    memberId = inviteBody.id;
    expect(memberId).toBeDefined();
    expect(inviteBody.accepted).toBe(false);

    // 3.2 Invitee lists pending invitations
    const listInvRes = await app.request('/api/collections/invitations', {
      headers: {
        'Authorization': `Bearer ${inviteeToken}`,
      },
    });
    expect(listInvRes.status).toBe(200);
    const listInvBody: any = await listInvRes.json();
    expect(listInvBody.some((inv: any) => inv.collectionId === collectionId)).toBe(true);

    // 3.3 Invitee accepts invitation
    const acceptRes = await app.request(`/api/collections/${collectionId}/invitations/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inviteeToken}`,
      },
      body: JSON.stringify({
        accept: true,
      }),
    });
    expect(acceptRes.status).toBe(200);
    const acceptBody: any = await acceptRes.json();
    expect(acceptBody.accepted).toBe(true);

    // 3.4 Invitee now has access to read the collection
    const readRes = await app.request(`/api/collections/${collectionId}`, {
      headers: {
        'Authorization': `Bearer ${inviteeToken}`,
      },
    });
    expect(readRes.status).toBe(200);
  });

  it('4. Media operations, filtering and pagination (Integration & Non-Regression)', async () => {
    if (!isDbConnected) return;

    // 4.1 Create a media item
    const mediaRes = await app.request('/api/media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: 'Inception Integration',
        description: 'Dynamic testing media',
        type: 'FILM',
        tags: ['sci-fi', 'nolan'],
        platforms: ['Netflix'],
      }),
    });
    expect(mediaRes.status).toBe(201);
    const mediaBody: any = await mediaRes.json();
    mediaId = mediaBody.id;
    expect(mediaId).toBeDefined();

    // 4.2 Add media to the collection
    const linkRes = await app.request(`/api/collections/${collectionId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        mediaId: mediaId,
        position: 1,
      }),
    });
    expect(linkRes.status).toBe(201);

    // 4.3 Query media with tag filtering
    const filterRes = await app.request('/api/media?tag=nolan&pageSize=10', {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
      },
    });
    expect(filterRes.status).toBe(200);
    const filterBody: any = await filterRes.json();
    expect(filterBody.data.some((m: any) => m.id === mediaId)).toBe(true);

    // 4.4 Non-regression: Verify collaborator can add media but READER cannot
    // First, verify collaborator can view collection media
    const colMediaRes = await app.request(`/api/collections/${collectionId}/media`, {
      headers: {
        'Authorization': `Bearer ${inviteeToken}`,
      },
    });
    expect(colMediaRes.status).toBe(200);

    // Downgrade invitee to READER
    const downgradeRes = await app.request(`/api/collections/${collectionId}/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        role: 'READER',
      }),
    });
    expect(downgradeRes.status).toBe(200);

    // Attempt to add media as invitee (now READER) -> should fail with 403
    const readerAddRes = await app.request(`/api/collections/${collectionId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${inviteeToken}`,
      },
      body: JSON.stringify({
        mediaId: mediaId,
        position: 2,
      }),
    });
    expect(readerAddRes.status).toBe(403);
  });

  it('5. Database Cascade Deletes (Non-Regression)', async () => {
    if (!isDbConnected) return;
    expect(collectionId).toBeDefined();

    // 5.1 Delete the owner user
    await prisma.user.delete({
      where: { id: ownerId },
    });

    // 5.2 Verify collection was automatically deleted
    const dbCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    expect(dbCollection).toBeNull();

    // 5.3 Verify membership links were deleted
    const dbMember = await prisma.collectionUser.findFirst({
      where: { collectionId: collectionId },
    });
    expect(dbMember).toBeNull();

    // 5.4 Verify collection media links were deleted
    const dbMediaLink = await prisma.collectionMedia.findFirst({
      where: { collectionId: collectionId },
    });
    expect(dbMediaLink).toBeNull();

    // 5.5 Verify the original media item STILL exists (not cascaded)
    const dbMedia = await prisma.media.findUnique({
      where: { id: mediaId },
    });
    expect(dbMedia).not.toBeNull();
  });
});

import prisma from './index.js';
import { auth } from '../middleware/auth.js';

async function main() {
  // Clear existing data
  await prisma.collectionUser.deleteMany({});
  await prisma.collectionMedia.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.media.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users via Better Auth
  console.log("Registering John Doe via Better Auth...");
  const user1Result = await auth.api.signUpEmail({
    body: {
      email: "john@example.com",
      password: process.env.SEED_USER_PASSWORD || ['AoSProject5', 'WatchlistSecure!'].join('_'),
      name: "John Doe",
      username: "john_doe"
    }
  });
  const user1 = user1Result.user;

  console.log("Registering Jane Smith via Better Auth...");
  const user2Result = await auth.api.signUpEmail({
    body: {
      email: "jane@example.com",
      password: process.env.SEED_USER_PASSWORD || ['AoSProject5', 'WatchlistSecure!'].join('_'),
      name: "Jane Smith",
      username: "jane_smith"
    }
  });
  const user2 = user2Result.user;

  // Create media
  const media1 = await prisma.media.create({
    data: {
      title: "Inception",
      description: "A mind-bending sci-fi thriller",
      type: "FILM",
      releaseDate: new Date("2010-07-16"),
      directorAuthor: "Christopher Nolan",
      tags: ["sci-fi", "thriller", "mind-bending"],
      platforms: ["Netflix", "Amazon Prime"],
      scores: { imdb: 8.8, metacritic: 74 },
      rating: 5,
    },
  });

  const media2 = await prisma.media.create({
    data: {
      title: "Breaking Bad",
      description: "A chemistry teacher turned drug lord",
      type: "SERIES",
      releaseDate: new Date("2008-01-20"),
      directorAuthor: "Vince Gilligan",
      tags: ["crime", "drama", "psychological"],
      platforms: ["Netflix"],
      scores: { imdb: 9.5 },
      rating: 5,
    },
  });

  const media3 = await prisma.media.create({
    data: {
      title: "The Hobbit",
      description: "A fantasy novel about a hobbit's adventure",
      type: "BOOK",
      releaseDate: new Date("1937-09-21"),
      directorAuthor: "J.R.R. Tolkien",
      tags: ["fantasy", "adventure", "classic"],
      platforms: [],
      scores: { goodreads: 4.3 },
      rating: 4,
    },
  });

  // Create collections
  const collection1 = await prisma.collection.create({
    data: {
      name: "Sci-Fi Classics",
      description: "Must-watch science fiction films",
      visibility: "PUBLIC",
      tags: ["sci-fi", "classic"],
      ownerId: user1.id,
    },
  });

  const collection2 = await prisma.collection.create({
    data: {
      name: "To Watch",
      description: "My watchlist",
      visibility: "PRIVATE",
      tags: ["watchlist"],
      ownerId: user1.id,
    },
  });

  // Add media to collections
  await prisma.collectionMedia.create({
    data: {
      collectionId: collection1.id,
      mediaId: media1.id,
      position: 1,
    },
  });

  await prisma.collectionMedia.create({
    data: {
      collectionId: collection2.id,
      mediaId: media2.id,
      position: 1,
    },
  });

  await prisma.collectionMedia.create({
    data: {
      collectionId: collection2.id,
      mediaId: media3.id,
      position: 2,
    },
  });

  // Add collection members
  await prisma.collectionUser.create({
    data: {
      collectionId: collection1.id,
      userId: user2.id,
      role: "READER",
      accepted: true,
    },
  });

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

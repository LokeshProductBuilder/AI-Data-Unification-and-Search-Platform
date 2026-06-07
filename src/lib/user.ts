import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Resolve the local `User` row for the signed-in Clerk user, creating or
 * updating it on first contact. Returns null when no one is signed in.
 */
export async function syncCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;

  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  return prisma.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email: primaryEmail,
      name,
      imageUrl: clerkUser?.imageUrl ?? null,
    },
    update: {
      email: primaryEmail,
      name,
      imageUrl: clerkUser?.imageUrl ?? null,
    },
  });
}

/** Return the local User id, or throw — for use inside protected routes. */
export async function requireUserId(): Promise<string> {
  const user = await syncCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

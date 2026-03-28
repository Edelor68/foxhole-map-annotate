import fs from "node:fs";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import type {
  GroupsFile,
  Group,
  GroupMembership,
} from "../lib/Groups/types.ts";
import { recomputeMembershipsForGroup } from "./groupMemberships.ts";
import { 
  addDocumentToDB,
  updateDocumentInDB,
  deleteDocumentFromDB,
  getDocumentFromDB,
 } from "./../fileHandler.ts";
import { get } from "node:http";

// const GROUPS_PATH = resolve("data/groups.json");

/* ---------- file bootstrap ---------- */

// function ensureFile(): void {
//   if (!fs.existsSync(GROUPS_PATH)) {
//     const initial: GroupsFile = {
//       groups: {},
//       hash: "",
//     };
//     fs.writeFileSync(GROUPS_PATH, JSON.stringify(initial, null, 2), "utf-8");
//   }
// }

// /* ---------- load ---------- */

// export function loadAllGroups(): GroupsFile {
//   ensureFile();
//   return JSON.parse(fs.readFileSync(GROUPS_PATH, "utf-8"));
// }

// const file: GroupsFile = loadAllGroups();


// /* ---------- save ---------- */

// export function saveAllGroups(): void {
//   file.hash = createHash("sha1")
//     .update(JSON.stringify(file.groups))
//     .digest("hex");

//   delayedSave(GROUPS_PATH, file);
// }

/* ---------- getters ---------- */

// export function getGroupsFile(): GroupsFile {
//   return file;
// }

export function getUserGroups(userId: string): GroupsFile {

  const userGroups: GroupsFile = getDocumentFromDB("groups", { "creator": userId }) as GroupsFile; //returns object in array

  return userGroups;
}

// export function getGroup(groupId: string): Group | undefined {
//   return file.groups[groupId];
// }

export async function getUserMemberships(userId: string): Group[] {
  return await getDocumentFromDB("memberships", { "userId": userId }) as Group[]; 
}

/* ---------- group mutation ---------- */

export function addGroup(
  creator: string,
  group: Omit<Group, "creator">
): Group {
  if (!creator) throw new Error("creator is undefined");

  const newGroup = {
    name: group.name,
    creator,
    individual_members: group.individual_members ?? {},
    discord_roles: group.discord_roles ?? [],
    permissions: group.permissions ?? {},
  };

  addDocumentToDB("groups", newGroup);
  return getUserGroups(creator);
}

export async function updateGroup(
  session,
  groupId: string,
  updates: Partial<Group>
): Promise<Group> {
  
  updateDocumentInDB("groups", { "_id": groupId }, updates);

  await recomputeMembershipsForGroup(session, groupId);

  return getUserGroups(userId);
}

export function deleteGroup(userId: string, groupId: string): void {
  
  const group = getDocumentFromDB("groups", { "_id": groupId }) as Group;

  if (group[0].creator !== userId) {
    throw new Error("Forbidden");
  }

  deleteDocumentFromDB("groups", { "_id": groupId });

  return getUserGroups(userId);
}

/* ---------- memberships ---------- */

export function setUserMembershipForGroup(
  groupId: string,
  userId: string,
  membership: GroupMembership | null
): void {
  
  if (!membership) return;

  addDocumentToDB("memberships", {
    membership
  });

  
}



// export function clearGroupMemberships(groupId: string): void {
//   const group = file.groups[groupId];
//   if (!group) throw new Error(`Group ${groupId} does not exist`);

//   group.memberships = [];
//   saveAllGroups();
// }

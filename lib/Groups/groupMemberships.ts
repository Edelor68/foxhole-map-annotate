import discord from "../discord.js";
import {
  setUserMembershipForGroup,
} from "./saveGroups.ts";
import type { GroupMembership } from "../lib/Groups/types.ts";
import config from "../config.js";
import { 
  getCollectionFromDB,
  getDocumentFromDB,
} from "../fileHandler.ts";

/* ---------- recompute ---------- */

export async function recomputeMemberships(session, userId) {

  if (!userId) throw new Error("userId is undefined");

  const groups = await getCollectionFromDB("groups");
  const guildRoles = await fetchUserDiscordRoles(session);
  const guildRoleSets = Object.fromEntries(
    Object.entries(guildRoles).map(([server, roles]) => [
      server,
      new Set(roles)
    ])
  );

  for await (const group of groups?.find({}, { projection: { _id: 1, individual_members: 1, discord_roles: 1 } })) {
    let isMember = false;
    let sourceTemp = false;
    

    /* ----- individual members ----- */
    if (group.individual_members) {
      isMember = Object.values(group.individual_members).some(m => m.id === userId);
      if (isMember) {
        source = "individual";
      }
    }

    // ----- Discord roles -----
    if (!isMember && group.discord_roles && guildRoles) {
      for (const { server, role } of Object.values(group.discord_roles)) {
        const rolesInGuild = guildRoleSets[server]; 
        if (rolesInGuild?.has(role)) {
          isMember = true;
          source = { guildId: server, roleId: role }; 
          break; 
        }
      }
    }

    const membership: GroupMembership | null = isMember
      ? {
          groupId: group._id.toString(),
          userId,
          source: sourceTemp,
          verifiedAt: Date.now(),
          membershipStale: false,
        }
      : null;

    setUserMembershipForGroup(membership);
  }

}

export async function recomputeMembershipsForGroup(session, groupId: string) {
  const memberships = getDocumentFromDB("Memberships", { "groupId": groupId });
  if (!group) return;

  const affectedUsers = new Set<string>();

  for (const m of group.memberships ?? []) {
    if (typeof m.userId === "string" && m.userId.length > 0) {
      affectedUsers.add(m.userId);
    }
  }

  for (const userId of affectedUsers) {
    await recomputeMemberships(session, userId);
  }
}

/* ---------- discord ---------- */

async function fetchUserDiscordRoles(session) {

  const rolesByGuild: Record<string, string[]> = {};

  const groupsCollection = await getCollectionFromDB("groups");

  const allServers = await groupsCollection.aggregate([
    { $project: { discord_roles: 1 } }, // only get discord_roles
    { $project: { servers: { $objectToArray: "$discord_roles" } } },
    { $unwind: "$servers" }, // flatten each role
    { $group: { _id: null, allServers: { $addToSet: "$servers.v.server" } } }
  ]).toArray();

  const uniqueGuilds = allServers[0]?.allServers ?? [];

  for (const guildId of uniqueGuilds) {
    const info = await discord.getGuildInformation(session, guildId);
    if (info?.roles) {
      rolesByGuild[guildId] = info.roles;
    }
  }
 
  return rolesByGuild;
}
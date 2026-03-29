import discord from "../discord.js";
import {
  setUserMembershipForGroup,
} from "./saveGroups.ts";
import type { GroupMembership } from "../lib/Groups/types.ts";
import { randomUUID } from "node:crypto"
import config from "../config.js";
import { 
  getCollectionFromDB,
  getDocumentFromDB,
  addDocumentToDB,
  deleteDocumentFromDB,
} from "../fileHandler.ts";

/* ---------- recompute ---------- */

export async function recomputeMemberships(session, userId) {

  if (!userId) throw new Error("userId is undefined");

  const groups = await getCollectionFromDB("Groups");
  const memberships = await getCollectionFromDB("Memberships");
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
    
    let membershipOld = await memberships?.findOne({ groupId: group._id.toString(), _id: userId });
    
    /* ----- individual members ----- */
    if (group.individual_members) {
      isMember = Object.keys(group.individual_members).includes(userId);
      if (isMember) {
        sourceTemp = "individual";
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

    if (isMember && !membershipOld) {
      addDocumentToDB("Memberships", {
          _id: randomUUID(),
          userID: userId,
          groupId: group._id.toString(),
          groupName: group.name,
          source: sourceTemp,
        }
      )
    } else if (!isMember && membershipOld && membershipOld.source !== "creator") {
      deleteDocumentFromDB("Memberships", membershipOld);
    }
  }
}

export async function recomputeMembershipsForGroup(session, groupId: string) {
  const memberships = await getDocumentFromDB("Memberships", { "groupId": groupId });
  if (!memberships) return;

  const affectedUsers = new Set<string>();

  for (const m of memberships) {
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

  const groupsCollection = await getCollectionFromDB("Groups");

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
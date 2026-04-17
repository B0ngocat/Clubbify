import { PrismaClient, RSVPStatus, type Role } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_SLUG = process.env.DEFAULT_ORG_SLUG ?? "default";
const DOMAIN = "clubbify.test";

async function main() {
  console.log("Seeding Clubbify...");

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      slug: ORG_SLUG,
      name: "Clubbify Demo High School",
      emailDomainAllowlist: [DOMAIN],
      timezone: "America/Los_Angeles",
    },
  });

  const mkUser = async (
    email: string,
    name: string,
    roles: Role[],
    gradYear?: number,
  ) => {
    const user = await prisma.user.upsert({
      where: { orgId_email: { orgId: org.id, email } },
      update: { name },
      create: { orgId: org.id, email, name, gradYear },
    });
    for (const role of roles) {
      await prisma.membership.upsert({
        where: { userId_role: { userId: user.id, role } },
        create: { userId: user.id, role, orgId: org.id },
        update: {},
      });
    }
    return user;
  };

  const admin = await mkUser(`admin@${DOMAIN}`, "Ada Admin", ["ADMIN", "STUDENT"]);
  const advisor1 = await mkUser(`advisor1@${DOMAIN}`, "Arlo Advisor", ["ADVISOR"]);
  const advisor2 = await mkUser(`advisor2@${DOMAIN}`, "Anya Advisor", ["ADVISOR"]);

  const officerA = await mkUser(`chess.pres@${DOMAIN}`, "Caden Chess", ["STUDENT", "OFFICER"], 2026);
  const officerB = await mkUser(`robo.pres@${DOMAIN}`, "Rita Robotics", ["STUDENT", "OFFICER"], 2025);
  const officerC = await mkUser(`debate.pres@${DOMAIN}`, "Dana Debate", ["STUDENT", "OFFICER"], 2026);

  const students = [];
  for (let i = 1; i <= 30; i++) {
    const grad = 2025 + (i % 4);
    const s = await mkUser(
      `student${i}@${DOMAIN}`,
      `Student ${i}`,
      ["STUDENT"],
      grad,
    );
    students.push(s);
  }

  // Advisor assignments: split students between the two advisors
  for (let i = 0; i < students.length; i++) {
    const advisor = i % 2 === 0 ? advisor1 : advisor2;
    await prisma.advisorAssignment.upsert({
      where: {
        advisorUserId_studentUserId: {
          advisorUserId: advisor.id,
          studentUserId: students[i].id,
        },
      },
      create: {
        orgId: org.id,
        advisorUserId: advisor.id,
        studentUserId: students[i].id,
      },
      update: {},
    });
  }

  // Clubs
  const chess = await prisma.club.upsert({
    where: { orgId_slug: { orgId: org.id, slug: "chess-club" } },
    update: {},
    create: {
      orgId: org.id,
      slug: "chess-club",
      name: "Chess Club",
      description: "Weekly matches, ladder tournaments, and study sessions.",
      category: "Academic",
    },
  });
  const robotics = await prisma.club.upsert({
    where: { orgId_slug: { orgId: org.id, slug: "robotics" } },
    update: {},
    create: {
      orgId: org.id,
      slug: "robotics",
      name: "Robotics Team",
      description: "FIRST Robotics competition team. Design, build, drive.",
      category: "STEM",
    },
  });
  const debate = await prisma.club.upsert({
    where: { orgId_slug: { orgId: org.id, slug: "debate" } },
    update: {},
    create: {
      orgId: org.id,
      slug: "debate",
      name: "Debate",
      description: "Policy, LD, and public forum debate practice and tournaments.",
      category: "Humanities",
    },
  });
  const art = await prisma.club.upsert({
    where: { orgId_slug: { orgId: org.id, slug: "art-club" } },
    update: {},
    create: {
      orgId: org.id,
      slug: "art-club",
      name: "Art Club",
      description: "Open studio, group projects, portfolio reviews. (No points system.)",
      category: "Arts",
    },
  });

  // Officers of clubs
  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: chess.id, userId: officerA.id } },
    create: { orgId: org.id, clubId: chess.id, userId: officerA.id, isOfficer: true },
    update: { isOfficer: true },
  });
  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: robotics.id, userId: officerB.id } },
    create: { orgId: org.id, clubId: robotics.id, userId: officerB.id, isOfficer: true },
    update: { isOfficer: true },
  });
  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: debate.id, userId: officerC.id } },
    create: { orgId: org.id, clubId: debate.id, userId: officerC.id, isOfficer: true },
    update: { isOfficer: true },
  });

  // Point rules / thresholds (Art Club has none, validating "no points" UX)
  await prisma.clubPointRule.deleteMany({ where: { clubId: chess.id } });
  await prisma.clubPointRule.createMany({
    data: [
      { orgId: org.id, clubId: chess.id, source: "EVENT_ATTENDANCE", points: 10 },
      { orgId: org.id, clubId: chess.id, source: "EVENT_RSVP", points: 2 },
    ],
  });
  await prisma.clubPointThreshold.deleteMany({ where: { clubId: chess.id } });
  await prisma.clubPointThreshold.createMany({
    data: [
      { orgId: org.id, clubId: chess.id, label: "Active Member", points: 50, order: 1 },
      { orgId: org.id, clubId: chess.id, label: "Chess Master", points: 150, order: 2 },
    ],
  });

  await prisma.clubPointRule.deleteMany({ where: { clubId: robotics.id } });
  await prisma.clubPointRule.createMany({
    data: [
      { orgId: org.id, clubId: robotics.id, source: "EVENT_ATTENDANCE", points: 15 },
      { orgId: org.id, clubId: robotics.id, source: "EVENT_RSVP", points: 5 },
      { orgId: org.id, clubId: robotics.id, source: "OFFICER_ROLE", points: 25 },
    ],
  });
  await prisma.clubPointThreshold.deleteMany({ where: { clubId: robotics.id } });
  await prisma.clubPointThreshold.createMany({
    data: [
      { orgId: org.id, clubId: robotics.id, label: "Build Season Crew", points: 75, order: 1 },
      { orgId: org.id, clubId: robotics.id, label: "Letter", points: 200, order: 2 },
    ],
  });

  // Join some students to clubs
  const joinClub = async (clubId: string, userIds: string[]) => {
    for (const userId of userIds) {
      await prisma.clubMembership.upsert({
        where: { clubId_userId: { clubId, userId } },
        create: { orgId: org.id, clubId, userId },
        update: {},
      });
    }
  };
  await joinClub(chess.id, students.slice(0, 12).map((s) => s.id));
  await joinClub(robotics.id, students.slice(6, 20).map((s) => s.id));
  await joinClub(debate.id, students.slice(10, 22).map((s) => s.id));
  await joinClub(art.id, students.slice(0, 8).map((s) => s.id));

  // Events: 3 past, 3 upcoming per main club
  const now = new Date();
  const day = (n: number) =>
    new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const createEvents = async (clubId: string, titlePrefix: string) => {
    const events = [];
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const start = day(i * 3);
      start.setHours(17, 0, 0, 0);
      const end = new Date(start.getTime() + 90 * 60 * 1000);
      const evt = await prisma.event.create({
        data: {
          orgId: org.id,
          clubId,
          title: `${titlePrefix} ${i < 0 ? "Recap" : "Meetup"} ${Math.abs(i)}`,
          description: "Come hang out!",
          location: "Room 201",
          startsAt: start,
          endsAt: end,
        },
      });
      events.push(evt);
    }
    return events;
  };

  const chessEvents = await createEvents(chess.id, "Chess");
  const roboEvents = await createEvents(robotics.id, "Robotics");
  const debateEvents = await createEvents(debate.id, "Debate");

  // RSVPs: about 60% of members RSVP to upcoming events
  const addRSVPs = async (eventId: string, userIds: string[]) => {
    for (const userId of userIds) {
      if (Math.random() > 0.4) {
        await prisma.eventRSVP.upsert({
          where: { eventId_userId: { eventId, userId } },
          create: {
            orgId: org.id,
            eventId,
            userId,
            status: RSVPStatus.GOING,
          },
          update: {},
        });
      }
    }
  };
  for (const e of [...chessEvents, ...roboEvents, ...debateEvents]) {
    if (e.startsAt > now) {
      const members = await prisma.clubMembership.findMany({
        where: { clubId: e.clubId },
        select: { userId: true },
      });
      await addRSVPs(
        e.id,
        members.map((m) => m.userId),
      );
    }
  }

  // Historical attendance on past events: students get an attendance-probability
  // shaped by their index so the engagement distribution includes healthy, watch,
  // and at-risk bands.
  const shape = (i: number): number => {
    if (i < 5) return 0.1; // low-engagement cohort -> likely AT_RISK
    if (i < 15) return 0.45; // WATCH-ish
    return 0.85; // HEALTHY
  };
  const pastEvents = [...chessEvents, ...roboEvents, ...debateEvents].filter(
    (e) => e.startsAt < now,
  );
  for (const e of pastEvents) {
    const members = await prisma.clubMembership.findMany({
      where: { clubId: e.clubId },
      select: { userId: true },
    });
    for (const m of members) {
      const studentIdx = students.findIndex((s) => s.id === m.userId);
      const prob = studentIdx >= 0 ? shape(studentIdx) : 0.5;
      if (Math.random() < prob) {
        const officer = [officerA, officerB, officerC].find(() => true)!;
        await prisma.eventAttendance.upsert({
          where: { eventId_userId: { eventId: e.id, userId: m.userId } },
          create: {
            orgId: org.id,
            eventId: e.id,
            userId: m.userId,
            attended: true,
            markedByUserId: officer.id,
            checkedInAt: e.startsAt,
          },
          update: {},
        });
        // Record a MANUAL-independent award matching the attendance rule.
        const rule = await prisma.clubPointRule.findFirst({
          where: { clubId: e.clubId, source: "EVENT_ATTENDANCE" },
        });
        if (rule) {
          await prisma.clubPointAward
            .create({
              data: {
                orgId: org.id,
                clubId: e.clubId,
                userId: m.userId,
                source: "EVENT_ATTENDANCE",
                sourceId: e.id,
                points: rule.points,
              },
            })
            .catch(() => undefined); // ignore duplicates
        }
      }
    }
  }

  // Pre-existing interventions so the advisor log isn't empty on first load.
  const interventionTargets = [students[0], students[2], students[4]];
  for (let i = 0; i < interventionTargets.length; i++) {
    const target = interventionTargets[i];
    const advisor = i % 2 === 0 ? advisor1 : advisor2;
    await prisma.intervention.create({
      data: {
        orgId: org.id,
        advisorUserId: advisor.id,
        studentUserId: target.id,
        type: ["CHECK_IN", "EMAIL", "MEETING"][i] as "CHECK_IN" | "EMAIL" | "MEETING",
        note: `Initial outreach — low engagement observed during opening weeks.`,
        occurredAt: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Backfill engagement scores so the advisor dashboard shows meaningful data.
  const { recomputeEngagementForUser } = await import("../lib/engagement/recompute");
  for (const s of students) {
    await recomputeEngagementForUser(s.id);
  }

  console.log("Seed complete.");
  console.log(`  Org: ${org.name} (slug: ${org.slug})`);
  console.log(`  Users: 1 admin, 2 advisors, 3 officers, 30 students`);
  console.log(`  Clubs: Chess, Robotics, Debate, Art (no points)`);
  console.log(`  Events: ~18 across past/future`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

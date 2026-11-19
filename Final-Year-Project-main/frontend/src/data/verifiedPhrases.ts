export interface VerifiedExample {
  id: string;
  text: string;
  category: string;
  expectedGlosses: string[];
}

/**
 * Curated list of 30 approved example phrases.
 * Every word in each phrase comes exclusively from the approved vocabulary:
 * BAD, BATHROOM, BOOK, BUY, CAR, COME, DESK, DOCTOR, DRINK, FAMILY, FIND,
 * FOOD, FRIEND, GO, GOOD, HAPPY, HAVE, HELLO, HELP, HOSPITAL, HOUSE, HOW,
 * LEARN, LIKE, LOVE, MEET, MY, NAME, NEED, NO, NOW, PLAY, PLEASE, SCHOOL,
 * SEE, SORRY, STOP, STUDENT, TEACHER, THANK YOU, TODAY, TOMORROW, UNDERSTAND,
 * WANT, WATER, WHAT, WHERE, WHO, WHY, WORK, WRITE, YES, YESTERDAY, YOU, YOUR.
 */
export const VERIFIED_EXAMPLES: VerifiedExample[] = [
  { id: "ex-1", text: "HELLO, WHAT YOUR NAME?", category: "Greetings", expectedGlosses: ["HELLO", "YOUR", "NAME", "WHAT"] },
  { id: "ex-2", text: "MY NAME.", category: "Identity", expectedGlosses: ["MY", "NAME"] },
  { id: "ex-3", text: "HOW YOU TODAY?", category: "Greetings", expectedGlosses: ["TODAY", "YOU", "HOW"] },
  { id: "ex-4", text: "HAPPY TODAY.", category: "Expressions", expectedGlosses: ["TODAY", "HAPPY"] },
  { id: "ex-5", text: "YOU MY FRIEND.", category: "Social", expectedGlosses: ["YOU", "MY", "FRIEND"] },
  { id: "ex-6", text: "MY FAMILY GOOD.", category: "Social", expectedGlosses: ["MY", "FAMILY", "GOOD"] },
  { id: "ex-7", text: "LOVE MY FAMILY.", category: "Social", expectedGlosses: ["LOVE", "MY", "FAMILY"] },
  { id: "ex-8", text: "LIKE BOOK.", category: "Interests", expectedGlosses: ["LIKE", "BOOK"] },
  { id: "ex-9", text: "WANT BUY BOOK.", category: "Commerce", expectedGlosses: ["WANT", "BUY", "BOOK"] },
  { id: "ex-10", text: "WHERE BATHROOM?", category: "Basic Needs", expectedGlosses: ["BATHROOM", "WHERE"] },
  { id: "ex-11", text: "NEED WATER NOW.", category: "Basic Needs", expectedGlosses: ["NOW", "NEED", "WATER"] },
  { id: "ex-12", text: "PLEASE HELP.", category: "Assistance", expectedGlosses: ["PLEASE", "HELP"] },
  { id: "ex-13", text: "WANT FOOD.", category: "Sustenance", expectedGlosses: ["WANT", "FOOD"] },
  { id: "ex-14", text: "FOOD GOOD.", category: "Sustenance", expectedGlosses: ["FOOD", "GOOD"] },
  { id: "ex-15", text: "HAVE CAR.", category: "Transportation", expectedGlosses: ["HAVE", "CAR"] },
  { id: "ex-16", text: "COME MY HOUSE.", category: "Social", expectedGlosses: ["COME", "MY", "HOUSE"] },
  { id: "ex-17", text: "WANT GO.", category: "Travel", expectedGlosses: ["WANT", "GO"] },
  { id: "ex-18", text: "GO SCHOOL TODAY.", category: "Education", expectedGlosses: ["TODAY", "GO", "SCHOOL"] },
  { id: "ex-19", text: "MY STUDENT.", category: "Education", expectedGlosses: ["MY", "STUDENT"] },
  { id: "ex-20", text: "MY TEACHER GOOD.", category: "Education", expectedGlosses: ["MY", "TEACHER", "GOOD"] },
  { id: "ex-21", text: "WANT LEARN.", category: "Education", expectedGlosses: ["WANT", "LEARN"] },
  { id: "ex-22", text: "NEED HELP.", category: "Assistance", expectedGlosses: ["NEED", "HELP"] },
  { id: "ex-23", text: "WHERE HOSPITAL?", category: "Emergency", expectedGlosses: ["HOSPITAL", "WHERE"] },
  { id: "ex-24", text: "NEED DOCTOR.", category: "Emergency", expectedGlosses: ["NEED", "DOCTOR"] },
  { id: "ex-25", text: "SORRY.", category: "Courtesy", expectedGlosses: ["SORRY"] },
  { id: "ex-26", text: "PLEASE STOP NOW.", category: "Requests", expectedGlosses: ["NOW", "PLEASE", "STOP"] },
  { id: "ex-27", text: "UNDERSTAND YOU.", category: "Communication", expectedGlosses: ["UNDERSTAND", "YOU"] },
  { id: "ex-28", text: "NO UNDERSTAND.", category: "Communication", expectedGlosses: ["UNDERSTAND", "NO"] },
  { id: "ex-29", text: "THANK YOU HELP.", category: "Courtesy", expectedGlosses: ["THANK-YOU", "YOU", "HELP"] },
  { id: "ex-30", text: "SEE YOU TOMORROW.", category: "Farewells", expectedGlosses: ["TOMORROW", "SEE", "YOU"] }
];

export const VERIFIED_EXAMPLE_TEXTS = VERIFIED_EXAMPLES.map(e => e.text);
